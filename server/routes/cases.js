const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { broadcastEvent } = require('../events');
const { syncOverlapAlerts } = require('../services/overlapDetector');
const { authenticateToken, optionalAuth, getUserRegion } = require('./auth');

// Role-based permission checker for case actions
async function checkCaseActionPermission(user, currentCase) {
  if (!user) return { allowed: true }; // allow if called without auth token
  if (user.role === 'Senior Management') return { allowed: true };

  if (user.role === 'Regional Office') {
    const userRegion = getUserRegion(user);
    const inst = await db.prepare('SELECT region FROM institutions WHERE aicte_permanent_id = ?').get(currentCase.aicte_permanent_id);
    if (inst && userRegion && inst.region !== userRegion) {
      return { 
        allowed: false, 
        error: `Permission Denied: Regional Office (${userRegion}) cannot take action on institutions located in ${inst.region} region.` 
      };
    }
    return { allowed: true };
  }

  // Bureau users: can act ONLY on their own bureau's cases
  const userBureau = (user.bureau || '').toLowerCase();
  const caseBureau = (currentCase.bureau || '').toLowerCase();

  const isMatch = userBureau === caseBureau ||
    (userBureau.includes('pgrc') && caseBureau.includes('pgrc')) ||
    (userBureau.includes('regulation') && caseBureau.includes('regulation')) ||
    (userBureau.includes('approval') && caseBureau.includes('approval'));

  if (!isMatch) {
    return {
      allowed: false,
      error: `Permission Denied: Officers in ${user.bureau} cannot modify cases assigned to ${currentCase.bureau}. Bureau users may only act on their own bureau's dockets.`
    };
  }

  return { allowed: true };
}

// Block Complainants from accessing official case APIs
router.use(optionalAuth, (req, res, next) => {
  if (req.user && req.user.role === 'Complainant') {
    return res.status(403).json({ error: 'Access Denied: Complainant accounts are restricted from accessing official case registries.' });
  }
  next();
});

// Helper to check if a filter value is an "ALL" wildcard or empty
function isAllFilter(val) {
  if (val === undefined || val === null) return true;
  const s = String(val).trim().toUpperCase();
  return s === '' || s === 'ALL';
}

// GET /api/cases - List with server-side pagination, search & multi-dimensional filters
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      bureau,
      status,
      region,
      category,
      priority,
      overdue,
      date_from,
      date_to,
      search,
      page = 1,
      limit = 20,
      sortBy = 'received_date',
      sortOrder = 'DESC'
    } = req.query;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (!isAllFilter(bureau)) {
      whereClause += ' AND c.bureau = ?';
      params.push(String(bureau).trim());
    }

    if (!isAllFilter(status)) {
      whereClause += ' AND c.status = ?';
      params.push(String(status).trim());
    }

    const userRegion = getUserRegion(req.user);
    if (userRegion) {
      whereClause += ' AND i.region = ?';
      params.push(userRegion);
    } else if (!isAllFilter(region)) {
      whereClause += ' AND i.region = ?';
      params.push(String(region).trim());
    }

    if (!isAllFilter(category)) {
      whereClause += ' AND c.category = ?';
      params.push(String(category).trim());
    }

    if (!isAllFilter(priority)) {
      whereClause += ' AND c.priority = ?';
      params.push(String(priority).trim());
    }

    // SLA Overdue handling (supports 'true', true, '1', 1)
    if (String(overdue).toLowerCase() === 'true' || overdue === '1' || overdue === 1) {
      whereClause += ` AND c.expected_disposal_date < date('now') AND c.status != 'Disposed'`;
    }

    if (date_from && String(date_from).trim() !== '') {
      whereClause += ` AND c.received_date >= ?`;
      params.push(String(date_from).trim());
    }

    if (date_to && String(date_to).trim() !== '') {
      whereClause += ` AND c.received_date <= ?`;
      params.push(String(date_to).trim());
    }

    if (search && String(search).trim() !== '') {
      whereClause += ` AND (c.case_id LIKE ? OR i.name LIKE ? OR c.aicte_permanent_id LIKE ? OR c.category LIKE ? OR c.assigned_officer LIKE ?)`;
      const s = `%${String(search).trim()}%`;
      params.push(s, s, s, s, s);
    }

    // Get total count for pagination
    const countSql = `
      SELECT COUNT(c.case_id) as total
      FROM cases c
      JOIN institutions i ON c.aicte_permanent_id = i.aicte_permanent_id
      ${whereClause}
    `;
    const countRow = await db.prepare(countSql).get(...params);
    const rawTotal = countRow?.total ?? countRow?.count ?? 0;
    const totalRecords = isNaN(parseInt(rawTotal, 10)) ? 0 : parseInt(rawTotal, 10);

    // Allowed sort columns
    const allowedSortCols = ['received_date', 'expected_disposal_date', 'priority', 'status', 'case_id', 'bureau'];
    const safeSortBy = allowedSortCols.includes(sortBy) ? `c.${sortBy}` : 'c.received_date';
    const safeSortOrder = String(sortOrder).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const numLimit = Math.max(1, parseInt(limit, 10) || 20);
    const numPage = Math.max(1, parseInt(page, 10) || 1);
    const offset = (numPage - 1) * numLimit;

    const listSql = `
      SELECT 
        c.case_id,
        c.aicte_permanent_id,
        c.category,
        c.description,
        c.received_date,
        c.status,
        c.bureau,
        c.assigned_officer,
        c.last_action,
        c.next_action,
        c.last_action_date,
        c.expected_disposal_date,
        c.priority,
        c.complainant_type,
        i.name as institution_name,
        i.state as institution_state,
        i.region as institution_region,
        CASE 
          WHEN c.expected_disposal_date < date('now') AND c.status != 'Disposed' THEN 1 
          ELSE 0 
        END as is_overdue
      FROM cases c
      JOIN institutions i ON c.aicte_permanent_id = i.aicte_permanent_id
      ${whereClause}
      ORDER BY ${safeSortBy} ${safeSortOrder}
      LIMIT ? OFFSET ?
    `;

    const cases = await db.prepare(listSql).all(...params, numLimit, offset);

    console.log(`[Cases API] Executed with ${params.length} params. Total matches: ${totalRecords}, Returned: ${cases.length}`);

    res.json({
      cases,
      pagination: {
        total: totalRecords,
        page: numPage,
        limit: numLimit,
        totalPages: Math.max(1, Math.ceil(totalRecords / numLimit))
      }
    });
  } catch (err) {
    console.error('[Cases API Error] Failed fetching cases:', err.message, err.stack);
    res.status(500).json({ 
      error: 'Failed to retrieve cases: ' + err.message,
      cases: [],
      pagination: { total: 0, page: 1, limit: 20, totalPages: 0 }
    });
  }
});

