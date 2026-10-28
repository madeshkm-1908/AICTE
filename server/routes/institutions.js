const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { computeFuzzySimilarity, normalizeInstitutionName, levenshteinDistance } = require('../services/overlapDetector');
const { optionalAuth, getUserRegion } = require('./auth');

// Block Complainants from accessing official internal institutions directory
router.use(optionalAuth, (req, res, next) => {
  if (req.user && req.user.role === 'Complainant') {
    return res.status(403).json({ error: 'Access Denied: Complainant accounts are restricted from accessing official institutional intelligence profiles.' });
  }
  next();
});

// GET /api/institutions - Directory of institutions with computed case metrics & fuzzy search
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { region, state, type, search } = req.query;
    const userRegion = getUserRegion(req.user);

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (userRegion) {
      whereClause += ' AND i.region = ?';
      params.push(userRegion);
    } else if (region && region !== 'ALL') {
      whereClause += ' AND i.region = ?';
      params.push(region);
    }

    if (state && state !== 'ALL') {
      whereClause += ' AND i.state = ?';
      params.push(state);
    }

    if (type && type !== 'ALL') {
      whereClause += ' AND i.type = ?';
      params.push(type);
    }

    const sql = `
      SELECT 
        i.aicte_permanent_id,
        i.name,
        i.address,
        i.state,
        i.region,
        i.type,
        i.contact_email,
        COUNT(c.case_id) as total_cases,
        SUM(CASE WHEN c.status != 'Disposed' THEN 1 ELSE 0 END) as active_cases,
        SUM(CASE WHEN c.status = 'Disposed' THEN 1 ELSE 0 END) as disposed_cases,
        SUM(CASE WHEN c.bureau = 'Regulation Bureau' AND c.status != 'Disposed' THEN 1 ELSE 0 END) as rb_active,
        SUM(CASE WHEN c.bureau = 'PGRC' AND c.status != 'Disposed' THEN 1 ELSE 0 END) as pgrc_active,
        SUM(CASE WHEN c.expected_disposal_date < date('now') AND c.status != 'Disposed' THEN 1 ELSE 0 END) as overdue_cases
      FROM institutions i
      LEFT JOIN cases c ON i.aicte_permanent_id = c.aicte_permanent_id
      ${whereClause}
      GROUP BY i.aicte_permanent_id, i.name, i.address, i.state, i.region, i.type, i.contact_email
      ORDER BY active_cases DESC, i.name ASC
    `;

    let institutions = await db.prepare(sql).all(...params);

    // Apply intelligent fuzzy search if search query is provided
    if (search && search.trim() !== '') {
      const qRaw = search.trim();
      const qLower = qRaw.toLowerCase();
      const qNorm = normalizeInstitutionName(qRaw);
      const qTokens = qNorm.split(/\s+/).filter(t => t.length > 2);

      const scored = [];

      for (const inst of institutions) {
        let score = 0;
        const nameLower = (inst.name || '').toLowerCase();
        const idStr = inst.aicte_permanent_id || '';
        const stateLower = (inst.state || '').toLowerCase();
        const normInstName = normalizeInstitutionName(inst.name);
        const instTokens = normInstName.split(/\s+/).filter(Boolean);

        // 1. Exact substring matches
        if (idStr.includes(qRaw)) {
          score = 100;
        } else if (nameLower.includes(qLower)) {
          score = 90;
        } else if (stateLower.includes(qLower)) {
          score = 70;
        } else {
          // 2. Token-level fuzzy match with Levenshtein distance
          let tokenMatches = 0;
          for (const qTok of qTokens) {
            let bestTokMatch = false;
            for (const iTok of instTokens) {
              if (qTok === iTok) {
                bestTokMatch = true;
                tokenMatches += 1.0;
                break;
              }
              const dist = levenshteinDistance(qTok, iTok);
              const maxAllowedDist = qTok.length > 6 ? 2 : 1;
              if (dist <= maxAllowedDist) {
                bestTokMatch = true;
                tokenMatches += (1.0 - (dist / Math.max(qTok.length, iTok.length)));
                break;
              }
            }
          }

          if (qTokens.length > 0 && tokenMatches > 0) {
            const tokenScore = (tokenMatches / qTokens.length) * 80;
            score = Math.max(score, tokenScore);
          }

          // 3. Overall whole-name fuzzy similarity
          const sim = computeFuzzySimilarity(qRaw, inst.name);
          if (sim > 0.35) {
            score = Math.max(score, sim * 75);
          }
        }

        if (score >= 40) {
          scored.push({ inst, score });
        }
      }

      // Sort by best score descending
      scored.sort((a, b) => b.score - a.score);
      institutions = scored.map(s => s.inst);
    }

    res.json({ institutions });
  } catch (err) {
    console.error('Error fetching institutions:', err);
    res.status(500).json({ error: 'Failed to retrieve institutions' });
  }
});

// GET /api/institutions/:id - Single institution with full case docket, summary metrics & unified timeline
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const institution = await db.prepare(`
      SELECT * FROM institutions WHERE aicte_permanent_id = ?
    `).get(req.params.id);

    if (!institution) {
      return res.status(404).json({ error: 'Institution record not found' });
    }

    const userRegion = getUserRegion(req.user);
    if (userRegion && institution.region !== userRegion) {
      return res.status(403).json({ 
        error: `Access Denied: Institution is located in ${institution.region} region. Your credentials permit jurisdiction only in ${userRegion} region.` 
      });
    }

    const cases = await db.prepare(`
      SELECT 
        c.*,
        CASE WHEN c.expected_disposal_date < date('now') AND c.status != 'Disposed' THEN 1 ELSE 0 END as is_overdue
      FROM cases c
      WHERE c.aicte_permanent_id = ?
      ORDER BY c.received_date DESC
    `).all(req.params.id);

    // Consolidated Action History Timeline across all cases for this institution
    const timeline = await db.prepare(`
      SELECT 
        ca.id,
        ca.case_id,
        ca.action,
        ca.by_officer,
        ca.bureau,
        ca.timestamp,
        ca.remarks,
        c.category,
        c.status as current_case_status
      FROM case_actions ca
      JOIN cases c ON ca.case_id = c.case_id
      WHERE c.aicte_permanent_id = ?
      ORDER BY ca.timestamp DESC
    `).all(req.params.id);

    // Summary statistics
    const totalCases = cases.length;
    const activeCases = cases.filter(c => c.status !== 'Disposed').length;
    const disposedCases = cases.filter(c => c.status === 'Disposed').length;
    const overdueCases = cases.filter(c => c.is_overdue === 1).length;
    const rbActive = cases.filter(c => c.bureau === 'Regulation Bureau' && c.status !== 'Disposed').length;
    const pgrcActive = cases.filter(c => c.bureau === 'PGRC' && c.status !== 'Disposed').length;

    // Overlap status
    const overlapResolution = await db.prepare(`
      SELECT * FROM overlap_resolutions WHERE institution_key = ?
    `).get(req.params.id);

    res.json({
      institution,
      summary: {
        total_cases: totalCases,
        active_cases: activeCases,
        disposed_cases: disposedCases,
        overdue_cases: overdueCases,
        rb_active: rbActive,
        pgrc_active: pgrcActive,
        is_overlapping: rbActive > 0 && pgrcActive > 0,
        overlap_resolution: overlapResolution ? overlapResolution.status : (rbActive > 0 && pgrcActive > 0 ? 'PENDING' : null)
      },
      cases,
      timeline
    });
  } catch (err) {
    console.error('Error fetching institution details:', err);
    res.status(500).json({ error: 'Failed to retrieve institution profile' });
  }
});

module.exports = router;
