const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const db = require('../db/database');
const { broadcastEvent } = require('../events');
const { syncOverlapAlerts } = require('../services/overlapDetector');
const { generateAlerts } = require('../services/alertGenerator');
const { authenticateToken, requireComplainant } = require('./auth');

// Rate limiter for complaint submission (15 submissions per 15 minutes)
const complaintRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: { error: 'Too many complaint submissions. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Helper to map internal case status to public-safe status
 * Public statuses: 'Received', 'Under Review', 'Action Taken', 'Closed'
 */
function mapPublicStatus(status, actionCount = 1) {
  if (status === 'Disposed') return 'Closed';
  if (status === 'Pending') return 'Received';
  if (actionCount > 2) return 'Action Taken';
  return 'Under Review';
}

// GET /api/complainant/institutions - Search institutions for complaint submission
router.get('/institutions', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    let querySql = `
      SELECT aicte_permanent_id, name, address, state, region, type
      FROM institutions
    `;
    const params = [];

    if (q) {
      querySql += ` WHERE name LIKE ? OR aicte_permanent_id LIKE ?`;
      params.push(`%${q}%`, `%${q}%`);
    }

    querySql += ` ORDER BY name ASC LIMIT 30`;
    const rows = await db.prepare(querySql).all(...params);
    res.json({ institutions: rows });
  } catch (err) {
    console.error('Error fetching institutions for complainant:', err);
    res.status(500).json({ error: 'Failed to search institutions' });
  }
});