// POST /api/cases - Register New Case
router.post('/', async (req, res) => {
  try {
    const {
      aicte_permanent_id,
      institution_name,
      category,
      description,
      bureau = 'Regulation Bureau',
      priority = 'Medium',
      assigned_officer,
      expected_disposal_date,
      complainant_type = 'Public Citizen',
      remarks
    } = req.body;

    if (!category || !description) {
      return res.status(400).json({ error: 'Grievance category and description are required' });
    }

    let instId = aicte_permanent_id;
    let targetInst = null;

    if (instId) {
      targetInst = await db.prepare('SELECT * FROM institutions WHERE aicte_permanent_id = ?').get(instId);
    } else if (institution_name) {
      targetInst = await db.prepare('SELECT * FROM institutions WHERE name LIKE ?').get(`%${institution_name}%`);
      if (targetInst) instId = targetInst.aicte_permanent_id;
    }

    if (!targetInst) {
      // Pick first institution or generate one if not provided
      targetInst = await db.prepare('SELECT * FROM institutions LIMIT 1').get();
      instId = targetInst.aicte_permanent_id;
    }

    // Generate unique official Case ID
    const bureauPrefixMap = {
      'Regulation Bureau': 'RB',
      'PGRC': 'PGRC',
      'Approval Bureau': 'AB',
      'Regional Office': 'RO'
    };
    const prefix = bureauPrefixMap[bureau] || 'GEN';
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const caseId = `AICTE-${prefix}-2026-${randNum}`;

    const todayStr = new Date().toISOString().split('T')[0];
    const targetDate = expected_disposal_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const officer = assigned_officer || (bureau === 'Regulation Bureau' ? 'Shri Anand Kumar Gupta' : 'Smt. Manjula Sundaram');

    await db.transaction(async () => {
      // 1. Insert Case
      await db.prepare(`
        INSERT INTO cases (
          case_id, aicte_permanent_id, category, description,
          received_date, status, bureau, assigned_officer,
          last_action, next_action, last_action_date,
          expected_disposal_date, priority, complainant_type
        ) VALUES (?, ?, ?, ?, ?, 'Pending', ?, ?, 'Complaint Formally Lodged', 'Preliminary Scrutiny by Scrutiny Committee', ?, ?, ?, ?)
      `).run(
        caseId,
        instId,
        category,
        description,
        todayStr,
        bureau,
        officer,
        todayStr,
        targetDate,
        priority,
        complainant_type
      );

      // 2. Insert Initial Action Entry
      await db.prepare(`
        INSERT INTO case_actions (case_id, action, by_officer, bureau, timestamp, remarks)
        VALUES (?, 'Complaint Registered on Central Portal', ?, ?, datetime('now'), ?)
      `).run(caseId, officer, bureau, remarks || 'Formal institutional petition registered on AICTE CMS.');
    });

    // Run overlap detection automatically!
    const syncRes = await syncOverlapAlerts();

    // Broadcast SSE live event!
    broadcastEvent('CASE_CREATED', {
      caseId,
      institution_name: targetInst.name,
      bureau,
      status: 'Pending',
      syncRes
    });

    res.status(201).json({
      message: 'Case successfully registered on central register',
      case_id: caseId,
      institution_name: targetInst.name
    });
  } catch (err) {
    console.error('Error creating case:', err);
    res.status(500).json({ error: 'Failed to register new case' });
  }
});

