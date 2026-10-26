const db = require('../db/database');

function normalizeInstitutionName(name) {
  if (!name) return '';
  let s = name.toLowerCase();
  // Strip punctuation and special chars
  s = s.replace(/[^a-z0-9\s]/g, ' ');
  
  // Expand common academic & college abbreviations typical in filings
  const abbrevs = {
    'inst': 'institute',
    'instt': 'institute',
    'institution': 'institute',
    'engg': 'engineering',
    'eng': 'engineering',
    'tech': 'technology',
    'technol': 'technology',
    'sci': 'science',
    'sciences': 'science',
    'mgmt': 'management',
    'mgt': 'management',
    'poly': 'polytechnic',
    'polytechnic': 'polytechnic',
    'govt': 'government',
    'gov': 'government',
    'col': 'college',
    'coll': 'college',
    'acad': 'academy',
    'univ': 'university',
    'dept': 'department',
    'trg': 'training',
    'res': 'research',
    'stud': 'studies',
    'app': 'applied'
  };

  const tokens = s.split(/\s+/).filter(Boolean).map(t => abbrevs[t] || t);
  return tokens.join(' ');
}

function levenshteinDistance(s1, s2) {
  const m = s1.length;
  const n = s2.length;
  const d = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + cost
      );
    }
  }
  return d[m][n];
}

function computeFuzzySimilarity(nameA, nameB) {
  const normA = normalizeInstitutionName(nameA);
  const normB = normalizeInstitutionName(nameB);
  if (!normA || !normB) return 0;
  if (normA === normB) return 1.0;

  // 1. Token Jaccard Similarity
  const tokensA = new Set(normA.split(' '));
  const tokensB = new Set(normB.split(' '));
  const intersection = new Set([...tokensA].filter(x => tokensB.has(x)));
  const union = new Set([...tokensA, ...tokensB]);
  const jaccard = union.size === 0 ? 0 : (intersection.size / union.size);

  // 2. Levenshtein ratio
  const maxLen = Math.max(normA.length, normB.length);
  const levDist = levenshteinDistance(normA, normB);
  const levRatio = maxLen === 0 ? 1 : Math.max(0, 1 - (levDist / maxLen));

  // Combined similarity
  return (0.6 * jaccard) + (0.4 * levRatio);
}

/**
 * Detect all overlapping institutions with open cases across bureaus.
 * Flags:
 * 1. Exact AICTE ID matches across 2+ bureaus (Confidence: 100%)
 * 2. Fuzzy name matches across different IDs in same state/region (Confidence: 75-99%)
 */
