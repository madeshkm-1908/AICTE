const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { broadcastEvent } = require('../events');
const { generateAlerts } = require('../services/alertGenerator');
const { optionalAuth } = require('./auth');

// Block Complainants from accessing official alerts
router.use(optionalAuth, (req, res, next) => {
  if (req.user && req.user.role === 'Complainant') {
    return res.status(403).json({ error: 'Access Denied: Complainant accounts are restricted from accessing system alerts.' });
  }
  next();
});

// Helper to determine regional office filter
function getUserRegion(user) {
  if (!user || user.role !== 'Regional Office') return null;
  const b = user.bureau || '';
  if (b.includes('Southern')) return 'Southern';
  if (b.includes('Northern')) return 'Northern';
  if (b.includes('Western')) return 'Western';
  if (b.includes('Eastern')) return 'Eastern';
  if (b.includes('Central')) return 'Central';
  return null;
}

// GET /api/alerts - List system alerts with role & category filters
router.get('/', async (req, res) => {
  try {
    const { status = 'active', type = 'ALL', severity = 'ALL' } = req.query;
    const isResolved = status === 'resolved' ? 1 : 0;
    const userRegion = getUserRegion(req.user);

    let whereClause = 'WHERE a.is_resolved = ?';
    const params = [isResolved];

    if (type && type !== 'ALL') {
      whereClause += ' AND a.alert_type = ?';
      params.push(type);
    }

    if (severity && severity !== 'ALL') {
      whereClause += ' AND a.severity = ?';
      params.push(severity);
    }

    if (userRegion) {
      whereClause += ' AND (i.region = ? OR i.region IS NULL)';
      params.push(userRegion);
    }

    const alerts = await db.prepare(`
      SELECT 
        a.*,
        i.name as institution_name,
        i.region as institution_region,
        i.state as institution_state,
        c.bureau as case_bureau,
        c.status as case_status,
        c.expected_disposal_date
      FROM alerts a
      LEFT JOIN institutions i ON a.aicte_permanent_id = i.aicte_permanent_id
      LEFT JOIN cases c ON a.case_id = c.case_id
      ${whereClause}
      ORDER BY 
        CASE a.severity WHEN 'Critical' THEN 1 WHEN 'Warning' THEN 2 ELSE 3 END,
        a.created_at DESC
      LIMIT 150
    `).all(...params);

    // Also get active count for quick badge calculation
    let countSql = 'SELECT COUNT(a.id) as count FROM alerts a LEFT JOIN institutions i ON a.aicte_permanent_id = i.aicte_permanent_id WHERE a.is_resolved = 0';
    const countParams = [];
    if (userRegion) {
      countSql += ' AND (i.region = ? OR i.region IS NULL)';
      countParams.push(userRegion);
    }
    const unreadRow = await db.prepare(countSql).get(...countParams);

    res.json({ 
      alerts,
      unread_count: unreadRow ? parseInt(unreadRow.count) : 0
    });
  } catch (err) {
    console.error('Error fetching alerts:', err);
    res.status(500).json({ error: 'Failed to retrieve alerts' });
  }
});

// POST /api/alerts/sync - Force scan and generate fresh alerts
router.post('/sync', async (req, res) => {
  try {
    const result = await generateAlerts();
    res.json({ message: 'Alerts scan completed', ...result });
  } catch (err) {
    console.error('Error syncing alerts:', err);
    res.status(500).json({ error: 'Failed to synchronize alerts' });
  }
});

// POST /api/alerts/:id/resolve - Mark single alert as acknowledged / resolved
router.post('/:id/resolve', async (req, res) => {
  try {
    const result = await db.prepare('UPDATE alerts SET is_resolved = 1 WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    broadcastEvent('ALERT_RESOLVED', { alertId: req.params.id });
    res.json({ message: 'Alert marked as acknowledged / resolved' });
  } catch (err) {
    console.error('Error resolving alert:', err);
    res.status(500).json({ error: 'Failed to resolve alert' });
  }
});

// POST /api/alerts/resolve-all - Mark all active alerts matching query as acknowledged
router.post('/resolve-all', async (req, res) => {
  try {
    const { type } = req.body || {};
    let sql = 'UPDATE alerts SET is_resolved = 1 WHERE is_resolved = 0';
    const params = [];

    if (type && type !== 'ALL') {
      sql += ' AND alert_type = ?';
      params.push(type);
    }

    const result = await db.prepare(sql).run(...params);
    broadcastEvent('ALERTS_RESOLVED_ALL', { count: result.changes });

    res.json({ message: `Successfully acknowledged ${result.changes} alert(s)` });
  } catch (err) {
    console.error('Error resolving all alerts:', err);
    res.status(500).json({ error: 'Failed to resolve alerts' });
  }
});

module.exports = router;
