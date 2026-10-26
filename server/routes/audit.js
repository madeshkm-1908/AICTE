const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken } = require('./auth');

// Middleware to enforce Senior Management access only
function requireSeniorManagement(req, res, next) {
  if (!req.user || req.user.role !== 'Senior Management') {
    return res.status(403).json({
      error: 'Access Denied: The Institutional Audit Trail and Governance Logs are restricted to Senior Management only.'
    });
  }
  next();
}

// GET /api/audit - Paginated, searchable audit log of all case actions
router.get('/', authenticateToken, requireSeniorManagement, async (req, res) => {
  try {
    const {
      search,
      bureau,
      action,
      date_from,
      date_to,
      page = 1,
      limit = 25
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (bureau && bureau !== 'ALL') {
      whereClause += ' AND ca.bureau = ?';
      params.push(bureau);
    }

    if (action && action !== 'ALL') {
      whereClause += ' AND ca.action LIKE ?';
      params.push(`%${action}%`);
    }

    if (date_from) {
      whereClause += ' AND date(ca.timestamp) >= ?';
      params.push(date_from);
    }

    if (date_to) {
      whereClause += ' AND date(ca.timestamp) <= ?';
      params.push(date_to);
    }

    if (search && search.trim() !== '') {
      const s = `%${search.trim()}%`;
      whereClause += ' AND (ca.case_id LIKE ? OR ca.by_officer LIKE ? OR ca.action LIKE ? OR ca.remarks LIKE ? OR i.name LIKE ? OR i.aicte_permanent_id LIKE ?)';
      params.push(s, s, s, s, s, s);
    }

    // 1. Total Count
    const countSql = `
      SELECT COUNT(ca.id) as total
      FROM case_actions ca
      JOIN cases c ON ca.case_id = c.case_id
      JOIN institutions i ON c.aicte_permanent_id = i.aicte_permanent_id
      ${whereClause}
    `;
    const totalRow = await db.prepare(countSql).get(...params);
    const total = totalRow ? parseInt(totalRow.total) : 0;

    // 2. Paginated Data
    const dataSql = `
      SELECT 
        ca.id,
        ca.case_id,
        ca.action,
        ca.by_officer,
        ca.bureau,
        ca.timestamp,
        ca.remarks,
        c.status as resulting_case_status,
        c.priority as case_priority,
        c.category as case_category,
        i.name as institution_name,
        i.aicte_permanent_id,
        i.state as institution_state,
        i.region as institution_region
      FROM case_actions ca
      JOIN cases c ON ca.case_id = c.case_id
      JOIN institutions i ON c.aicte_permanent_id = i.aicte_permanent_id
      ${whereClause}
      ORDER BY ca.timestamp DESC
      LIMIT ? OFFSET ?
    `;
    const logs = await db.prepare(dataSql).all(...params, parseInt(limit), offset);

    // 3. Quick Summary Stats
    const statsSql = `
      SELECT 
        COUNT(DISTINCT ca.by_officer) as distinct_officers,
        COUNT(DISTINCT ca.case_id) as distinct_cases,
        COUNT(DISTINCT c.aicte_permanent_id) as distinct_institutions
      FROM case_actions ca
      JOIN cases c ON ca.case_id = c.case_id
      JOIN institutions i ON c.aicte_permanent_id = i.aicte_permanent_id
      ${whereClause}
    `;
    const stats = await db.prepare(statsSql).get(...params);

    res.json({
      logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)) || 1
      },
      summary: stats
    });
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    res.status(500).json({ error: 'Failed to retrieve audit trail records' });
  }
});

// GET /api/audit/export - Download complete audit log dataset
router.get('/export', authenticateToken, requireSeniorManagement, async (req, res) => {
  try {
    const logs = await db.prepare(`
      SELECT 
        ca.id,
        ca.timestamp,
        ca.case_id,
        i.name as institution_name,
        i.aicte_permanent_id,
        ca.bureau,
        ca.by_officer,
        ca.action,
        ca.remarks,
        c.status as current_status
      FROM case_actions ca
      JOIN cases c ON ca.case_id = c.case_id
      JOIN institutions i ON c.aicte_permanent_id = i.aicte_permanent_id
      ORDER BY ca.timestamp DESC
      LIMIT 1000
    `).all();

    res.json({ logs });
  } catch (err) {
    console.error('Error exporting audit logs:', err);
    res.status(500).json({ error: 'Failed to export audit logs' });
  }
});

module.exports = router;
