import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import CaseDetailModal from '../components/CaseDetailModal';
import { 
  AlertTriangle, 
  CheckCircle, 
  RotateCw, 
  Check, 
  ShieldAlert, 
  Filter, 
  Clock, 
  Building, 
  FileText, 
  CheckCheck,
  RefreshCw,
  Eye,
  Calendar
} from 'lucide-react';

export default function Alerts({ triggerRefresh }) {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadAlerts();
  }, [activeTab, typeFilter, severityFilter, triggerRefresh]);

  async function loadAlerts() {
    setLoading(true);
    try {
      const res = await api.getAlerts({ 
        status: activeTab,
        type: typeFilter,
        severity: severityFilter
      });
      setAlerts(res.alerts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleResolve(id) {
    try {
      await api.resolveAlert(id);
      loadAlerts();
    } catch (err) {
      alert(err.message || 'Failed to acknowledge alert');
    }
  }

  async function handleResolveAll() {
    if (!window.confirm('Acknowledge all alerts in the current view?')) return;
    try {
      await api.resolveAllAlerts(typeFilter);
      loadAlerts();
    } catch (err) {
      alert(err.message || 'Failed to acknowledge all');
    }
  }

  async function handleManualSync() {
    setSyncing(true);
    try {
      await api.syncAlerts();
      await loadAlerts();
    } catch (err) {
      console.error(err);
    } finally {
      setSyncing(false);
    }
  }

  const criticalCount = alerts.filter(a => a.severity === 'Critical').length;
  const warningCount = alerts.filter(a => a.severity === 'Warning').length;

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-8">
      
      {/* Title & Filter Control Bar */}
      <div className="bg-white border border-card-border rounded-card p-6 shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              <h1 className="text-lg font-bold text-heading">
                Regulatory Alerts & Statutory Timeline Monitor
              </h1>
            </div>
            <p className="text-xs text-muted mt-1">
              Automated surveillance detecting cross-bureau conflicts, 7-day SLA deadlines, stalled preliminary inquiries, and Council escalations
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleManualSync}
              disabled={syncing}
              className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-card-border rounded-lg text-xs font-semibold text-heading transition-smooth inline-flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'Scanning...' : 'Re-Scan Alerts'}</span>
            </button>

            {activeTab === 'active' && alerts.length > 0 && (
              <button
                onClick={handleResolveAll}
                className="px-3.5 py-1.5 bg-aicte-navy text-white rounded-lg text-xs font-semibold hover:bg-aicte-navy-mid transition-smooth inline-flex items-center space-x-1.5 shadow-2xs"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Acknowledge All</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            
            {/* Status Tab Toggle */}
            <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setActiveTab('active')}
                className={`px-3 py-1 rounded-md font-medium transition-smooth ${
                  activeTab === 'active' 
                    ? 'bg-white text-heading shadow-xs font-semibold' 
                    : 'text-body hover:text-heading'
                }`}
              >
                Active Alerts ({activeTab === 'active' ? alerts.length : '...'})
              </button>
              <button
                onClick={() => setActiveTab('resolved')}
                className={`px-3 py-1 rounded-md font-medium transition-smooth ${
                  activeTab === 'resolved' 
                    ? 'bg-white text-heading shadow-xs font-semibold' 
                    : 'text-body hover:text-heading'
                }`}
              >
                Acknowledged History
              </button>
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="text-xs px-3 py-1.5 border border-card-border rounded-lg bg-white text-body focus:outline-hidden"
            >
              <option value="ALL">All Alert Types</option>
              <option value="Cross-Bureau Overlap">Cross-Bureau Overlap</option>
              <option value="SLA Breached">SLA Breached (Overdue)</option>
              <option value="SLA Approaching">SLA Approaching (&le; 7 Days)</option>
              <option value="Pending Reminder">Pending Reminder (&gt; 30 Days)</option>
              <option value="Escalation">Council Escalation</option>
            </select>

            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="text-xs px-3 py-1.5 border border-card-border rounded-lg bg-white text-body focus:outline-hidden"
            >
              <option value="ALL">All Severities</option>
              <option value="Critical">Critical</option>
              <option value="Warning">Warning</option>
              <option value="Info">Info</option>
            </select>
          </div>

          <div className="flex items-center space-x-3 text-2xs font-mono text-muted">
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              <span>{criticalCount} Critical</span>
            </span>
            <span className="flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              <span>{warningCount} Warning</span>
            </span>
            <button
              onClick={loadAlerts}
              className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-50 border border-slate-200 rounded-lg ml-2"
              title="Refresh"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Alerts Stream */}
      <div className="space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(n => (
              <div key={n} className="h-28 skeleton rounded-card" />
            ))}
          </div>
        ) : alerts && alerts.length > 0 ? (
          alerts.map(a => {
            const isCritical = a.severity === 'Critical';
            const isWarning = a.severity === 'Warning';

            return (
              <div
                key={a.id}
                className="bg-white border border-card-border rounded-card p-5 shadow-card hover:shadow-card-hover transition-smooth flex flex-wrap sm:flex-nowrap items-start justify-between gap-4"
              >
                <div className="flex items-start space-x-3.5 min-w-0">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    isCritical 
                      ? 'bg-rose-50 text-rose-600 border border-rose-200' 
                      : isWarning 
                      ? 'bg-amber-50 text-amber-600 border border-amber-200' 
                      : 'bg-blue-50 text-blue-600 border border-blue-200'
                  }`}>
                    <AlertTriangle className="w-4 h-4" />
                  </div>

                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-3xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        isCritical 
                          ? 'bg-rose-50 text-rose-700 border-rose-200' 
                          : isWarning
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}>
                        {a.alert_type}
                      </span>
                      <span className="text-2xs font-semibold text-muted">
                        • Severity: <strong className={isCritical ? 'text-rose-600' : 'text-amber-600'}>{a.severity}</strong>
                      </span>
                      <span className="text-2xs text-slate-400 font-mono">
                        • {a.created_at}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-heading">
                      {a.title}
                    </h3>

                    <p className="text-xs text-body leading-relaxed max-w-4xl">
                      {a.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-2xs text-muted">
                      {a.institution_name && (
                        <button
                          onClick={() => navigate(`/institutions/${a.aicte_permanent_id}`)}
                          className="hover:text-aicte-navy-light font-medium inline-flex items-center space-x-1"
                        >
                          <Building className="w-3 h-3 text-slate-400" />
                          <span className="underline">{a.institution_name} ({a.aicte_permanent_id})</span>
                        </button>
                      )}

                      {a.case_id && (
                        <button
                          onClick={() => setSelectedCaseId(a.case_id)}
                          className="font-mono text-aicte-navy hover:underline inline-flex items-center space-x-1 font-bold"
                        >
                          <FileText className="w-3 h-3 text-slate-400" />
                          <span>Case Docket: {a.case_id}</span>
                        </button>
                      )}

                      {a.expected_disposal_date && (
                        <div className="flex items-center space-x-1 font-mono">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>Target: {a.expected_disposal_date}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2 shrink-0 self-start sm:self-center">
                  {a.case_id && (
                    <button
                      onClick={() => setSelectedCaseId(a.case_id)}
                      className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-card-border text-xs font-semibold text-heading rounded-lg transition-smooth inline-flex items-center space-x-1"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-500" />
                      <span>Examine</span>
                    </button>
                  )}

                  {activeTab === 'active' ? (
                    <button
                      onClick={() => handleResolve(a.id)}
                      className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold rounded-lg transition-smooth inline-flex items-center space-x-1"
                      title="Acknowledge & clear alert"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Acknowledge</span>
                    </button>
                  ) : (
                    <span className="px-2.5 py-1 text-2xs font-semibold text-slate-500 bg-slate-100 rounded-md">
                      Acknowledged
                    </span>
                  )}
                </div>

              </div>
            );
          })
        ) : (
          <div className="bg-white border border-card-border rounded-card p-12 text-center shadow-card space-y-3">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
            <h3 className="text-base font-bold text-heading">Zero Pending Alerts</h3>
            <p className="text-xs text-muted max-w-md mx-auto">
              All compliance alerts for this filter criteria have been acknowledged or no SLA breaches detected.
            </p>
          </div>
        )}
      </div>

      {/* Case Detail Modal / Drawer */}
      {selectedCaseId && (
        <CaseDetailModal
          caseId={selectedCaseId}
          onClose={() => setSelectedCaseId(null)}
          onActionLogged={loadAlerts}
        />
      )}

    </div>
  );
}
