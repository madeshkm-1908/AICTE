import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import CaseDetailModal from '../components/CaseDetailModal';
import { 
  Building2, 
  MapPin, 
  Mail, 
  Calendar, 
  Layers, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  ArrowLeft,
  Eye,
  Plus,
  ShieldCheck,
  Activity
} from 'lucide-react';

export default function InstitutionProfile({ triggerRefresh }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCaseId, setSelectedCaseId] = useState(null);

  useEffect(() => {
    if (!id) return;
    loadProfile();
  }, [id, triggerRefresh]);

  async function loadProfile() {
    setLoading(true);
    setError('');
    try {
      const res = await api.getInstitutionDetail(id);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load institution profile');
    } finally {
      setLoading(false);
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' };
      case 'Under Process': return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' };
      case 'Disposed': return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' };
      case 'Transferred': return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' };
      case 'Escalated': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' };
      default: return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-500' };
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-[1400px] mx-auto pb-8">
        <div className="h-40 skeleton rounded-card" />
        <div className="grid grid-cols-4 gap-4">
          <div className="h-24 skeleton rounded-card" />
          <div className="h-24 skeleton rounded-card" />
          <div className="h-24 skeleton rounded-card" />
          <div className="h-24 skeleton rounded-card" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-[1400px] mx-auto p-8 text-center bg-white rounded-card border border-card-border shadow-card">
        <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <h2 className="text-base font-bold text-heading">Institution Not Found</h2>
        <p className="text-xs text-muted mt-1">{error || 'No institution matching the specified ID'}</p>
        <button
          onClick={() => navigate('/institutions')}
          className="mt-4 px-4 py-2 bg-aicte-navy text-white text-xs font-semibold rounded-lg"
        >
          Back to Directory
        </button>
      </div>
    );
  }

  const { institution, summary, cases, timeline } = data;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-8">
      
      {/* Top Navigation */}
      <button
        onClick={() => navigate('/institutions')}
        className="inline-flex items-center space-x-1.5 text-xs font-medium text-body hover:text-heading transition-smooth"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Institutions Register</span>
      </button>

      {/* Institution Header Card */}
      <div className="bg-white border border-card-border rounded-card p-6 shadow-card space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2.5">
              <span className="font-mono text-xs font-bold px-2.5 py-1 bg-slate-100 text-aicte-navy border border-slate-200 rounded-md shadow-2xs">
                Permanent ID: {institution.aicte_permanent_id}
              </span>
              <span className="text-2xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                {institution.type}
              </span>
              {summary.is_overlapping && (
                <span className="text-2xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  Dual-Bureau Scrutiny Active
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-heading tracking-tight">
              {institution.name}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-body pt-1">
              <div className="flex items-center space-x-1 text-muted">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{institution.address}, {institution.state} ({institution.region} Region)</span>
              </div>
              {institution.contact_email && (
                <div className="flex items-center space-x-1 text-muted font-mono">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{institution.contact_email}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigate(`/cases?search=${encodeURIComponent(institution.name)}`)}
              className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-card-border text-xs font-semibold text-heading rounded-lg transition-smooth"
            >
              Filter in All Cases
            </button>
          </div>
        </div>
      </div>

      {/* Small Status Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-card-border rounded-card p-4 shadow-card">
          <span className="text-3xs font-bold text-muted uppercase tracking-wider block">
            Total Filed Inquiries
          </span>
          <div className="text-2xl font-bold font-mono text-heading mt-1 tabular-nums">
            {summary.total_cases}
          </div>
          <div className="text-2xs text-muted mt-0.5">Cumulative docket history</div>
        </div>

        <div className="bg-white border border-card-border rounded-card p-4 shadow-card">
          <span className="text-3xs font-bold text-blue-600 uppercase tracking-wider block">
            Active Open Cases
          </span>
          <div className="text-2xl font-bold font-mono text-blue-700 mt-1 tabular-nums">
            {summary.active_cases}
          </div>
          <div className="text-2xs text-muted mt-0.5">{summary.rb_active} RB • {summary.pgrc_active} PGRC</div>
        </div>

        <div className="bg-white border border-card-border rounded-card p-4 shadow-card">
          <span className="text-3xs font-bold text-emerald-600 uppercase tracking-wider block">
            Disposed & Closed
          </span>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1 tabular-nums">
            {summary.disposed_cases}
          </div>
          <div className="text-2xs text-muted mt-0.5">Speaking orders finalized</div>
        </div>

        <div className="bg-white border border-card-border rounded-card p-4 shadow-card">
          <span className="text-3xs font-bold text-rose-600 uppercase tracking-wider block">
            SLA Breached
          </span>
          <div className="text-2xl font-bold font-mono text-rose-700 mt-1 tabular-nums">
            {summary.overdue_cases}
          </div>
          <div className="text-2xs text-muted mt-0.5">Past statutory disposal target</div>
        </div>
      </div>

      {/* Consolidated Complaint History Across All Bureaus */}
      <div className="bg-white border border-card-border rounded-card shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-card-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-heading">
              Consolidated Case History Across All Bureaus
            </h2>
            <p className="text-2xs text-muted">
              Unified docket view combining Regulation Bureau, PGRC, and Regional inquiries
            </p>
          </div>
          <span className="text-2xs font-mono font-medium text-muted">
            {cases.length} Total Cases
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Bureau</th>
                <th>Category</th>
                <th>Status</th>
                <th>Received</th>
                <th>Handling Officer</th>
                <th>Target SLA</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {cases && cases.length > 0 ? (
                cases.map((c) => {
                  const badge = getStatusBadge(c.status);
                  return (
                    <tr key={c.case_id}>
                      <td className="font-mono font-bold text-xs text-heading whitespace-nowrap">
                        {c.case_id}
                      </td>

                      <td className="text-2xs font-semibold text-heading whitespace-nowrap">
                        {c.bureau}
                      </td>

                      <td className="text-body text-xs max-w-sm">
                        <div className="truncate">{c.category}</div>
                      </td>

                      <td className="whitespace-nowrap">
                        <span className={`inline-flex items-center text-2xs font-semibold px-2 py-0.5 rounded-full border ${badge.bg} ${badge.text} ${badge.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot} mr-1.5`} />
                          {c.status}
                        </span>
                      </td>

                      <td className="font-mono text-2xs text-muted whitespace-nowrap">
                        {c.received_date}
                      </td>

                      <td className="text-2xs text-muted whitespace-nowrap">
                        {c.assigned_officer}
                      </td>

                      <td className="font-mono text-2xs whitespace-nowrap">
                        <span className={c.is_overdue ? 'text-red-600 font-bold' : 'text-body'}>
                          {c.expected_disposal_date}
                        </span>
                      </td>

                      <td className="text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedCaseId(c.case_id)}
                          className="px-3 py-1 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-card-border rounded-lg transition-smooth inline-flex items-center space-x-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-muted">
                    No cases on record for this institution.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Chronological Unified Action Timeline */}
      <div className="bg-white border border-card-border rounded-card p-6 shadow-card space-y-4">
        <div className="flex items-center space-x-2">
          <Activity className="w-4 h-4 text-slate-600" />
          <h2 className="text-sm font-semibold text-heading">
            Institutional Audit Timeline ({timeline ? timeline.length : 0} Events)
          </h2>
        </div>

        <div className="border border-card-border rounded-xl divide-y divide-slate-100 overflow-hidden">
          {timeline && timeline.length > 0 ? (
            timeline.map((item) => (
              <div key={item.id} className="p-4 hover:bg-slate-50/50 transition-smooth">
                <div className="flex items-center justify-between text-2xs mb-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-heading px-1.5 py-0.5 bg-slate-100 rounded">
                      {item.case_id}
                    </span>
                    <span className="font-bold text-heading text-xs">{item.action}</span>
                  </div>
                  <span className="font-mono text-muted">{item.timestamp}</span>
                </div>

                <div className="text-2xs text-muted mb-1">
                  Bureau: <strong className="text-body">{item.bureau}</strong> • Officer: <strong className="text-body">{item.by_officer}</strong>
                </div>

                {item.remarks && (
                  <p className="text-2xs text-body bg-slate-50 p-2.5 rounded-lg border border-slate-100 italic mt-1">
                    "{item.remarks}"
                  </p>
                )}
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-xs text-muted">
              No historical timeline events recorded.
            </div>
          )}
        </div>
      </div>

      {/* Case Detail Slide-in Drawer */}
      {selectedCaseId && (
        <CaseDetailModal
          caseId={selectedCaseId}
          onClose={() => setSelectedCaseId(null)}
          onActionLogged={loadProfile}
        />
      )}

    </div>
  );
}