// GET /api/cases/:id - Detailed case view with history & cross-links
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const caseItem = await db.prepare(`
      SELECT 
        c.*,
        i.name as institution_name,
        i.address as institution_address,
        i.state as institution_state,
        i.region as institution_region,
        i.type as institution_type,
        i.contact_email as institution_email,
        CASE 
          WHEN c.expected_disposal_date < date('now') AND c.status != 'Disposed' THEN 1 
          ELSE 0 
        END as is_overdue
      FROM cases c
      JOIN institutions i ON c.aicte_permanent_id = i.aicte_permanent_id
      WHERE c.case_id = ?
    `).get(req.params.id);

    if (!caseItem) {
      return res.status(404).json({ error: 'Case docket not found' });
    }

    const userRegion = getUserRegion(req.user);
    if (userRegion && caseItem.institution_region !== userRegion) {
      return res.status(403).json({ 
        error: `Access Denied: Docket belongs to ${caseItem.institution_region} region. Your credentials permit jurisdiction only in ${userRegion} region.` 
      });
    }

    // Fetch action history
    const history = await db.prepare(`
      SELECT * FROM case_actions
      WHERE case_id = ?
      ORDER BY timestamp DESC
    `).all(req.params.id);

    // Fetch linked cases
    const linkedCases = await db.prepare(`
      SELECT 
        cl.id as link_id,
        cl.link_type,
        cl.remarks as link_remarks,
        cl.created_at as link_created_at,
        c.case_id,
        c.category,
        c.status,
        c.bureau,
        c.received_date,
        c.priority
      FROM case_links cl
      JOIN cases c ON (c.case_id = CASE WHEN cl.case_id_1 = ? THEN cl.case_id_2 ELSE cl.case_id_1 END)
      WHERE cl.case_id_1 = ? OR cl.case_id_2 = ?
    `).all(req.params.id, req.params.id, req.params.id);

    // Fetch other open cases for the same institution (to detect parallel investigations)
    const sisterCases = await db.prepare(`
      SELECT case_id, category, bureau, status, received_date, priority
      FROM cases
      WHERE aicte_permanent_id = ? AND case_id != ?
      ORDER BY received_date DESC
    `).all(caseItem.aicte_permanent_id, caseItem.case_id);

    res.json({
      case: caseItem,
      history,
      linkedCases,
      sisterCases
    });
  } catch (err) {
    console.error('Error fetching case detail:', err);
    res.status(500).json({ error: 'Failed to retrieve case details' });
  }
});

