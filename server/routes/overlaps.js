const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { broadcastEvent } = require('../events');
const { detectOverlaps, syncOverlapAlerts } = require('../services/overlapDetector');

// GET /api/overlaps - Comprehensive list of institutions with active parallel cases across bureaus
router.get('/', async (req, res) => {
  try {
    const { region, status = 'ALL' } = req.query;
    const institutions = await detectOverlaps({ region, statusFilter: status });

    const totalCount = institutions.length;
    const pendingCount = institutions.filter(i => i.resolution_status === 'PENDING').length;
    const coordinatedCount = institutions.filter(i => i.resolution_status === 'COORDINATED').length;
    const dismissedCount = institutions.filter(i => i.resolution_status === 'DISMISSED').length;

    res.json({
      total_overlapping: totalCount,
      pending_count: pendingCount,
      coordinated_count: coordinatedCount,
      dismissed_count: dismissedCount,
      institutions
    });
  } catch (err) {
    console.error('Error fetching overlaps:', err);
    res.status(500).json({ error: 'Failed to retrieve overlapping cases' });
  }
});

// POST /api/overlaps/link - Formally link two parallel cases to coordinate investigation
router.post('/link', async (req, res) => {
  try {
    const { case_id_1, case_id_2, institution_key, link_type = 'CROSS_BUREAU_OVERLAP', remarks, created_by } = req.body;

    if (!case_id_1 || !case_id_2) {
      return res.status(400).json({ error: 'Both case IDs are required for linking' });
    }

    const checkExisting = await db.prepare(`
      SELECT id FROM case_links
      WHERE (case_id_1 = ? AND case_id_2 = ?) OR (case_id_1 = ? AND case_id_2 = ?)
    `).get(case_id_1, case_id_2, case_id_2, case_id_1);

    if (!checkExisting) {
      await db.prepare(`
        INSERT INTO case_links (case_id_1, case_id_2, link_type, created_by, remarks)
        VALUES (?, ?, ?, ?, ?)
      `).run(case_id_1, case_id_2, link_type, created_by || 'Authorised Official', remarks || 'Cross-bureau linkage established');
    }

    // Mark institution overlap resolution status as COORDINATED
    if (institution_key) {
      await db.prepare(`
        INSERT INTO overlap_resolutions (institution_key, status, resolved_by, resolved_at, remarks)
        VALUES (?, 'COORDINATED', ?, datetime('now'), ?)
        ON CONFLICT(institution_key) DO UPDATE SET
          status = 'COORDINATED',
          resolved_by = excluded.resolved_by,
          resolved_at = datetime('now'),
          remarks = excluded.remarks
      `).run(institution_key, created_by || 'Authorised Official', remarks || 'Formally linked cases');
    }

    // Log actions for both cases
    const officerName = created_by || 'Authorised Official';
    await db.prepare(`
      INSERT INTO case_actions (case_id, action, by_officer, bureau, timestamp, remarks)
      VALUES (?, 'Cross-Bureau Link Established', ?, 'Coordination Secretariat', datetime('now'), ?)
    `).run(case_id_1, officerName, `Linked with parallel proceeding ${case_id_2}: ${remarks || 'Joint review'}`);

    await db.prepare(`
      INSERT INTO case_actions (case_id, action, by_officer, bureau, timestamp, remarks)
      VALUES (?, 'Cross-Bureau Link Established', ?, 'Coordination Secretariat', datetime('now'), ?)
    `).run(case_id_2, officerName, `Linked with parallel proceeding ${case_id_1}: ${remarks || 'Joint review'}`);

    await syncOverlapAlerts();
    broadcastEvent('CASE_LINKED', { case_id_1, case_id_2, institution_key });

    res.json({ message: 'Cross-bureau link established successfully' });
  } catch (err) {
    console.error('Error linking cases:', err);
    res.status(500).json({ error: 'Failed to link cases' });
  }
});

// POST /api/overlaps/coordinate - Mark overlap as coordinated
router.post('/coordinate', async (req, res) => {
  try {
    const { institution_key, remarks, resolved_by } = req.body;

    if (!institution_key) {
      return res.status(400).json({ error: 'Institution key is required' });
    }

    await db.prepare(`
      INSERT INTO overlap_resolutions (institution_key, status, resolved_by, resolved_at, remarks)
      VALUES (?, 'COORDINATED', ?, datetime('now'), ?)
      ON CONFLICT(institution_key) DO UPDATE SET
        status = 'COORDINATED',
        resolved_by = excluded.resolved_by,
        resolved_at = datetime('now'),
        remarks = excluded.remarks
    `).run(institution_key, resolved_by || 'Authorised Official', remarks || 'Marked as coordinated across bureaus');

    // Resolve any pending alerts for this institution
    await db.prepare(`
      UPDATE alerts SET is_resolved = 1 
      WHERE aicte_permanent_id = ? AND alert_type = 'Cross-Bureau Overlap'
    `).run(institution_key);

    broadcastEvent('OVERLAP_UPDATED', { institution_key, status: 'COORDINATED' });

    res.json({ message: 'Overlap successfully marked as coordinated' });
  } catch (err) {
    console.error('Error marking overlap as coordinated:', err);
    res.status(500).json({ error: 'Failed to update coordination status' });
  }
});

// POST /api/overlaps/dismiss - Dismiss overlap with remark
router.post('/dismiss', async (req, res) => {
  try {
    const { institution_key, remarks, resolved_by } = req.body;

    if (!institution_key || !remarks) {
      return res.status(400).json({ error: 'Institution key and dismissal remarks are required' });
    }

    await db.prepare(`
      INSERT INTO overlap_resolutions (institution_key, status, resolved_by, resolved_at, remarks)
      VALUES (?, 'DISMISSED', ?, datetime('now'), ?)
      ON CONFLICT(institution_key) DO UPDATE SET
        status = 'DISMISSED',
        resolved_by = excluded.resolved_by,
        resolved_at = datetime('now'),
        remarks = excluded.remarks
    `).run(institution_key, resolved_by || 'Authorised Official', remarks);

    // Resolve alert
    await db.prepare(`
      UPDATE alerts SET is_resolved = 1 
      WHERE aicte_permanent_id = ? AND alert_type = 'Cross-Bureau Overlap'
    `).run(institution_key);

    broadcastEvent('OVERLAP_UPDATED', { institution_key, status: 'DISMISSED' });

    res.json({ message: 'Overlap record dismissed with remarks' });
  } catch (err) {
    console.error('Error dismissing overlap:', err);
    res.status(500).json({ error: 'Failed to dismiss overlap' });
  }
});

// POST /api/overlaps/re-scan - Trigger manual re-scan
router.post('/re-scan', async (req, res) => {
  try {
    const syncRes = await syncOverlapAlerts();
    broadcastEvent('OVERLAPS_RESCANNED', syncRes);
    res.json({ message: 'Overlap detection scan completed', ...syncRes });
  } catch (err) {
    console.error('Error re-scanning overlaps:', err);
    res.status(500).json({ error: 'Failed to execute overlap scan' });
  }
});

module.exports = router;
