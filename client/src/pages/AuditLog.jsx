import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import CaseDetailModal from '../components/CaseDetailModal';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  RotateCw, 
  Download, 
  Clock, 
  FileText, 
  Building, 
  User, 
  Lock,
  ChevronLeft,
  ChevronRight,
  Eye,
  Calendar
} from 'lucide-react';

export default function AuditLog() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [search, setSearch] = useState('');
  const [bureau, setBureau] = useState('ALL');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState(null);

  useEffect(() => {
    if (user && user.role === 'Senior Management') {
      loadAuditLogs();
    }
  }, [user, pagination.page, bureau, actionFilter, dateFrom, dateTo]);

  async function loadAuditLogs() {
    setLoading(true);
    setError('');
    try {
      const res = await api.getAuditLogs({
        page: pagination.page,
        limit: 25,
        search,
        bureau,
        action: actionFilter !== 'ALL' ? actionFilter : undefined,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined
      });
      setLogs(res.logs || []);
      setPagination(res.pagination || { page: 1, total: 0, totalPages: 1 });
      setSummary(res.summary || null);
    } catch (err) {
      setError(err.message || 'Failed to retrieve audit trail');
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    setPagination(p => ({ ...p, page: 1 }));
    loadAuditLogs();
  }

  async function handleExportCSV() {
    try {
      const res = await api.exportAuditLogs();
      const exportLogs = res.logs || [];
      if (exportLogs.length === 0) return;

      const headers = ['ID', 'Timestamp', 'Case_ID', 'Institution', 'Permanent_ID', 'Bureau', 'Officer', 'Action', 'Remarks', 'Status'];
      const rows = exportLogs.map(l => [
        l.id,
        `"${l.timestamp}"`,
        `"${l.case_id}"`,
        `"${(l.institution_name || '').replace(/"/g, '""')}"`,
        `"${l.aicte_permanent_id || ''}"`,
        `"${l.bureau}"`,
        `"${l.by_officer}"`,
        `"${(l.action || '').replace(/"/g, '""')}"`,
        `"${(l.remarks || '').replace(/"/g, '""')}"`,
        `"${l.current_status || ''}"`
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AICTE_Audit_Trail_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      alert('Failed to export audit logs');
    }
  }

  // Access check for non-Senior Management
  if (user && user.role !== 'Senior Management') {
    return (
      <div className="max-w-[800px] mx-auto p-10 bg-white rounded-card border border-card-border shadow-card text-center space-y-4 my-12">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto border border-rose-200">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-heading">Restricted Access Control</h2>
        <p className="text-xs text-body leading-relaxed max-w-lg mx-auto">
          The Central Governance Audit Trail and Officer Procedural Log is restricted strictly to <strong>Senior Management</strong> (Council Secretariat / Member Secretary). Your credential role is <strong>{user.role}</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-8">
      
      {/* Header Card */}
      <div className="bg-white border border-card-border rounded-card p-6 shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h1 className="text-lg font-bold text-heading">
                Central Officer Audit Trail & Governance Register
              </h1>
            </div>
            <p className="text-xs text-muted mt-1">
              Immutable chronological record of every procedural order, bureau transfer, escalation, and disposal action taken across AICTE
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-card-border rounded-lg text-xs font-semibold text-heading transition-smooth inline-flex items-center space-x-1.5 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export Audit Dataset</span>
            </button>
          </div>
        </div>

        {/* Filters */}
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            
            {/* Search Input */}
            <div className="relative min-w-56 flex-1 max-w-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search officer, case ID, remarks..."
                className="pl-8 pr-3 py-1.5 text-xs border border-card-border rounded-lg bg-white text-heading w-full focus:outline-hidden"
              />
            </div>

            {/* Bureau Filter */}
            <select
              value={bureau}
              onChange={(e) => { setBureau(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
              className="text-xs px-3 py-1.5 border border-card-border rounded-lg bg-white text-body focus:outline-hidden"
            >
              <option value="ALL">All Bureaus</option>
              <option value="Regulation Bureau">Regulation Bureau</option>
              <option value="Public Grievance Redressal Cell (PGRC)">PGRC</option>
              <option value="Approval Bureau">Approval Bureau</option>
              <option value="Southern Regional Office">Southern Regional Office</option>
            </select>

            {/* Action Type Filter */}
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
              className="text-xs px-3 py-1.5 border border-card-border rounded-lg bg-white text-body focus:outline-hidden"
            >
              <option value="ALL">All Actions</option>
              <option value="Registered">Registration</option>
              <option value="Transferred">Inter-Bureau Transfer</option>
              <option value="Escalated">Escalation</option>
              <option value="Disposed">Speaking Order / Disposal</option>
              <option value="Scrutiny">Scrutiny / Hearing</option>
            </select>

            <button
              type="submit"
              className="px-3.5 py-1.5 bg-aicte-navy text-white text-xs font-semibold rounded-lg hover:bg-aicte-navy-mid transition-smooth"
            >
              Filter
            </button>
          </div>

          <button
            type="button"
            onClick={loadAuditLogs}
            className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-50 border border-slate-200 rounded-lg ml-auto"
            title="Refresh Audit Log"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </form>
      </div>

      {/* Summary KPI Badges */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white border border-card-border rounded-card p-4 shadow-card">
            <span className="text-3xs font-bold text-muted uppercase tracking-wider block">Total Audited Events</span>
            <div className="text-2xl font-bold font-mono text-heading mt-1 tabular-nums">{pagination.total}</div>
          </div>
          <div className="bg-white border border-card-border rounded-card p-4 shadow-card">
            <span className="text-3xs font-bold text-muted uppercase tracking-wider block">Distinct Officers Active</span>
            <div className="text-2xl font-bold font-mono text-heading mt-1 tabular-nums">{summary.distinct_officers || 0}</div>
          </div>
          <div className="bg-white border border-card-border rounded-card p-4 shadow-card">
            <span className="text-3xs font-bold text-muted uppercase tracking-wider block">Institutions Scrutinized</span>
            <div className="text-2xl font-bold font-mono text-heading mt-1 tabular-nums">{summary.distinct_institutions || 0}</div>
          </div>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-white border border-card-border rounded-card shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Case ID</th>
                <th>Handling Officer</th>
                <th>Bureau</th>
                <th>Action Executed</th>
                <th>Resulting Status</th>
                <th>Official Remarks</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" className="text-center py-12 text-muted">
                    Loading chronological audit trail...
                  </td>
                </tr>
              ) : logs && logs.length > 0 ? (
                logs.map(log => (
                  <tr key={log.id}>
                    <td className="font-mono text-2xs text-muted whitespace-nowrap">
                      {log.timestamp}
                    </td>

                    <td>
                      <div className="font-mono font-bold text-xs text-aicte-navy whitespace-nowrap">
                        {log.case_id}
                      </div>
                      <div className="text-2xs text-muted truncate max-w-xs">
                        {log.institution_name}
                      </div>
                    </td>

                    <td className="text-xs font-semibold text-heading whitespace-nowrap">
                      {log.by_officer}
                    </td>

                    <td className="text-2xs font-medium text-body whitespace-nowrap">
                      {log.bureau}
                    </td>

                    <td>
                      <span className="font-semibold text-xs text-heading">
                        {log.action}
                      </span>
                    </td>

                    <td className="whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-full text-3xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {log.resulting_case_status}
                      </span>
                    </td>

                    <td className="text-2xs text-body max-w-sm">
                      <div className="truncate italic">
                        {log.remarks ? `"${log.remarks}"` : '-'}
                      </div>
                    </td>

                    <td className="text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedCaseId(log.case_id)}
                        className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-card-border rounded-lg transition-smooth inline-flex items-center space-x-1"
                      >
                        <Eye className="w-3 h-3 text-slate-500" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-muted">
                    No audit records found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-card-border flex items-center justify-between text-xs text-body">
            <span>
              Page <strong>{pagination.page}</strong> of <strong>{pagination.totalPages}</strong> ({pagination.total} records)
            </span>
            <div className="flex items-center space-x-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                className="px-3 py-1 bg-slate-50 border border-card-border rounded-lg disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                className="px-3 py-1 bg-slate-50 border border-card-border rounded-lg disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Case Detail Modal */}
      {selectedCaseId && (
        <CaseDetailModal
          caseId={selectedCaseId}
          onClose={() => setSelectedCaseId(null)}
          onActionLogged={loadAuditLogs}
        />
      )}

    </div>
  );
}