// POST /api/cases/:id/action - Append official action
router.post('/:id/action', optionalAuth, async (req, res) => {
  try {
    const { action, remarks, newStatus, nextAction, byOfficer, bureau } = req.body;

    if (!action || !byOfficer) {
      return res.status(400).json({ error: 'Action and officer identification are required' });
    }

    const currentCase = await db.prepare('SELECT * FROM cases WHERE case_id = ?').get(req.params.id);
    if (!currentCase) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const perm = await checkCaseActionPermission(req.user, currentCase);
    if (!perm.allowed) {
      return res.status(403).json({ error: perm.error });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    await db.transaction(async () => {
      // 1. Insert action record
      await db.prepare(`
        INSERT INTO case_actions (case_id, action, by_officer, bureau, timestamp, remarks)
        VALUES (?, ?, ?, ?, datetime('now'), ?)
      `).run(req.params.id, action, byOfficer, bureau || currentCase.bureau, remarks || null);

      // 2. Update case record
      let updateSql = `
        UPDATE cases 
        SET last_action = ?, last_action_date = ?
      `;
      const updateParams = [action, todayStr];

      if (newStatus && ['Pending', 'Under Process', 'Disposed', 'Transferred', 'Escalated'].includes(newStatus)) {
        updateSql += `, status = ?`;
        updateParams.push(newStatus);
      }

      if (nextAction) {
        updateSql += `, next_action = ?`;
        updateParams.push(nextAction);
      }

      updateSql += ` WHERE case_id = ?`;
      updateParams.push(req.params.id);

      await db.prepare(updateSql).run(...updateParams);
    });

    // Sync overlap alerts if status changed
    await syncOverlapAlerts();

    // Broadcast SSE live update!
    broadcastEvent('CASE_UPDATED', {
      caseId: req.params.id,
      action,
      byOfficer,
      newStatus: newStatus || currentCase.status
    });

    res.json({ message: 'Procedural action logged successfully' });
  } catch (err) {
    console.error('Error recording case action:', err);
    res.status(500).json({ error: 'Failed to record action' });
  }
});

// POST /api/cases/:id/transfer - Transfer to another bureau
router.post('/:id/transfer', optionalAuth, async (req, res) => {
  try {
    const { target_bureau, to_bureau, target_officer, remarks, by_officer } = req.body;
    const destBureau = target_bureau || to_bureau;

    if (!destBureau) {
      return res.status(400).json({ error: 'Target bureau is required for transfer' });
    }

    const currentCase = await db.prepare('SELECT * FROM cases WHERE case_id = ?').get(req.params.id);
    if (!currentCase) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const perm = await checkCaseActionPermission(req.user, currentCase);
    if (!perm.allowed) {
      return res.status(403).json({ error: perm.error });
    }

    const officer = by_officer || 'Authorised Officer';
    const actionDesc = `Transferred from ${currentCase.bureau} to ${destBureau}`;

    await db.transaction(async () => {
      // 1. Update Case
      await db.prepare(`
        UPDATE cases 
        SET bureau = ?,
            assigned_officer = COALESCE(?, assigned_officer),
            status = 'Transferred',
            last_action = ?,
            last_action_date = date('now'),
            next_action = 'Docket intake by receiving bureau'
        WHERE case_id = ?
      `).run(destBureau, target_officer || null, actionDesc, req.params.id);

      // 2. Log Action History
      await db.prepare(`
        INSERT INTO case_actions (case_id, action, by_officer, bureau, timestamp, remarks)
        VALUES (?, ?, ?, ?, datetime('now'), ?)
      `).run(req.params.id, actionDesc, officer, currentCase.bureau, remarks || `Formal inter-bureau transfer to ${destBureau}`);
    });

    // Re-run overlap detection (transferring might create or change overlap)
    await syncOverlapAlerts();

    broadcastEvent('CASE_TRANSFERRED', {
      caseId: req.params.id,
      oldBureau: currentCase.bureau,
      newBureau: destBureau,
      byOfficer: officer
    });

    res.json({ message: `Case transferred successfully to ${destBureau}` });
  } catch (err) {
    console.error('Error transferring case:', err);
    res.status(500).json({ error: 'Failed to transfer case' });
  }
});

// POST /api/cases/:id/escalate - Escalate to Standing Committee / Council
router.post('/:id/escalate', optionalAuth, async (req, res) => {
  try {
    const { remarks, by_officer } = req.body;
    const currentCase = await db.prepare('SELECT * FROM cases WHERE case_id = ?').get(req.params.id);
    if (!currentCase) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const perm = await checkCaseActionPermission(req.user, currentCase);
    if (!perm.allowed) {
      return res.status(403).json({ error: perm.error });
    }

    const officer = by_officer || 'Authorised Officer';
    const actionDesc = 'Escalated to Standing Appellate Committee (SAC)';

    await db.transaction(async () => {
      await db.prepare(`
        UPDATE cases 
        SET status = 'Escalated',
            priority = 'Urgent',
            last_action = ?,
            last_action_date = date('now'),
            next_action = 'Appellate Council Review & Final Speaking Order'
        WHERE case_id = ?
      `).run(actionDesc, req.params.id);

      await db.prepare(`
        INSERT INTO case_actions (case_id, action, by_officer, bureau, timestamp, remarks)
        VALUES (?, ?, ?, ?, datetime('now'), ?)
      `).run(req.params.id, actionDesc, officer, currentCase.bureau, remarks || 'Escalation triggered due to statutory non-compliance or persistent dispute.');
    });

    await syncOverlapAlerts();
    broadcastEvent('CASE_ESCALATED', { caseId: req.params.id, byOfficer: officer });

    res.json({ message: 'Case successfully escalated to SAC / Council' });
  } catch (err) {
    console.error('Error escalating case:', err);
    res.status(500).json({ error: 'Failed to escalate case' });
  }
});

// POST /api/cases/:id/dispose - Close & Dispose Case
router.post('/:id/dispose', optionalAuth, async (req, res) => {
  try {
    const { remarks, by_officer } = req.body;
    const currentCase = await db.prepare('SELECT * FROM cases WHERE case_id = ?').get(req.params.id);
    if (!currentCase) {
      return res.status(404).json({ error: 'Case not found' });
    }

    const perm = await checkCaseActionPermission(req.user, currentCase);
    if (!perm.allowed) {
      return res.status(403).json({ error: perm.error });
    }

    const officer = by_officer || 'Authorised Officer';
    const actionDesc = 'Speaking Order Issued & Docket Disposed';

    await db.transaction(async () => {
      await db.prepare(`
        UPDATE cases 
        SET status = 'Disposed',
            last_action = ?,
            last_action_date = date('now'),
            next_action = 'Case Disposed & Closed'
        WHERE case_id = ?
      `).run(actionDesc, req.params.id);

      await db.prepare(`
        INSERT INTO case_actions (case_id, action, by_officer, bureau, timestamp, remarks)
        VALUES (?, ?, ?, ?, datetime('now'), ?)
      `).run(req.params.id, actionDesc, officer, currentCase.bureau, remarks || 'Formal inquiry concluded and speaking order issued to all parties.');
    });

    // Re-run overlap detection to remove resolved overlap if applicable
    await syncOverlapAlerts();
    broadcastEvent('CASE_DISPOSED', { caseId: req.params.id, byOfficer: officer });

    res.json({ message: 'Case formally disposed and marked closed' });
  } catch (err) {
    console.error('Error disposing case:', err);
    res.status(500).json({ error: 'Failed to dispose case' });
  }
});

// POST /api/cases/:id/links or /link - Procedurally link two cases
async function handleLinkCaseEndpoint(req, res) {
  try {
    const { target_case_id, link_case_id, remarks, created_by } = req.body;
    const caseId1 = req.params.id;
    const caseId2 = target_case_id || link_case_id || req.body.case_id_2;

    if (!caseId1 || !caseId2) {
      return res.status(400).json({ error: 'Both case IDs are required for linking' });
    }

    const checkExisting = await db.prepare(`
      SELECT id FROM case_links
      WHERE (case_id_1 = ? AND case_id_2 = ?) OR (case_id_1 = ? AND case_id_2 = ?)
    `).get(caseId1, caseId2, caseId2, caseId1);

    if (!checkExisting) {
      await db.prepare(`
        INSERT INTO case_links (case_id_1, case_id_2, link_type, created_by, remarks)
        VALUES (?, ?, 'PROCEDURAL_LINK', ?, ?)
      `).run(caseId1, caseId2, created_by || (req.user && req.user.full_name) || 'Authorised Official', remarks || 'Procedurally linked proceedings');
    }

    const officerName = created_by || (req.user && req.user.full_name) || 'Authorised Official';
    await db.prepare(`
      INSERT INTO case_actions (case_id, action, by_officer, bureau, timestamp, remarks)
      VALUES (?, 'Related Docket Linked', ?, 'Central Registry', datetime('now'), ?)
    `).run(caseId1, officerName, `Linked with related docket ${caseId2}: ${remarks || 'Procedural linkage'}`);

    await db.prepare(`
      INSERT INTO case_actions (case_id, action, by_officer, bureau, timestamp, remarks)
      VALUES (?, 'Related Docket Linked', ?, 'Central Registry', datetime('now'), ?)
    `).run(caseId2, officerName, `Linked with related docket ${caseId1}: ${remarks || 'Procedural linkage'}`);

    await syncOverlapAlerts();
    broadcastEvent('CASE_LINKED', { case_id_1: caseId1, case_id_2: caseId2 });

    res.json({ message: `Successfully linked case ${caseId1} with ${caseId2}` });
  } catch (err) {
    console.error('Error linking cases:', err);
    res.status(500).json({ error: 'Failed to link cases' });
  }
}
router.post('/:id/links', optionalAuth, handleLinkCaseEndpoint);
router.post('/:id/link', optionalAuth, handleLinkCaseEndpoint);

module.exports = router;
