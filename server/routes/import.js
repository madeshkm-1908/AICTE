const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken } = require('./auth');
const { broadcastEvent } = require('../events');
const { syncOverlapAlerts } = require('../services/overlapDetector');
const { generateAlerts } = require('../services/alertGenerator');

// Restrict access to Senior Management and Regulation Bureau
function requireImportPermission(req, res, next) {
  if (!req.user || !['Senior Management', 'Regulation Bureau'].includes(req.user.role)) {
    return res.status(403).json({
      error: 'Access Denied: Data Import is restricted to Senior Management and Regulation Bureau only.'
    });
  }
  next();
}

// GET /api/import/template - Download sample CSV templates
router.get('/template', authenticateToken, requireImportPermission, (req, res) => {
  const { type = 'institutions' } = req.query;

  if (type === 'institutions') {
    const csv = `aicte_permanent_id,name,address,state,region,type,contact_email
1-99281721,"National Institute of Applied Robotics & Artificial Intelligence","Sector 62, Institutional Area, Noida 201309","Uttar Pradesh","Northern","Engineering & Technology","director@niarai.edu.in"
1-99281722,"Deccan Academy of Technology & Research","MG Road, Camp, Pune 411001","Maharashtra","Western","Engineering & Technology","principal@deccantech.edu.in"
1-99281723,"Coimbatore Polytechnic College of Industrial Design","Pollachi Main Road, Coimbatore 641021","Tamil Nadu","Southern","Polytechnic Diploma","info@cbe-poly.edu.in"`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="aicte_institutions_sample_template.csv"');
    return res.send(csv);
  } else {
    const csv = `case_id,aicte_permanent_id,category,description,received_date,status,bureau,assigned_officer,priority,expected_disposal_date,complainant_type
AICTE-IMP-2026-0001,1-10294811,"Faculty Deficiency & Qualification Mismatch","Assistant Professor cadre lacking mandatory AICTE Ph.D credentials.","2026-10-01","Pending","Regulation Bureau","Shri Anand Kumar Gupta","High","2026-11-15","Faculty Member"
AICTE-IMP-2026-0002,1-10294811,"Non-Refund of Caution Deposit & Fee Retention","Refusal to return caution money after completion of B.Tech curriculum.","2026-10-05","Pending","PGRC","Smt. Manjula Sundaram","Medium","2026-11-20","Student Grievant"
AICTE-IMP-2026-0003,1-20394811,"Withholding of Original Certificates & Marksheets","College holding original diploma certificates due to pending bus fee arrears.","2026-09-25","Under Process","PGRC","Deepak Joshi","Urgent","2026-11-10","Student Grievant"`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="aicte_cases_sample_template.csv"');
    return res.send(csv);
  }
});