async function detectOverlaps(options = {}) {
  const { region, statusFilter } = options;

  let regionSql = '';
  const params = [];
  if (region && region !== 'ALL') {
    regionSql = ' AND i.region = ? ';
    params.push(region);
  }

  // 1. Query all institutions with open cases
  const instSql = `
    SELECT 
      i.aicte_permanent_id,
      i.name as institution_name,
      i.address,
      i.state,
      i.region,
      i.type,
      COUNT(DISTINCT c.case_id) as total_open_cases,
      COUNT(DISTINCT c.bureau) as bureau_count,
      SUM(CASE WHEN c.bureau = 'Regulation Bureau' THEN 1 ELSE 0 END) as rb_open_count,
      SUM(CASE WHEN c.bureau = 'PGRC' THEN 1 ELSE 0 END) as pgrc_open_count,
      SUM(CASE WHEN c.bureau NOT IN ('Regulation Bureau', 'PGRC') THEN 1 ELSE 0 END) as other_open_count,
      MAX(CASE WHEN c.priority = 'Urgent' THEN 1 ELSE 0 END) as has_urgent,
      r.status as resolution_status,
      r.remarks as resolution_remarks,
      r.resolved_by as resolution_by,
      r.resolved_at as resolution_at
    FROM institutions i
    JOIN cases c ON i.aicte_permanent_id = c.aicte_permanent_id
    LEFT JOIN overlap_resolutions r ON i.aicte_permanent_id = r.institution_key
    WHERE c.status != 'Disposed' ${regionSql}
    GROUP BY i.aicte_permanent_id, i.name, i.address, i.state, i.region, i.type, r.status, r.remarks, r.resolved_by, r.resolved_at
    HAVING COUNT(DISTINCT c.bureau) >= 2
    ORDER BY (SUM(CASE WHEN c.bureau = 'Regulation Bureau' THEN 1 ELSE 0 END) + SUM(CASE WHEN c.bureau = 'PGRC' THEN 1 ELSE 0 END)) DESC, i.name ASC
  `;

  const exactOverlaps = await db.prepare(instSql).all(...params);

  // Map and populate cases for each institution
  const exactResults = await Promise.all(exactOverlaps.map(async inst => {
    const activeCases = await db.prepare(`
      SELECT 
        c.case_id,
        c.category,
        c.bureau,
        c.status,
        c.received_date,
        c.assigned_officer,
        c.priority,
        c.expected_disposal_date,
        c.last_action,
        c.next_action,
        CASE WHEN c.expected_disposal_date < date('now') THEN 1 ELSE 0 END as is_overdue
      FROM cases c
      WHERE c.aicte_permanent_id = ? AND c.status != 'Disposed'
      ORDER BY c.bureau ASC, c.received_date ASC
    `).all(inst.aicte_permanent_id);

    const rbCases = activeCases.filter(c => c.bureau === 'Regulation Bureau');
    const pgrcCases = activeCases.filter(c => c.bureau === 'PGRC');

    // Check if formally linked in case_links
    let isFormallyLinked = false;
    if (rbCases.length > 0 && pgrcCases.length > 0) {
      const linkCheck = await db.prepare(`
        SELECT COUNT(*) as count FROM case_links
        WHERE (case_id_1 = ? AND case_id_2 = ?) OR (case_id_1 = ? AND case_id_2 = ?)
      `).get(rbCases[0].case_id, pgrcCases[0].case_id, pgrcCases[0].case_id, rbCases[0].case_id);
      isFormallyLinked = linkCheck && parseInt(linkCheck.count) > 0;
    }

    return {
      institution_key: inst.aicte_permanent_id,
      aicte_permanent_id: inst.aicte_permanent_id,
      institution_name: inst.institution_name,
      address: inst.address,
      state: inst.state,
      region: inst.region,
      type: inst.type,
      total_open_cases: inst.total_open_cases,
      rb_open_count: inst.rb_open_count,
      pgrc_open_count: inst.pgrc_open_count,
      other_open_count: inst.other_open_count,
      has_urgent: inst.has_urgent === 1 || inst.has_urgent === '1',
      match_type: 'EXACT_PERMANENT_ID',
      confidence_score: 1.0,
      confidence_label: '100% (Exact Permanent ID Match)',
      is_formally_linked: isFormallyLinked,
      resolution_status: inst.resolution_status || (isFormallyLinked ? 'COORDINATED' : 'PENDING'),
      resolution_remarks: inst.resolution_remarks,
      resolution_by: inst.resolution_by,
      resolution_at: inst.resolution_at,
      rb_cases: rbCases,
      pgrc_cases: pgrcCases,
      all_cases: activeCases
    };
  }));

  // 2. Fuzzy Name Overlap Scan (Find institutions with different IDs that might be identical colleges)
  const allInstitutionsWithOpenCases = await db.prepare(`
    SELECT DISTINCT i.aicte_permanent_id, i.name, i.state, i.region, i.type, c.bureau
    FROM institutions i
    JOIN cases c ON i.aicte_permanent_id = c.aicte_permanent_id
    WHERE c.status != 'Disposed'
  `).all();

  const fuzzyPairs = [];
  const processedKeys = new Set();

  for (let i = 0; i < allInstitutionsWithOpenCases.length; i++) {
    for (let j = i + 1; j < allInstitutionsWithOpenCases.length; j++) {
      const a = allInstitutionsWithOpenCases[i];
      const b = allInstitutionsWithOpenCases[j];

      // Different ID but same state / region
      if (a.aicte_permanent_id !== b.aicte_permanent_id && (a.state === b.state || a.region === b.region)) {
        const pairKey = [a.aicte_permanent_id, b.aicte_permanent_id].sort().join('::');
        if (processedKeys.has(pairKey)) continue;

        const sim = computeFuzzySimilarity(a.name, b.name);
        if (sim >= 0.72) {
          processedKeys.add(pairKey);

          // Check if they have open cases in different bureaus
          const casesA = await db.prepare(`SELECT * FROM cases WHERE aicte_permanent_id = ? AND status != 'Disposed'`).all(a.aicte_permanent_id);
          const casesB = await db.prepare(`SELECT * FROM cases WHERE aicte_permanent_id = ? AND status != 'Disposed'`).all(b.aicte_permanent_id);

          const bureausA = new Set(casesA.map(c => c.bureau));
          const bureausB = new Set(casesB.map(c => c.bureau));
          const combinedBureaus = new Set([...bureausA, ...bureausB]);

          if (combinedBureaus.size >= 2) {
            const resolution = await db.prepare(`SELECT * FROM overlap_resolutions WHERE institution_key = ?`).get(pairKey);

            fuzzyPairs.push({
              institution_key: pairKey,
              aicte_permanent_id: `${a.aicte_permanent_id} / ${b.aicte_permanent_id}`,
              institution_name: `${a.name} ≈ ${b.name}`,
              state: a.state,
              region: a.region,
              type: a.type,
              total_open_cases: casesA.length + casesB.length,
              rb_open_count: [...casesA, ...casesB].filter(c => c.bureau === 'Regulation Bureau').length,
              pgrc_open_count: [...casesA, ...casesB].filter(c => c.bureau === 'PGRC').length,
              other_open_count: [...casesA, ...casesB].filter(c => !['Regulation Bureau', 'PGRC'].includes(c.bureau)).length,
              has_urgent: [...casesA, ...casesB].some(c => c.priority === 'Urgent'),
              match_type: 'FUZZY_NAME_MATCH',
              confidence_score: Math.round(sim * 100) / 100,
              confidence_label: `${Math.round(sim * 100)}% (Fuzzy Name Match)`,
              is_formally_linked: false,
              resolution_status: resolution ? resolution.status : 'PENDING',
              resolution_remarks: resolution ? resolution.remarks : null,
              resolution_by: resolution ? resolution.resolved_by : null,
              resolution_at: resolution ? resolution.resolved_at : null,
              rb_cases: [...casesA, ...casesB].filter(c => c.bureau === 'Regulation Bureau'),
              pgrc_cases: [...casesA, ...casesB].filter(c => c.bureau === 'PGRC'),
              all_cases: [...casesA, ...casesB]
            });
          }
        }
      }
    }
  }

  // Combine exact and fuzzy matches
  let allOverlaps = [...exactResults, ...fuzzyPairs];

  // Optional status filter
  if (statusFilter && statusFilter !== 'ALL') {
    allOverlaps = allOverlaps.filter(o => o.resolution_status === statusFilter);
  }

  return allOverlaps;
}

