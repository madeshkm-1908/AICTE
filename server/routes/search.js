const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { optionalAuth, getUserRegion } = require('./auth');
const { normalizeInstitutionName, levenshteinDistance } = require('../services/overlapDetector');

// Block Complainants from accessing official global search
router.use(optionalAuth, (req, res, next) => {
  if (req.user && req.user.role === 'Complainant') {
    return res.status(403).json({ error: 'Access Denied: Complainant accounts are restricted from searching official internal dockets.' });
  }
  next();
});

// GET /api/search?q=... - Quick global instant suggestions
router.get('/', optionalAuth, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) {
      return res.json({ query: q, cases: [], institutions: [] });
    }

    const userRegion = getUserRegion(req.user);
    const likeQuery = `%${q}%`;

    // 1. Search Cases (by case_id, aicte_permanent_id, category, description)
    let caseSql = `
      SELECT 
        c.case_id,
        c.category,
        c.status,
        c.bureau,
        c.priority,
        c.expected_disposal_date,
        i.name as institution_name,
        i.aicte_permanent_id,
        i.state as institution_state
      FROM cases c
      JOIN institutions i ON c.aicte_permanent_id = i.aicte_permanent_id
      WHERE (c.case_id LIKE ? OR c.aicte_permanent_id LIKE ? OR c.category LIKE ? OR i.name LIKE ?)
    `;
    const caseParams = [likeQuery, likeQuery, likeQuery, likeQuery];

    if (userRegion) {
      caseSql += ' AND i.region = ?';
      caseParams.push(userRegion);
    }
    caseSql += ' ORDER BY c.received_date DESC LIMIT 5';
    const cases = await db.prepare(caseSql).all(...caseParams);

    // 2. Search Institutions (by permanent ID, name, state)
    let instSql = `
      SELECT 
        i.aicte_permanent_id,
        i.name,
        i.state,
        i.region,
        i.type,
        COUNT(c.case_id) as total_cases,
        SUM(CASE WHEN c.status != 'Disposed' THEN 1 ELSE 0 END) as active_cases
      FROM institutions i
      LEFT JOIN cases c ON i.aicte_permanent_id = c.aicte_permanent_id
      WHERE 1=1
    `;
    const instParams = [];

    if (userRegion) {
      instSql += ' AND i.region = ?';
      instParams.push(userRegion);
    }

    instSql += ' GROUP BY i.aicte_permanent_id, i.name, i.state, i.region, i.type';
    let allInstitutions = await db.prepare(instSql).all(...instParams);

    // Score institutions for direct match & fuzzy match
    const qLower = q.toLowerCase();
    const qNorm = normalizeInstitutionName(q);
    const qTokens = qNorm.split(/\s+/).filter(t => t.length > 2);

    const scored = [];
    for (const inst of allInstitutions) {
      let score = 0;
      const idMatch = inst.aicte_permanent_id.toLowerCase().includes(qLower);
      const nameMatch = inst.name.toLowerCase().includes(qLower);
      const stateMatch = inst.state.toLowerCase().includes(qLower);

      if (idMatch) score = 100;
      else if (nameMatch) score = 90;
      else if (stateMatch) score = 70;
      else {
        // Fuzzy token match
        const normInst = normalizeInstitutionName(inst.name);
        const iTokens = normInst.split(/\s+/).filter(Boolean);
        for (const qt of qTokens) {
          for (const it of iTokens) {
            if (qt === it) { score = Math.max(score, 80); break; }
            const dist = levenshteinDistance(qt, it);
            if (dist <= 1 && qt.length > 3) { score = Math.max(score, 65); break; }
          }
        }
      }

      if (score >= 60) {
        scored.push({ inst, score });
      }
    }

    scored.sort((a, b) => b.score - a.score);
    const institutions = scored.slice(0, 5).map(s => s.inst);

    res.json({
      query: q,
      cases,
      institutions,
      total_found: cases.length + institutions.length
    });
  } catch (err) {
    console.error('Error during global search:', err);
    res.status(500).json({ error: 'Failed to execute global search' });
  }
});

module.exports = router;
