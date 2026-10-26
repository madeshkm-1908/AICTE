const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { authenticateToken, optionalAuth, getUserRegion } = require('./auth');

// GET /api/dashboard/summary - All main dashboard metrics computed from database
router.get('/summary', optionalAuth, async (req, res) => {
  try {
    const bureauFilter = req.query.bureau; // optional filter
    const regionFilter = req.query.region; // optional filter
    const userRegion = getUserRegion(req.user);

    let baseFilter = "WHERE 1=1";
    const params = [];

    if (bureauFilter && bureauFilter !== 'ALL') {
      baseFilter += " AND c.bureau = ?";
      params.push(bureauFilter);
    }

    if (userRegion) {
      baseFilter += " AND i.region = ?";
      params.push(userRegion);
    } else if (regionFilter && regionFilter !== 'ALL') {
      baseFilter += " AND i.region = ?";
      params.push(regionFilter);
    }

    // 1. KPI Counts
    const kpiSql = `
      SELECT 
        COUNT(c.case_id) as total_cases,
        SUM(CASE WHEN c.status = 'Pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN c.status = 'Under Process' THEN 1 ELSE 0 END) as under_process,
        SUM(CASE WHEN c.status = 'Disposed' THEN 1 ELSE 0 END) as disposed,
        SUM(CASE WHEN c.status = 'Transferred' THEN 1 ELSE 0 END) as transferred,
        SUM(CASE WHEN c.status = 'Escalated' THEN 1 ELSE 0 END) as escalated,
        SUM(CASE WHEN c.expected_disposal_date < date('now') AND c.status != 'Disposed' THEN 1 ELSE 0 END) as overdue,
        SUM(CASE WHEN c.expected_disposal_date >= date('now') AND c.expected_disposal_date <= date('now', '+7 days') AND c.status != 'Disposed' THEN 1 ELSE 0 END) as approaching_sla,
        SUM(CASE WHEN c.priority IN ('Urgent', 'High') AND c.status != 'Disposed' THEN 1 ELSE 0 END) as high_priority_active
      FROM cases c
      JOIN institutions i ON c.aicte_permanent_id = i.aicte_permanent_id
      ${baseFilter}
    `;
    const kpis = await db.prepare(kpiSql).get(...params);

    // 2. Status Distribution Chart
    const statusSql = `
      SELECT c.status, COUNT(c.case_id) as count
      FROM cases c
      JOIN institutions i ON c.aicte_permanent_id = i.aicte_permanent_id
      ${baseFilter}
      GROUP BY c.status
    `;
    const statusData = await db.prepare(statusSql).all(...params);

    // 3. Bureau-wise Workload Chart
    const bureauSql = `
      SELECT 
        c.bureau,
        COUNT(c.case_id) as total,
        SUM(CASE WHEN c.status != 'Disposed' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN c.status = 'Disposed' THEN 1 ELSE 0 END) as disposed,
        SUM(CASE WHEN c.expected_disposal_date < date('now') AND c.status != 'Disposed' THEN 1 ELSE 0 END) as overdue
      FROM cases c
      JOIN institutions i ON c.aicte_permanent_id = i.aicte_permanent_id
      ${baseFilter}
      GROUP BY c.bureau
      ORDER BY total DESC
    `;
    const bureauData = await db.prepare(bureauSql).all(...params);

    // 4. Region-wise Case Volume Chart
    const regionSql = `
      SELECT 
        i.region,
        COUNT(c.case_id) as total_cases,
        COUNT(DISTINCT i.aicte_permanent_id) as institution_count,
        SUM(CASE WHEN c.status != 'Disposed' THEN 1 ELSE 0 END) as active_cases,
        SUM(CASE WHEN c.expected_disposal_date < date('now') AND c.status != 'Disposed' THEN 1 ELSE 0 END) as overdue_cases
      FROM institutions i
      LEFT JOIN cases c ON i.aicte_permanent_id = c.aicte_permanent_id
      GROUP BY i.region
      ORDER BY total_cases DESC
    `;
    const regionData = await db.prepare(regionSql).all();

    // 5. Monthly Filing & Disposal Trend
    const trendSql = `
      SELECT 
        strftime('%Y-%m', c.received_date) as month,
        COUNT(c.case_id) as received,
        SUM(CASE WHEN c.status = 'Disposed' THEN 1 ELSE 0 END) as resolved
      FROM cases c
      JOIN institutions i ON c.aicte_permanent_id = i.aicte_permanent_id
      ${baseFilter}
      GROUP BY strftime('%Y-%m', c.received_date)
      ORDER BY month ASC
    `;
    const monthlyTrend = await db.prepare(trendSql).all(...params);

    // 6. Potential Overlapping Cases (Crucial for SIH Problem Statement)
    // Institutions that have concurrent open cases in BOTH Regulation Bureau and PGRC
    const overlapSql = `
      SELECT 
        i.aicte_permanent_id,
        i.name as institution_name,
        i.state,
        i.region,
        i.type,
        COUNT(DISTINCT c.case_id) as total_open_cases,
        SUM(CASE WHEN c.bureau = 'Regulation Bureau' THEN 1 ELSE 0 END) as rb_open_count,
        SUM(CASE WHEN c.bureau = 'PGRC' THEN 1 ELSE 0 END) as pgrc_open_count,
        SUM(CASE WHEN c.bureau NOT IN ('Regulation Bureau', 'PGRC') THEN 1 ELSE 0 END) as other_open_count,
        MAX(CASE WHEN c.priority = 'Urgent' THEN 1 ELSE 0 END) as has_urgent
      FROM institutions i
      JOIN cases c ON i.aicte_permanent_id = c.aicte_permanent_id
      WHERE c.status != 'Disposed' ${userRegion ? 'AND i.region = ?' : ''}
      GROUP BY i.aicte_permanent_id, i.name, i.state, i.region, i.type
      HAVING SUM(CASE WHEN c.bureau = 'Regulation Bureau' THEN 1 ELSE 0 END) > 0 
         AND SUM(CASE WHEN c.bureau = 'PGRC' THEN 1 ELSE 0 END) > 0
      ORDER BY total_open_cases DESC, i.name ASC
    `;
    const overlappingInstitutions = userRegion 
      ? await db.prepare(overlapSql).all(userRegion) 
      : await db.prepare(overlapSql).all();

    // Attach active cases list to top overlapping institutions for immediate preview
    const overlapWithDetails = await Promise.all(overlappingInstitutions.slice(0, 10).map(async inst => {
      const activeCases = await db.prepare(`
        SELECT case_id, category, bureau, status, received_date, assigned_officer, priority, expected_disposal_date
        FROM cases
        WHERE aicte_permanent_id = ? AND status != 'Disposed'
        ORDER BY bureau ASC, received_date ASC
      `).all(inst.aicte_permanent_id);

      return {
        ...inst,
        cases: activeCases
      };
    }));

    // 7. Recent Activity List
    const activitySql = `
      SELECT 
        ca.id,
        ca.case_id,
        ca.action,
        ca.by_officer,
        ca.bureau,
        ca.timestamp,
        ca.remarks,
        c.status,
        c.priority,
        c.category,
        i.name as institution_name,
        i.aicte_permanent_id
      FROM case_actions ca
      JOIN cases c ON ca.case_id = c.case_id
      JOIN institutions i ON c.aicte_permanent_id = i.aicte_permanent_id
      ORDER BY ca.timestamp DESC
      LIMIT 12
    `;
    const recentActivity = await db.prepare(activitySql).all();

    // 8. Critical System Alerts
    const alertsSql = `
      SELECT id, alert_type, title, description, severity, aicte_permanent_id, case_id, created_at
      FROM alerts
      WHERE is_resolved = 0
      ORDER BY 
        CASE severity WHEN 'Critical' THEN 1 WHEN 'Warning' THEN 2 ELSE 3 END,
        created_at DESC
      LIMIT 6
    `;
    const activeAlerts = await db.prepare(alertsSql).all();

    res.json({
      timestamp: new Date().toISOString(),
      kpis: {
        total: kpis.total_cases || 0,
        pending: kpis.pending || 0,
        under_process: kpis.under_process || 0,
        disposed: kpis.disposed || 0,
        transferred: kpis.transferred || 0,
        escalated: kpis.escalated || 0,
        overdue: kpis.overdue || 0,
        approaching_sla: kpis.approaching_sla || 0,
        high_priority_active: kpis.high_priority_active || 0,
        overlapping_institutions_count: overlappingInstitutions.length
      },
      charts: {
        statusDistribution: statusData,
        bureauWorkload: bureauData,
        regionDistribution: regionData,
        monthlyTrend: monthlyTrend
      },
      overlappingCases: {
        count: overlappingInstitutions.length,
        items: overlapWithDetails
      },
      recentActivity,
      activeAlerts
    });
  } catch (err) {
    console.error('Error in /api/dashboard/summary:', err);
    res.status(500).json({ error: 'Internal server error while computing dashboard statistics' });
  }
});

module.exports = router;
