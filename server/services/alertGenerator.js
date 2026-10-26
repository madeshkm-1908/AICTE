const db = require('../db/database');
const { detectOverlaps } = require('./overlapDetector');
const { broadcastEvent } = require('../events');

/**
 * Scan database and generate alerts without duplicates.
 * Alert types:
 * - 'Cross-Bureau Overlap'
 * - 'SLA Breached' (Overdue)
 * - 'SLA Approaching' (Within 7 days of deadline)
 * - 'Pending Reminder' (Pending > 30 days without movement)
 * - 'Escalation' (Urgent escalated case)
 */
async function generateAlerts() {
  let createdCount = 0;

  const checkStmt = db.prepare(`
    SELECT id FROM alerts 
    WHERE alert_type = ? 
      AND (
        (case_id IS NOT NULL AND case_id = ?) 
        OR 
        (case_id IS NULL AND aicte_permanent_id IS NOT NULL AND aicte_permanent_id = ?)
      )
      AND is_resolved = 0
  `);

  const insertStmt = db.prepare(`
    INSERT INTO alerts (alert_type, title, description, severity, aicte_permanent_id, case_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  // 1. Cross-Bureau Overlaps
  try {
    const overlaps = await detectOverlaps();
    for (const item of overlaps) {
      if (item.resolution_status === 'DISMISSED') continue;

      const existing = await checkStmt.get('Cross-Bureau Overlap', null, item.aicte_permanent_id);
      if (!existing) {
        const firstCase = item.all_cases && item.all_cases.length > 0 ? item.all_cases[0].case_id : null;
        await insertStmt.run(
          'Cross-Bureau Overlap',
          `Coordination Required: ${item.institution_name.slice(0, 50)}`,
          `Institution has ${item.total_open_cases} open cases across ${item.rb_open_count} RB and ${item.pgrc_open_count} PGRC channels. (${item.confidence_label})`,
          item.has_urgent ? 'Critical' : 'Warning',
          item.aicte_permanent_id,
          firstCase
        );
        createdCount++;
      }
    }
  } catch (err) {
    console.error('Error in overlap alert generator:', err);
  }

  // 2. SLA Breached (Overdue cases)
  try {
    const overdueCases = await db.prepare(`
      SELECT c.case_id, c.category, c.bureau, c.expected_disposal_date, c.aicte_permanent_id, i.name as institution_name
      FROM cases c
      JOIN institutions i ON c.aicte_permanent_id = i.aicte_permanent_id
      WHERE c.status != 'Disposed' 
        AND c.expected_disposal_date < date('now')
    `).all();

    for (const c of overdueCases) {
      const existing = await checkStmt.get('SLA Breached', c.case_id, null);
      if (!existing) {
        await insertStmt.run(
          'SLA Breached',
          `SLA Overdue: Case ${c.case_id}`,
          `Case on '${c.category}' at ${c.institution_name} has exceeded statutory disposal target (${c.expected_disposal_date}) under ${c.bureau}.`,
          'Critical',
          c.aicte_permanent_id,
          c.case_id
        );
        createdCount++;
      }
    }
  } catch (err) {
    console.error('Error generating SLA Breached alerts:', err);
  }

  // 3. SLA Approaching (Within 7 days of target date)
  try {
    const approachingCases = await db.prepare(`
      SELECT c.case_id, c.category, c.bureau, c.expected_disposal_date, c.aicte_permanent_id, i.name as institution_name
      FROM cases c
      JOIN institutions i ON c.aicte_permanent_id = i.aicte_permanent_id
      WHERE c.status != 'Disposed' 
        AND c.expected_disposal_date >= date('now')
        AND c.expected_disposal_date <= date('now', '+7 days')
    `).all();

    for (const c of approachingCases) {
      const existing = await checkStmt.get('SLA Approaching', c.case_id, null);
      if (!existing) {
        await insertStmt.run(
          'SLA Approaching',
          `SLA Approaching: Case ${c.case_id}`,
          `Grievance resolution due in less than 7 days (${c.expected_disposal_date}) for ${c.institution_name} (${c.bureau}).`,
          'Warning',
          c.aicte_permanent_id,
          c.case_id
        );
        createdCount++;
      }
    }
  } catch (err) {
    console.error('Error generating SLA Approaching alerts:', err);
  }

  // 4. Pending Reminder (Cases pending for > 30 days without movement)
  try {
    const stalledCases = await db.prepare(`
      SELECT c.case_id, c.category, c.bureau, c.received_date, c.aicte_permanent_id, i.name as institution_name
      FROM cases c
      JOIN institutions i ON c.aicte_permanent_id = i.aicte_permanent_id
      WHERE c.status = 'Pending' 
        AND c.received_date < date('now', '-30 days')
        AND (c.last_action_date IS NULL OR c.last_action_date < date('now', '-21 days'))
    `).all();

    for (const c of stalledCases) {
      const existing = await checkStmt.get('Pending Reminder', c.case_id, null);
      if (!existing) {
        await insertStmt.run(
          'Pending Reminder',
          `Stalled Preliminary Scrutiny: ${c.case_id}`,
          `Case pending for over 30 days without procedural progression at ${c.institution_name} (${c.bureau}).`,
          'Warning',
          c.aicte_permanent_id,
          c.case_id
        );
        createdCount++;
      }
    }
  } catch (err) {
    console.error('Error generating Pending Reminder alerts:', err);
  }

  // 5. Escalation Alerts (Cases marked 'Escalated')
  try {
    const escalatedCases = await db.prepare(`
      SELECT c.case_id, c.category, c.bureau, c.aicte_permanent_id, i.name as institution_name
      FROM cases c
      JOIN institutions i ON c.aicte_permanent_id = i.aicte_permanent_id
      WHERE c.status = 'Escalated'
    `).all();

    for (const c of escalatedCases) {
      const existing = await checkStmt.get('Escalation', c.case_id, null);
      if (!existing) {
        await insertStmt.run(
          'Escalation',
          `Council Escalation: ${c.case_id}`,
          `High-priority docket escalated for Standing Hearing Committee / Council adjudication at ${c.institution_name}.`,
          'Critical',
          c.aicte_permanent_id,
          c.case_id
        );
        createdCount++;
      }
    }
  } catch (err) {
    console.error('Error generating Escalation alerts:', err);
  }

  if (createdCount > 0) {
    broadcastEvent('ALERTS_GENERATED', { createdCount, timestamp: new Date().toISOString() });
  }

  return { createdCount };
}

// Start recurring scheduled job (every 60 seconds)
let syncInterval = null;
function startAlertScheduler(intervalMs = 60000) {
  if (syncInterval) clearInterval(syncInterval);
  // Run once immediately on start
  generateAlerts().catch(e => console.error('Initial alert generation error:', e));

  syncInterval = setInterval(() => {
    generateAlerts().catch(e => console.error('Scheduled alert generation error:', e));
  }, intervalMs);
}

module.exports = {
  generateAlerts,
  startAlertScheduler
};