/**
 * Re-run detection and generate/update alerts in the database
 */
async function syncOverlapAlerts() {
  const overlaps = await detectOverlaps();
  const alertCheckStmt = db.prepare(`SELECT id, is_resolved FROM alerts WHERE alert_type = 'Cross-Bureau Overlap' AND aicte_permanent_id = ?`);
  const insertAlertStmt = db.prepare(`
    INSERT INTO alerts (alert_type, title, description, severity, aicte_permanent_id, case_id, created_at, is_resolved)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'), 0)
  `);

  let newAlertsCount = 0;

  for (const item of overlaps) {
    if (item.resolution_status === 'DISMISSED') continue;

    const existingAlert = await alertCheckStmt.get(item.aicte_permanent_id);
    if (!existingAlert) {
      const caseIdRef = item.all_cases && item.all_cases.length > 0 ? item.all_cases[0].case_id : null;
      await insertAlertStmt.run(
        'Cross-Bureau Overlap',
        `Coordination Required: ${item.institution_name.slice(0, 50)}`,
        `Institution has ${item.total_open_cases} open cases across ${item.rb_open_count} RB and ${item.pgrc_open_count} PGRC channels. (${item.confidence_label})`,
        item.has_urgent ? 'Critical' : 'Warning',
        item.aicte_permanent_id,
        caseIdRef
      );
      newAlertsCount++;
    }
  }

  return { totalOverlaps: overlaps.length, newAlertsCount };
}

module.exports = {
  normalizeInstitutionName,
  levenshteinDistance,
  computeFuzzySimilarity,
  detectOverlaps,
  syncOverlapAlerts
};