// POST /api/import/execute - Validate & ingest rows
router.post('/execute', authenticateToken, requireImportPermission, async (req, res) => {
  try {
    const { type, rows } = req.body;

    if (!type || !['institutions', 'cases'].includes(type)) {
      return res.status(400).json({ error: 'Valid import type (institutions or cases) is required.' });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: 'No rows provided for import.' });
    }

    let added = 0;
    let skipped = 0;
    let rejected = 0;
    const errors = [];

    const validRegions = ['Northern', 'Southern', 'Western', 'Eastern', 'Central'];
    const validStatuses = ['Pending', 'Under Process', 'Disposed', 'Transferred', 'Escalated'];
    const validPriorities = ['High', 'Medium', 'Low', 'Urgent'];

    if (type === 'institutions') {
      const checkStmt = db.prepare('SELECT aicte_permanent_id FROM institutions WHERE aicte_permanent_id = ?');
      const insertStmt = db.prepare(`
        INSERT INTO institutions (aicte_permanent_id, name, address, state, region, type, contact_email)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 1;
        const id = (row.aicte_permanent_id || row.id || '').trim();
        const name = (row.name || '').trim();
        const address = (row.address || '').trim() || 'Address on record';
        const state = (row.state || '').trim();
        const region = (row.region || '').trim();
        const instType = (row.type || 'Engineering & Technology').trim();
        const email = (row.contact_email || row.email || '').trim() || `contact@${id.replace(/[^a-z0-9]/gi, '')}.edu.in`;

        // Validation
        if (!id) {
          rejected++;
          errors.push({ row: rowNum, id: 'N/A', reason: 'Missing mandatory aicte_permanent_id.' });
          continue;
        }
        if (!name) {
          rejected++;
          errors.push({ row: rowNum, id, reason: 'Missing mandatory institution name.' });
          continue;
        }
        if (!state) {
          rejected++;
          errors.push({ row: rowNum, id, reason: 'Missing mandatory state.' });
          continue;
        }
        if (!validRegions.includes(region)) {
          rejected++;
          errors.push({ row: rowNum, id, reason: `Invalid region '${region}'. Must be one of: ${validRegions.join(', ')}.` });
          continue;
        }

        // Duplicate Check
        const existing = await checkStmt.get(id);
        if (existing) {
          skipped++;
          errors.push({ row: rowNum, id, reason: 'Duplicate AICTE Permanent ID already present in database (Skipped).' });
          continue;
        }

        try {
          await insertStmt.run(id, name, address, state, region, instType, email);
          added++;
        } catch (insertErr) {
          rejected++;
          errors.push({ row: rowNum, id, reason: insertErr.message });
        }
      }

    } else if (type === 'cases') {
      const checkInstStmt = db.prepare('SELECT aicte_permanent_id, name FROM institutions WHERE aicte_permanent_id = ?');
      const checkCaseStmt = db.prepare('SELECT case_id FROM cases WHERE case_id = ?');
      const insertCaseStmt = db.prepare(`
        INSERT INTO cases (
          case_id, aicte_permanent_id, category, description, received_date,
          status, bureau, assigned_officer, last_action, next_action,
          last_action_date, expected_disposal_date, priority, complainant_type
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const insertActionStmt = db.prepare(`
        INSERT INTO case_actions (case_id, action, by_officer, bureau, timestamp, remarks)
        VALUES (?, ?, ?, ?, datetime('now'), ?)
      `);

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNum = i + 1;
        let caseId = (row.case_id || '').trim();
        const instId = (row.aicte_permanent_id || row.institution_id || '').trim();
        const category = (row.category || '').trim();
        const description = (row.description || '').trim() || 'Imported institutional grievance record.';
        const receivedDate = (row.received_date || new Date().toISOString().split('T')[0]).trim();
        let status = (row.status || 'Pending').trim();
        let bureau = (row.bureau || req.user.bureau || 'Regulation Bureau').trim();
        const officer = (row.assigned_officer || req.user.full_name || 'Authorised Officer').trim();
        let priority = (row.priority || 'Medium').trim();
        let expectedDate = (row.expected_disposal_date || '').trim();
        const complainantType = (row.complainant_type || 'Public Grievant').trim();

        // Validation
        if (!instId) {
          rejected++;
          errors.push({ row: rowNum, id: caseId || 'N/A', reason: 'Missing mandatory aicte_permanent_id.' });
          continue;
        }

        const instMatch = await checkInstStmt.get(instId);
        if (!instMatch) {
          rejected++;
          errors.push({ row: rowNum, id: caseId || 'N/A', reason: `Referenced institution '${instId}' does not exist in master register.` });
          continue;
        }

        if (!category) {
          rejected++;
          errors.push({ row: rowNum, id: caseId || 'N/A', reason: 'Missing mandatory grievance category.' });
          continue;
        }

        if (!validStatuses.includes(status)) status = 'Pending';
        if (!validPriorities.includes(priority)) priority = 'Medium';

        if (!expectedDate) {
          const d = new Date(receivedDate);
          d.setDate(d.getDate() + 45);
          expectedDate = d.toISOString().split('T')[0];
        }

        if (!caseId) {
          caseId = `AICTE-IMP-${Date.now().toString().slice(-4)}-${Math.floor(1000 + Math.random() * 9000)}`;
        } else {
          const dupCase = await checkCaseStmt.get(caseId);
          if (dupCase) {
            skipped++;
            errors.push({ row: rowNum, id: caseId, reason: 'Duplicate Case ID already exists in database (Skipped).' });
            continue;
          }
        }

        try {
          await insertCaseStmt.run(
            caseId,
            instId,
            category,
            description,
            receivedDate,
            status,
            bureau,
            officer,
            'Imported via Central Batch Upload',
            'Preliminary Scrutiny by Bureau Scrutiny Committee',
            receivedDate,
            expectedDate,
            priority,
            complainantType
          );

          await insertActionStmt.run(
            caseId,
            'Batch Ingested on Central Register',
            req.user.full_name,
            req.user.bureau,
            `Imported via automated data migration pipeline by ${req.user.full_name}.`
          );

          added++;
        } catch (insertErr) {
          rejected++;
          errors.push({ row: rowNum, id: caseId, reason: insertErr.message });
        }
      }
    }

    // Automatically trigger Overlap Detection and Alerts surveillance re-scan!
    if (added > 0) {
      try {
        syncOverlapAlerts();
        generateAlerts();
      } catch (scanErr) {
        console.error('Error during post-import scan:', scanErr);
      }

      broadcastEvent('DATA_IMPORTED', {
        type,
        added,
        byUser: req.user.full_name,
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      message: `Batch import completed. Added: ${added}, Skipped: ${skipped}, Rejected: ${rejected}`,
      summary: { added, skipped, rejected, total: rows.length },
      errors
    });
  } catch (err) {
    console.error('Error during data import execute:', err);
    res.status(500).json({ error: 'Failed to execute data import.' });
  }
});

module.exports = router;