// POST /api/complainant/complaints - Citizen lodges a new grievance
router.post('/complaints', authenticateToken, requireComplainant, complaintRateLimiter, async (req, res) => {
  try {
    const { 
      aicte_permanent_id, 
      category, 
      description, 
      incident_date, 
      attachment_name, 
      attachment_data 
    } = req.body;

    // Strict Validations
    if (!aicte_permanent_id || typeof aicte_permanent_id !== 'string') {
      return res.status(400).json({ error: 'Please select an AICTE-approved institution.' });
    }

    if (!category || typeof category !== 'string' || category.trim().length === 0) {
      return res.status(400).json({ error: 'Please choose a complaint category.' });
    }

    if (!description || typeof description !== 'string' || description.trim().length < 15) {
      return res.status(400).json({ error: 'Please provide a detailed description (minimum 15 characters).' });
    }

    // Check that target institution exists
    const inst = await db.prepare('SELECT aicte_permanent_id, name, state, region FROM institutions WHERE aicte_permanent_id = ?').get(aicte_permanent_id.trim());
    if (!inst) {
      return res.status(404).json({ error: 'Selected institution not found in the AICTE registry.' });
    }

    // Generate unique Case ID
    let caseId = '';
    let exists = true;
    for (let attempts = 0; attempts < 10; attempts++) {
      const randNum = Math.floor(1000 + Math.random() * 9000);
      caseId = `AICTE-PGRC-2026-${randNum}`;
      const check = await db.prepare('SELECT case_id FROM cases WHERE case_id = ?').get(caseId);
      if (!check) {
        exists = false;
        break;
      }
    }

    if (exists) {
      caseId = `AICTE-PGRC-2026-${Date.now().toString().slice(-5)}`;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const incidentDateStr = incident_date || todayStr;
    const targetDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const bureau = 'PGRC';
    const status = 'Pending';
    const officer = 'Public Grievance Redressal Desk';
    const complainantType = req.user.designation || 'Student';

    // 1. Insert into cases table
    await db.prepare(`
      INSERT INTO cases (
        case_id,
        aicte_permanent_id,
        category,
        description,
        received_date,
        status,
        bureau,
        assigned_officer,
        last_action,
        next_action,
        last_action_date,
        expected_disposal_date,
        priority,
        complainant_type,
        source,
        complainant_id,
        incident_date,
        attachment_name,
        attachment_data
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      caseId,
      inst.aicte_permanent_id,
      category.trim(),
      description.trim(),
      todayStr,
      status,
      bureau,
      officer,
      'Grievance Submitted via Complainant Portal',
      'Official Verification by AICTE PGRC',
      todayStr,
      targetDate,
      'Medium',
      complainantType,
      'Complainant Portal',
      req.user.id,
      incidentDateStr,
      attachment_name || null,
      attachment_data || null
    );

    // 2. Insert initial action log
    await db.prepare(`
      INSERT INTO case_actions (case_id, action, by_officer, bureau, timestamp, remarks)
      VALUES (?, 'Grievance Registered via Citizen Portal', ?, ?, datetime('now'), ?)
    `).run(
      caseId,
      `Citizen (${complainantType})`,
      bureau,
      'Grievance registered through public portal and placed in verification queue.'
    );

    // 3. Automatically trigger overlap detection and alert generation
    syncOverlapAlerts()
      .then(async (syncRes) => {
        await generateAlerts();
        // Broadcast overlap update if new alerts or overlaps detected
        broadcastEvent('ALERTS_UPDATED', { source: 'Complainant Portal', syncRes });
      })
      .catch((e) => {
        console.error('Background alert/overlap sync error:', e);
      });

    // 4. Broadcast live update to officials via SSE
    broadcastEvent('CASE_CREATED', {
      caseId,
      institution_name: inst.name,
      bureau,
      status,
      source: 'Complainant Portal'
    });

    res.status(201).json({
      success: true,
      case_id: caseId,
      institution_name: inst.name,
      received_date: todayStr,
      status: 'Received',
      message: 'Grievance submitted successfully. Your reference Case ID has been generated.'
    });
  } catch (err) {
    console.error('Error creating complainant grievance:', err);
    res.status(500).json({ error: 'Failed to submit grievance. Please try again later.' });
  }
});

// GET /api/complainant/my-complaints - List all complaints raised by logged-in complainant
router.get('/my-complaints', authenticateToken, requireComplainant, async (req, res) => {
  try {
    const rows = await db.prepare(`
      SELECT 
        c.case_id,
        c.aicte_permanent_id,
        c.category,
        c.description,
        c.received_date,
        c.incident_date,
        c.status,
        c.expected_disposal_date,
        c.created_at,
        c.attachment_name,
        i.name as institution_name,
        i.state as institution_state,
        i.region as institution_region,
        (SELECT COUNT(*) FROM case_actions WHERE case_id = c.case_id) as action_count
      FROM cases c
      JOIN institutions i ON c.aicte_permanent_id = i.aicte_permanent_id
      WHERE c.complainant_id = ?
      ORDER BY c.created_at DESC
    `).all(req.user.id);

    // Format safe view for public complainant (NO internal officer names or bureau politics)
    const complaints = rows.map(r => ({
      case_id: r.case_id,
      aicte_permanent_id: r.aicte_permanent_id,
      institution_name: r.institution_name,
      institution_state: r.institution_state,
      institution_region: r.institution_region,
      category: r.category,
      description: r.description,
      received_date: r.received_date,
      incident_date: r.incident_date,
      expected_disposal_date: r.expected_disposal_date,
      created_at: r.created_at,
      has_attachment: Boolean(r.attachment_name),
      attachment_name: r.attachment_name,
      status: mapPublicStatus(r.status, Number(r.action_count || 1)),
      raw_status: r.status
    }));

    res.json({ complaints });
  } catch (err) {
    console.error('Error fetching my-complaints:', err);
    res.status(500).json({ error: 'Failed to retrieve your complaints' });
  }
});

// GET /api/complainant/my-complaints/:caseId - Single complaint tracking & public timeline
router.get('/my-complaints/:caseId', authenticateToken, requireComplainant, async (req, res) => {
  try {
    const { caseId } = req.params;

    const caseItem = await db.prepare(`
      SELECT 
        c.case_id,
        c.aicte_permanent_id,
        c.category,
        c.description,
        c.received_date,
        c.incident_date,
        c.status,
        c.expected_disposal_date,
        c.created_at,
        c.attachment_name,
        c.attachment_data,
        i.name as institution_name,
        i.state as institution_state,
        i.region as institution_region,
        i.type as institution_type
      FROM cases c
      JOIN institutions i ON c.aicte_permanent_id = i.aicte_permanent_id
      WHERE c.case_id = ? AND c.complainant_id = ?
    `).get(caseId, req.user.id);

    if (!caseItem) {
      return res.status(404).json({ error: 'Complaint not found or unauthorized access.' });
    }

    // Retrieve action history
    const actions = await db.prepare(`
      SELECT id, action, timestamp, remarks
      FROM case_actions
      WHERE case_id = ?
      ORDER BY timestamp ASC
    `).all(caseId);

    // Sanitize actions to create a friendly, public-safe timeline
    const timeline = actions.map((act, index) => {
      let stage = 'Received';
      let title = act.action;
      let note = act.remarks || 'Status updated by AICTE Grievance Committee.';

      if (index === 0) {
        stage = 'Received';
        title = 'Complaint Registered';
        note = 'Your formal complaint was accepted and assigned an AICTE tracking identifier.';
      } else if (act.action.includes('Disposed') || act.action.includes('Closed')) {
        stage = 'Closed';
        title = 'Resolution Issued';
        note = act.remarks || 'Case inquiry completed and formal response registered.';
      } else if (act.action.includes('Transferred') || act.action.includes('Escalated')) {
        stage = 'Under Review';
        title = 'Referred for Inquiry';
        note = 'Complaint forwarded to competent institutional review committee.';
      } else {
        stage = index > 1 ? 'Action Taken' : 'Under Review';
        title = 'Official Review Proceeding';
        note = act.remarks || 'AICTE official inquiry in progress.';
      }

      return {
        id: act.id,
        stage,
        title,
        timestamp: act.timestamp,
        note
      };
    });

    const publicStatus = mapPublicStatus(caseItem.status, actions.length);

    res.json({
      complaint: {
        case_id: caseItem.case_id,
        aicte_permanent_id: caseItem.aicte_permanent_id,
        institution_name: caseItem.institution_name,
        institution_state: caseItem.institution_state,
        institution_region: caseItem.institution_region,
        institution_type: caseItem.institution_type,
        category: caseItem.category,
        description: caseItem.description,
        received_date: caseItem.received_date,
        incident_date: caseItem.incident_date,
        expected_disposal_date: caseItem.expected_disposal_date,
        created_at: caseItem.created_at,
        attachment_name: caseItem.attachment_name,
        has_attachment: Boolean(caseItem.attachment_name),
        status: publicStatus
      },
      timeline
    });
  } catch (err) {
    console.error('Error fetching complaint detail:', err);
    res.status(500).json({ error: 'Failed to retrieve complaint tracking details' });
  }
});

module.exports = router;
