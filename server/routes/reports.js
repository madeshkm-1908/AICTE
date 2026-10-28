const express = require('express');
const router = express.Router();
const db = require('../db/database');
const { optionalAuth, getUserRegion } = require('./auth');
const { detectOverlaps } = require('../services/overlapDetector');

// Block Complainants from accessing official reports
router.use(optionalAuth, (req, res, next) => {
  if (req.user && req.user.role === 'Complainant') {
    return res.status(403).json({ error: 'Access Denied: Complainant accounts are restricted from accessing official reports.' });
  }
  next();
});

// Helper to construct date filters
function buildDateFilter(from, to, field = 'c.received_date') {
  let sql = '';
  const params = [];
  if (from) {
    sql += ` AND ${field} >= ?`;
    params.push(from);
  }
  if (to) {
    sql += ` AND ${field} <= ?`;
    params.push(to);
  }
  return { sql, params };
}

// GET /api/reports - Fetch report dataset by type
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { type = 'bureau', from, to, bureau, region } = req.query;
    const userRegion = getUserRegion(req.user);
    const effectiveRegion = userRegion || (region !== 'ALL' ? region : null);

    const dateFilter = buildDateFilter(from, to, 'c.received_date');
    let baseWhere = 'WHERE 1=1' + dateFilter.sql;
    const baseParams = [...dateFilter.params];

    if (effectiveRegion) {
      baseWhere += ' AND i.region = ?';
      baseParams.push(effectiveRegion);
    }

    if (bureau && bureau !== 'ALL') {
      baseWhere += ' AND c.bureau = ?';
      baseParams.push(bureau);
    }

    // 1. Bureau-wise Performance Report
    if (type === 'bureau') {
      const sql = `
        SELECT 
          c.bureau,
          COUNT(c.case_id) as total_cases,
          SUM(CASE WHEN c.status = 'Pending' THEN 1 ELSE 0 END) as pending_cases,
          SUM(CASE WHEN c.status = 'Under Process' THEN 1 ELSE 0 END) as under_process,
          SUM(CASE WHEN c.status = 'Disposed' THEN 1 ELSE 0 END) as disposed_cases,
          SUM(CASE WHEN c.status = 'Transferred' THEN 1 ELSE 0 END) as transferred_cases,
          SUM(CASE WHEN c.status = 'Escalated' THEN 1 ELSE 0 END) as escalated_cases,
          SUM(CASE WHEN c.expected_disposal_date < date('now') AND c.status != 'Disposed' THEN 1 ELSE 0 END) as overdue_cases,
          ROUND(
            (CAST(SUM(CASE WHEN c.status = 'Disposed' THEN 1 ELSE 0 END) AS NUMERIC) / 
             NULLIF(COUNT(c.case_id), 0)) * 100, 1
          ) as disposal_rate_pct
        FROM cases c
        JOIN institutions i ON c.aicte_permanent_id = i.aicte_permanent_id
        ${baseWhere}
        GROUP BY c.bureau
        ORDER BY total_cases DESC
      `;
      const table = await db.prepare(sql).all(...baseParams);

      const totalCases = table.reduce((a, b) => a + parseInt(b.total_cases || 0), 0);
      const totalDisposed = table.reduce((a, b) => a + parseInt(b.disposed_cases || 0), 0);
      const totalOverdue = table.reduce((a, b) => a + parseInt(b.overdue_cases || 0), 0);

      return res.json({
        type: 'bureau',
        title: 'Bureau-Wise Grievance Workload & Disposal Velocity',
        kpis: {
          total_cases: totalCases,
          total_disposed: totalDisposed,
          total_overdue: totalOverdue,
          avg_disposal_rate: totalCases ? Math.round((totalDisposed / totalCases) * 100) : 0
        },
        chartData: table.map(r => ({
          name: r.bureau,
          total: parseInt(r.total_cases),
          disposed: parseInt(r.disposed_cases),
          active: parseInt(r.total_cases) - parseInt(r.disposed_cases),
          overdue: parseInt(r.overdue_cases),
          rate: parseFloat(r.disposal_rate_pct || 0)
        })),
        table
      });
    }

    // 2. Region-wise Grievance Distribution
    if (type === 'region') {
      const sql = `
        SELECT 
          i.region,
          COUNT(DISTINCT i.aicte_permanent_id) as institution_count,
          COUNT(c.case_id) as total_cases,
          SUM(CASE WHEN c.status != 'Disposed' THEN 1 ELSE 0 END) as active_cases,
          SUM(CASE WHEN c.status = 'Disposed' THEN 1 ELSE 0 END) as disposed_cases,
          SUM(CASE WHEN c.expected_disposal_date < date('now') AND c.status != 'Disposed' THEN 1 ELSE 0 END) as overdue_cases,
          SUM(CASE WHEN c.priority = 'Urgent' THEN 1 ELSE 0 END) as urgent_cases
        FROM institutions i
        LEFT JOIN cases c ON i.aicte_permanent_id = c.aicte_permanent_id
        ${baseWhere.replace('WHERE 1=1', 'WHERE 1=1')}
        GROUP BY i.region
        ORDER BY total_cases DESC
      `;
      const table = await db.prepare(sql).all(...baseParams);

      const totalInst = table.reduce((a, b) => a + parseInt(b.institution_count || 0), 0);
      const totalCases = table.reduce((a, b) => a + parseInt(b.total_cases || 0), 0);
      const totalOverdue = table.reduce((a, b) => a + parseInt(b.overdue_cases || 0), 0);

      return res.json({
        type: 'region',
        title: 'Regional Office Jurisdictional Caseload & Compliance Analysis',
        kpis: {
          total_regions: table.length,
          total_institutions: totalInst,
          total_cases: totalCases,
          total_overdue: totalOverdue
        },
        chartData: table.map(r => ({
          name: r.region,
          institutions: parseInt(r.institution_count),
          total: parseInt(r.total_cases),
          active: parseInt(r.active_cases),
          disposed: parseInt(r.disposed_cases),
          overdue: parseInt(r.overdue_cases)
        })),
        table
      });
    }

    // 3. Institution-wise Complaint History
    if (type === 'institution') {
      const sql = `
        SELECT 
          i.aicte_permanent_id,
          i.name as institution_name,
          i.state,
          i.region,
          i.type,
          COUNT(c.case_id) as total_cases,
          SUM(CASE WHEN c.status != 'Disposed' THEN 1 ELSE 0 END) as active_cases,
          SUM(CASE WHEN c.status = 'Disposed' THEN 1 ELSE 0 END) as disposed_cases,
          SUM(CASE WHEN c.bureau = 'Regulation Bureau' AND c.status != 'Disposed' THEN 1 ELSE 0 END) as rb_active,
          SUM(CASE WHEN c.bureau = 'PGRC' AND c.status != 'Disposed' THEN 1 ELSE 0 END) as pgrc_active,
          SUM(CASE WHEN c.expected_disposal_date < date('now') AND c.status != 'Disposed' THEN 1 ELSE 0 END) as overdue_cases
        FROM institutions i
        JOIN cases c ON i.aicte_permanent_id = c.aicte_permanent_id
        ${baseWhere}
        GROUP BY i.aicte_permanent_id, i.name, i.state, i.region, i.type
        ORDER BY active_cases DESC, total_cases DESC
        LIMIT 100
      `;
      const table = await db.prepare(sql).all(...baseParams);

      const top10 = table.slice(0, 10);
      const totalOverlapping = table.filter(r => parseInt(r.rb_active || 0) > 0 && parseInt(r.pgrc_active || 0) > 0).length;

      return res.json({
        type: 'institution',
        title: 'Institutional Complaint Frequency & High-Risk Institutional Ranking',
        kpis: {
          total_institutions_with_cases: table.length,
          dual_scrutiny_institutions: totalOverlapping,
          highest_case_count: table.length > 0 ? parseInt(table[0].total_cases) : 0
        },
        chartData: top10.map(r => ({
          name: r.institution_name.length > 22 ? r.institution_name.slice(0, 20) + '...' : r.institution_name,
          total: parseInt(r.total_cases),
          active: parseInt(r.active_cases),
          disposed: parseInt(r.disposed_cases),
          overdue: parseInt(r.overdue_cases)
        })),
        table
      });
    }

    // 4. Pending-case Ageing Analysis (0-30, 31-60, 61-90, 90+ days)
    if (type === 'ageing') {
      const sql = `
        SELECT 
          c.bureau,
          SUM(CASE WHEN CAST(julianday('now') - julianday(c.received_date) AS INT) <= 30 THEN 1 ELSE 0 END) as age_0_30,
          SUM(CASE WHEN CAST(julianday('now') - julianday(c.received_date) AS INT) BETWEEN 31 AND 60 THEN 1 ELSE 0 END) as age_31_60,
          SUM(CASE WHEN CAST(julianday('now') - julianday(c.received_date) AS INT) BETWEEN 61 AND 90 THEN 1 ELSE 0 END) as age_61_90,
          SUM(CASE WHEN CAST(julianday('now') - julianday(c.received_date) AS INT) > 90 THEN 1 ELSE 0 END) as age_90_plus,
          COUNT(c.case_id) as total_active,
          ROUND(AVG(CAST(julianday('now') - julianday(c.received_date) AS INT)), 1) as avg_days_pending,
          MAX(CAST(julianday('now') - julianday(c.received_date) AS INT)) as max_days_pending
        FROM cases c
        JOIN institutions i ON c.aicte_permanent_id = i.aicte_permanent_id
        ${baseWhere} AND c.status != 'Disposed'
        GROUP BY c.bureau
        ORDER BY total_active DESC
      `;
      const table = await db.prepare(sql).all(...baseParams);

      const totalActive = table.reduce((a, b) => a + parseInt(b.total_active || 0), 0);
      const total90Plus = table.reduce((a, b) => a + parseInt(b.age_90_plus || 0), 0);
      const total60Plus = table.reduce((a, b) => a + parseInt(b.age_61_90 || 0) + parseInt(b.age_90_plus || 0), 0);

      // Aggregate bracket counts for pie/bar chart
      const brackets = [
        { bracket: '0-30 Days (Fresh)', count: table.reduce((a, b) => a + parseInt(b.age_0_30 || 0), 0), color: '#16A34A' },
        { bracket: '31-60 Days (Maturing)', count: table.reduce((a, b) => a + parseInt(b.age_31_60 || 0), 0), color: '#2563EB' },
        { bracket: '61-90 Days (Critical SLA)', count: table.reduce((a, b) => a + parseInt(b.age_61_90 || 0), 0), color: '#F59E0B' },
        { bracket: '90+ Days (Severe Breach)', count: table.reduce((a, b) => a + parseInt(b.age_90_plus || 0), 0), color: '#DC2626' }
      ];

      return res.json({
        type: 'ageing',
        title: 'Active Case Ageing Profile (0-30, 31-60, 61-90, 90+ Days)',
        kpis: {
          total_open_cases: totalActive,
          cases_over_60_days: total60Plus,
          cases_over_90_days: total90Plus,
          severe_backlog_pct: totalActive ? Math.round((total90Plus / totalActive) * 100) : 0
        },
        chartData: brackets,
        table
      });
    }

    // 5. Disposal Rate & Turnaround Velocity
    if (type === 'disposal_rate') {
      const sql = `
        SELECT 
          c.bureau,
          COUNT(c.case_id) as total_inflow,
          SUM(CASE WHEN c.status = 'Disposed' THEN 1 ELSE 0 END) as total_disposed,
          SUM(CASE WHEN c.status != 'Disposed' THEN 1 ELSE 0 END) as active_backlog,
          ROUND(
            (CAST(SUM(CASE WHEN c.status = 'Disposed' THEN 1 ELSE 0 END) AS NUMERIC) / 
             NULLIF(COUNT(c.case_id), 0)) * 100, 1
          ) as disposal_rate_pct,
          SUM(CASE WHEN c.status = 'Disposed' AND c.last_action_date IS NOT NULL 
              THEN CAST(julianday(c.last_action_date) - julianday(c.received_date) AS INT) 
              ELSE 0 END) as total_resolved_days
        FROM cases c
        JOIN institutions i ON c.aicte_permanent_id = i.aicte_permanent_id
        ${baseWhere}
        GROUP BY c.bureau
        ORDER BY disposal_rate_pct DESC
      `;
      const table = await db.prepare(sql).all(...baseParams);

      const totalInflow = table.reduce((a, b) => a + parseInt(b.total_inflow || 0), 0);
      const totalDisposed = table.reduce((a, b) => a + parseInt(b.total_disposed || 0), 0);
      const overallRate = totalInflow ? Math.round((totalDisposed / totalInflow) * 100) : 0;

      return res.json({
        type: 'disposal_rate',
        title: 'Disposal Rate, Case Resolution Velocity & Clearance Ratios',
        kpis: {
          total_inflow: totalInflow,
          total_disposed: totalDisposed,
          active_backlog: totalInflow - totalDisposed,
          overall_disposal_rate: overallRate
        },
        chartData: table.map(r => ({
          name: r.bureau,
          rate: parseFloat(r.disposal_rate_pct || 0),
          disposed: parseInt(r.total_disposed),
          backlog: parseInt(r.active_backlog)
        })),
        table
      });
    }

    // 6. Overlapping Cases Audit Report
    if (type === 'overlaps') {
      const overlaps = await detectOverlaps();
      const filteredOverlaps = effectiveRegion 
        ? overlaps.filter(o => o.region === effectiveRegion)
        : overlaps;

      const totalOverlapping = filteredOverlaps.length;
      const totalCasesInvolved = filteredOverlaps.reduce((a, b) => a + parseInt(b.total_open_cases || 0), 0);
      const coordinatedCount = filteredOverlaps.filter(o => o.resolution_status === 'COORDINATED').length;
      const pendingCoordination = filteredOverlaps.filter(o => o.resolution_status === 'PENDING').length;

      // Regional grouping for chart
      const regionCounts = {};
      filteredOverlaps.forEach(o => {
        regionCounts[o.region] = (regionCounts[o.region] || 0) + 1;
      });
      const chartData = Object.keys(regionCounts).map(r => ({
        name: r,
        count: regionCounts[r]
      }));

      return res.json({
        type: 'overlaps',
        title: 'Cross-Bureau Redundancy & Harmonization Status Report',
        kpis: {
          total_flagged_institutions: totalOverlapping,
          total_cases_involved: totalCasesInvolved,
          coordinated_institutions: coordinatedCount,
          pending_coordination: pendingCoordination
        },
        chartData,
        table: filteredOverlaps.map(o => ({
          aicte_permanent_id: o.aicte_permanent_id,
          institution_name: o.institution_name,
          state: o.state,
          region: o.region,
          total_open_cases: o.total_open_cases,
          rb_open_count: o.rb_open_count,
          pgrc_open_count: o.pgrc_open_count,
          confidence_label: o.confidence_label,
          resolution_status: o.resolution_status,
          has_urgent: o.has_urgent ? 'Yes' : 'No'
        }))
      });
    }

    // 7. Monthly & Quarterly Performance Trend
    if (type === 'performance') {
      const sql = `
        SELECT 
          strftime('%Y-%m', c.received_date) as period,
          COUNT(c.case_id) as lodged_count,
          SUM(CASE WHEN c.status = 'Disposed' THEN 1 ELSE 0 END) as disposed_count,
          SUM(CASE WHEN c.status = 'Transferred' THEN 1 ELSE 0 END) as transferred_count,
          SUM(CASE WHEN c.status = 'Escalated' THEN 1 ELSE 0 END) as escalated_count,
          SUM(CASE WHEN c.expected_disposal_date < date('now') AND c.status != 'Disposed' THEN 1 ELSE 0 END) as overdue_count
        FROM cases c
        JOIN institutions i ON c.aicte_permanent_id = i.aicte_permanent_id
        ${baseWhere}
        GROUP BY strftime('%Y-%m', c.received_date)
        ORDER BY period ASC
      `;
      const table = await db.prepare(sql).all(...baseParams);

      const totalLodged = table.reduce((a, b) => a + parseInt(b.lodged_count || 0), 0);
      const totalResolved = table.reduce((a, b) => a + parseInt(b.disposed_count || 0), 0);

      return res.json({
        type: 'performance',
        title: 'Monthly & Periodic Institutional Complaint Inflow vs Resolution Trend',
        kpis: {
          total_lodged: totalLodged,
          total_resolved: totalResolved,
          net_backlog_delta: totalLodged - totalResolved,
          average_monthly_intake: table.length ? Math.round(totalLodged / table.length) : 0
        },
        chartData: table.map(r => ({
          name: r.period,
          lodged: parseInt(r.lodged_count),
          resolved: parseInt(r.disposed_count),
          overdue: parseInt(r.overdue_count)
        })),
        table
      });
    }

    return res.status(400).json({ error: `Unknown report type: ${type}` });
  } catch (err) {
    console.error('Error generating report:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
});

module.exports = router;
