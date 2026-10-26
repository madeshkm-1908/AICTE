import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import CaseDetailModal from '../components/CaseDetailModal';
import { 
  Layers, 
  Link2, 
  RotateCw, 
  Filter, 
  Eye, 
  CheckCircle2, 
  AlertTriangle,
  Building2,
  Calendar,
  Sparkles,
  Check,
  X,
  FileText,
  Clock,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

export default function Overlaps({ triggerRefresh }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('PENDING'); // 'PENDING' | 'COORDINATED' | 'DISMISSED' | 'ALL'
  
  // Selected Drawer Institution (Side drawer showing full case list)
  const [drawerInst, setDrawerInst] = useState(null);
  const [selectedCaseId, setSelectedCaseId] = useState(null);

  // Link cases state
  const [linkingCasePair, setLinkingCasePair] = useState(null);
  const [linkRemarks, setLinkRemarks] = useState('Joint cross-bureau review initiated to unify proceedings');
  const [linkingLoading, setLinkingLoading] = useState(false);

  // Dismiss modal state
  const [dismissingInst, setDismissingInst] = useState(null);
  const [dismissRemarks, setDismissRemarks] = useState('');
  const [dismissLoading, setDismissLoading] = useState(false);

  // Coordination action state
  const [coordinatingInst, setCoordinatingInst] = useState(null);
  const [coordRemarks, setCoordRemarks] = useState('Formally reviewed and harmonised by joint bureau committee');
  const [coordLoading, setCoordLoading] = useState(false);

  const [notification, setNotification] = useState('');

  useEffect(() => {
    loadOverlaps();
  }, [regionFilter, statusFilter, triggerRefresh]);

  async function loadOverlaps() {
    setLoading(true);
    try {
      const res = await api.getOverlaps({ region: regionFilter, status: statusFilter });
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // 1. Link Cases
  async function handleConfirmLink(e) {
    e.preventDefault();
    if (!linkingCasePair) return;
    setLinkingLoading(true);
    try {
      await api.linkCases(
        linkingCasePair.rbCaseId, 
        linkingCasePair.pgrcCaseId, 
        linkingCasePair.instKey, 
        linkRemarks
      );
      setNotification(`Cases ${linkingCasePair.rbCaseId} and ${linkingCasePair.pgrcCaseId} successfully linked.`);
      setLinkingCasePair(null);
      await loadOverlaps();
    } catch (err) {
      alert(err.message || 'Failed to establish link');
    } finally {
      setLinkingLoading(false);
    }
  }

  // 2. Mark as Coordinated
  async function handleConfirmCoordinate(e) {
    e.preventDefault();
    if (!coordinatingInst) return;
    setCoordLoading(true);
    try {
      await api.coordinateOverlap(coordinatingInst.institution_key, coordRemarks);
      setNotification(`Institution ${coordinatingInst.institution_name} marked as Coordinated.`);
      setCoordinatingInst(null);
      await loadOverlaps();
    } catch (err) {
      alert(err.message || 'Failed to update coordination status');
    } finally {
      setCoordLoading(false);
    }
  }

  // 3. Dismiss Overlap with Remark
  async function handleConfirmDismiss(e) {
    e.preventDefault();
    if (!dismissingInst || !dismissRemarks.trim()) return;
    setDismissLoading(true);
    try {
      await api.dismissOverlap(dismissingInst.institution_key, dismissRemarks);
      setNotification(`Overlap for ${dismissingInst.institution_name} dismissed with remarks.`);
      setDismissingInst(null);
      setDismissRemarks('');
      await loadOverlaps();
    } catch (err) {
      alert(err.message || 'Failed to dismiss overlap');
    } finally {
      setDismissLoading(false);
    }
  }

  // 4. Trigger Re-scan
  async function handleRescan() {
    setLoading(true);
    try {
      const res = await api.rescanOverlaps();
      setNotification(`Overlap re-scan complete: ${res.totalOverlaps} overlaps evaluated.`);
      await loadOverlaps();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const institutions = data?.institutions || [];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-8">
      
      {/* 1. Header Banner */}
      <div className="bg-white border border-card-border rounded-card p-6 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
                <Layers className="w-4 h-4" />
              </div>
              <h1 className="text-lg font-bold text-heading">
                Cross-Bureau Overlap Detection & Harmonisation Engine
              </h1>
            </div>
            <p className="text-xs text-body max-w-3xl">
              Automatic intelligence identifying institutions undergoing uncoordinated, simultaneous inquiries across Regulation Bureau (RB) and Public Grievance (PGRC) using exact AICTE Permanent IDs and token-normalized fuzzy name matching.
            </p>
          </div>

          <div className="flex items-center space-x-2.5">
            <button
              onClick={handleRescan}
              className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-heading border border-card-border rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-smooth"
              title="Run AICTE Overlap Algorithm Now"
            >
              <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Run Detection Scan</span>
            </button>

            <div className="flex items-center space-x-1.5 bg-slate-50 border border-card-border px-3 py-1.5 rounded-lg text-xs">
              <Filter className="w-3.5 h-3.5 text-muted" />
              <span className="text-3xs font-semibold text-muted uppercase">Region:</span>
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="bg-transparent font-medium text-heading focus:outline-hidden cursor-pointer"
              >
                <option value="ALL">All Regions</option>
                <option value="Northern">Northern</option>
                <option value="Southern">Southern</option>
                <option value="Western">Western</option>
                <option value="Eastern">Eastern</option>
                <option value="Central">Central</option>
              </select>
            </div>
          </div>
        </div>

        {notification && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{notification}</span>
            </div>
            <button onClick={() => setNotification('')} className="text-emerald-700 hover:text-emerald-900">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 2. Status Category Tabs & Metrics Strip */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Filter Tabs */}
        <div className="flex bg-white p-1 rounded-xl border border-card-border shadow-xs text-xs">
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-4 py-2 rounded-lg font-medium transition-smooth ${
              statusFilter === 'PENDING'
                ? 'bg-amber-50 text-amber-900 border border-amber-200 font-semibold shadow-2xs'
                : 'text-body hover:text-heading'
            }`}
          >
            Pending Coordination ({data?.pending_count || 0})
          </button>
          <button
            onClick={() => setStatusFilter('COORDINATED')}
            className={`px-4 py-2 rounded-lg font-medium transition-smooth ${
              statusFilter === 'COORDINATED'
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200 font-semibold shadow-2xs'
                : 'text-body hover:text-heading'
            }`}
          >
            Harmonised & Linked ({data?.coordinated_count || 0})
          </button>
          <button
            onClick={() => setStatusFilter('DISMISSED')}
            className={`px-4 py-2 rounded-lg font-medium transition-smooth ${
              statusFilter === 'DISMISSED'
                ? 'bg-slate-100 text-slate-800 border border-slate-200 font-semibold shadow-2xs'
                : 'text-body hover:text-heading'
            }`}
          >
            Dismissed ({data?.dismissed_count || 0})
          </button>
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-4 py-2 rounded-lg font-medium transition-smooth ${
              statusFilter === 'ALL'
                ? 'bg-aicte-navy text-white font-semibold shadow-2xs'
                : 'text-body hover:text-heading'
            }`}
          >
            All Matches ({data?.total_overlapping || 0})
          </button>
        </div>

        <div className="text-2xs text-muted font-medium">
          Showing {institutions.length} institutions requiring harmonisation
        </div>
      </div>

      {/* 3. List of Flagged Overlapping Institutions */}
      <div className="space-y-4">
        {institutions && institutions.length > 0 ? (
          institutions.map((inst) => {
            const rbCases = inst.rb_cases || [];
            const pgrcCases = inst.pgrc_cases || [];
            const rbPrimary = rbCases[0];
            const pgrcPrimary = pgrcCases[0];
            const isDismissed = inst.resolution_status === 'DISMISSED';
            const isCoordinated = inst.resolution_status === 'COORDINATED';

            return (
              <div 
                key={inst.institution_key} 
                className={`bg-white border rounded-card overflow-hidden shadow-card hover:shadow-card-hover transition-smooth ${
                  isDismissed ? 'opacity-60 border-slate-200' : 'border-card-border'
                }`}
              >
                {/* Mandatory Label Banner per specification: "Potential Overlapping Cases - Coordination Required" */}
                <div className="px-6 py-2 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-amber-200/50 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span className="text-2xs font-bold uppercase tracking-wider text-amber-900">
                      Potential Overlapping Cases - Coordination Required
                    </span>
                  </div>

                  {/* Confidence Level Badge */}
                  <span className={`text-3xs font-semibold px-2.5 py-0.5 rounded-full border ${
                    inst.confidence_score === 1.0 
                      ? 'bg-blue-50 text-blue-700 border-blue-200' 
                      : 'bg-purple-50 text-purple-700 border-purple-200'
                  }`}>
                    {inst.confidence_label}
                  </span>
                </div>

                {/* Institution Row & Summary */}
                <div className="p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-100">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2.5">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-100 text-heading rounded border border-slate-200">
                          {inst.aicte_permanent_id}
                        </span>
                        <h3 className="font-bold text-heading text-sm sm:text-base">
                          {inst.institution_name}
                        </h3>
                      </div>
                      <div className="text-2xs text-muted">
                        {inst.region} Region ({inst.state}) • {inst.type || 'Technical Institution'}
                      </div>
                    </div>

                    {/* Counts and Quick Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {inst.rb_open_count} RB Open
                      </span>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        {inst.pgrc_open_count} PGRC Open
                      </span>

                      {/* Open Side Drawer Button */}
                      <button
                        onClick={() => setDrawerInst(inst)}
                        className="px-3 py-1.5 text-xs font-semibold text-aicte-navy-light bg-slate-50 hover:bg-slate-100 border border-card-border rounded-lg transition-smooth inline-flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect Cases ({inst.all_cases?.length || 0})</span>
                      </button>
                    </div>
                  </div>

                  {/* Actions Row: Link Cases, Mark as Coordinated, Dismiss with a Remark */}
                  <div className="pt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="text-2xs text-muted">
                      {isCoordinated ? (
                        <span className="text-emerald-700 font-semibold flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Status: Harmonised & Formally Coordinated</span>
                        </span>
                      ) : isDismissed ? (
                        <span className="text-slate-500 italic">
                          Status: Dismissed ("{inst.resolution_remarks}")
                        </span>
                      ) : (
                        <span>Action Required: Reconcile inquiries or link dockets to avoid conflicting orders</span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {/* 1. Link Cases Button */}
                      {rbPrimary && pgrcPrimary && !inst.is_formally_linked && !isDismissed && (
                        <button
                          onClick={() => setLinkingCasePair({
                            instName: inst.institution_name,
                            instKey: inst.institution_key,
                            rbCaseId: rbPrimary.case_id,
                            pgrcCaseId: pgrcPrimary.case_id
                          })}
                          className="btn-saffron px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                          <span>Link Cases</span>
                        </button>
                      )}

                      {/* 2. Mark as Coordinated Button */}
                      {!isCoordinated && !isDismissed && (
                        <button
                          onClick={() => setCoordinatingInst(inst)}
                          className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-smooth flex items-center space-x-1.5"
                        >
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Mark as Coordinated</span>
                        </button>
                      )}

                      {/* 3. Dismiss with a Remark Button */}
                      {!isDismissed && (
                        <button
                          onClick={() => setDismissingInst(inst)}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-red-700 hover:bg-red-50 border border-card-border hover:border-red-200 transition-smooth flex items-center space-x-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Dismiss with Remark</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-16 bg-white border border-card-border rounded-card text-muted text-xs shadow-card">
            {loading ? 'Evaluating cross-bureau overlap records...' : 'No overlapping cases found matching current filter.'}
          </div>
        )}
      </div>

      {/* 4. Full Case List Side Drawer (Opens when user inspects an overlapping institution) */}
      {drawerInst && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full shadow-drawer flex flex-col border-l border-card-border animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="px-6 py-4 border-b border-card-border bg-slate-50/70 flex items-center justify-between shrink-0">
              <div>
                <span className="font-mono text-xs font-bold text-muted">
                  Permanent ID: {drawerInst.aicte_permanent_id}
                </span>
                <h2 className="text-sm font-bold text-heading mt-0.5">
                  {drawerInst.institution_name}
                </h2>
              </div>
              <button 
                onClick={() => setDrawerInst(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-smooth"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body: Full Case List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex items-center justify-between text-2xs">
                <span className="font-semibold text-muted uppercase">
                  All Active Proceedings ({drawerInst.all_cases ? drawerInst.all_cases.length : 0})
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-semibold border border-amber-200">
                  {drawerInst.confidence_label}
                </span>
              </div>

              <div className="space-y-3">
                {drawerInst.all_cases && drawerInst.all_cases.map((c) => (
                  <div 
                    key={c.case_id}
                    className="p-4 rounded-xl border border-card-border bg-white shadow-2xs hover:border-slate-300 transition-smooth space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-heading px-2 py-0.5 bg-slate-100 rounded">
                          {c.case_id}
                        </span>
                        <span className="text-2xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                          {c.bureau}
                        </span>
                        <span className="text-2xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-body">
                          {c.status}
                        </span>
                      </div>
                      <span className="text-3xs text-muted font-mono">{c.received_date}</span>
                    </div>

                    <div className="text-xs font-semibold text-heading">
                      {c.category}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-2xs text-muted pt-1 border-t border-slate-100">
                      <div>Officer: <strong className="text-body">{c.assigned_officer}</strong></div>
                      <div>Target SLA: <strong className={`font-mono ${c.is_overdue ? 'text-red-600' : 'text-body'}`}>{c.expected_disposal_date}</strong></div>
                    </div>

                    <div className="text-2xs text-muted truncate">
                      Last Action: {c.last_action || 'Initial registration'}
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => setSelectedCaseId(c.case_id)}
                        className="px-3 py-1 text-2xs bg-slate-50 hover:bg-slate-100 border border-card-border rounded text-heading font-medium flex items-center space-x-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Open Full Docket</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Link Confirmation Modal */}
      {linkingCasePair && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleConfirmLink} className="bg-white rounded-2xl border border-card-border shadow-drawer w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center space-x-2.5 border-b border-card-border pb-3">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
                <Link2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-heading">
                  Establish Formal Cross-Bureau Link
                </h3>
                <p className="text-2xs text-muted">Interconnect active proceedings for joint committee review</p>
              </div>
            </div>

            <div className="text-xs text-body leading-relaxed">
              Target: <strong className="text-heading">{linkingCasePair.instName}</strong>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono p-3 bg-slate-50 border border-card-border rounded-xl">
              <div>
                <span className="text-3xs text-muted block font-sans uppercase font-bold">Regulation Bureau</span>
                <span className="font-bold text-blue-700">{linkingCasePair.rbCaseId}</span>
              </div>
              <div>
                <span className="text-3xs text-muted block font-sans uppercase font-bold">PGRC Cell</span>
                <span className="font-bold text-amber-700">{linkingCasePair.pgrcCaseId}</span>
              </div>
            </div>

            <div>
              <label className="block text-2xs font-semibold text-body uppercase tracking-wider mb-1">
                Linkage Justification / Coordination Note
              </label>
              <textarea
                rows="3"
                value={linkRemarks}
                onChange={(e) => setLinkRemarks(e.target.value)}
                className="w-full text-xs p-3 border border-card-border rounded-xl bg-white text-heading focus:outline-hidden focus:border-aicte-navy-light"
                required
              />
            </div>

            <div className="flex justify-end space-x-2.5 pt-2 border-t border-card-border">
              <button
                type="button"
                onClick={() => setLinkingCasePair(null)}
                className="px-4 py-2 text-xs font-medium text-body hover:bg-slate-100 border border-card-border rounded-lg transition-smooth"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={linkingLoading}
                className="btn-saffron px-5 py-2 text-xs rounded-lg flex items-center space-x-1.5 disabled:opacity-50"
              >
                {linkingLoading ? 'Linking...' : 'Confirm & Interconnect'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Mark as Coordinated Modal */}
      {coordinatingInst && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleConfirmCoordinate} className="bg-white rounded-2xl border border-card-border shadow-drawer w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center space-x-2.5 border-b border-card-border pb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-heading">
                  Mark Overlap as Coordinated
                </h3>
                <p className="text-2xs text-muted">Certify that both bureaus are harmonized on this matter</p>
              </div>
            </div>

            <div className="text-xs text-body leading-relaxed">
              Target: <strong className="text-heading">{coordinatingInst.institution_name}</strong>
            </div>

            <div>
              <label className="block text-2xs font-semibold text-body uppercase tracking-wider mb-1">
                Coordination Minute / Joint Determination Note *
              </label>
              <textarea
                rows="3"
                value={coordRemarks}
                onChange={(e) => setCoordRemarks(e.target.value)}
                className="w-full text-xs p-3 border border-card-border rounded-xl bg-white text-heading focus:outline-hidden focus:border-aicte-navy-light"
                required
              />
            </div>

            <div className="flex justify-end space-x-2.5 pt-2 border-t border-card-border">
              <button
                type="button"
                onClick={() => setCoordinatingInst(null)}
                className="px-4 py-2 text-xs font-medium text-body hover:bg-slate-100 border border-card-border rounded-lg transition-smooth"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={coordLoading}
                className="px-5 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg flex items-center space-x-1.5 disabled:opacity-50 transition-smooth shadow-xs"
              >
                {coordLoading ? 'Updating...' : 'Certify Coordination'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Dismiss with Remark Modal */}
      {dismissingInst && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <form onSubmit={handleConfirmDismiss} className="bg-white rounded-2xl border border-card-border shadow-drawer w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center space-x-2.5 border-b border-card-border pb-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-600">
                <X className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-heading">
                  Dismiss Overlap Flag
                </h3>
                <p className="text-2xs text-muted">Acknowledge this is not a conflicting duplicate inquiry</p>
              </div>
            </div>

            <div className="text-xs text-body leading-relaxed">
              Target: <strong className="text-heading">{dismissingInst.institution_name}</strong>
            </div>

            <div>
              <label className="block text-2xs font-semibold text-body uppercase tracking-wider mb-1">
                Reason for Dismissal *
              </label>
              <textarea
                rows="3"
                value={dismissRemarks}
                onChange={(e) => setDismissRemarks(e.target.value)}
                placeholder="State official reason (e.g. separate trust campus, matter independently disposed, distinct jurisdiction)..."
                className="w-full text-xs p-3 border border-card-border rounded-xl bg-white text-heading focus:outline-hidden focus:border-aicte-navy-light"
                required
              />
            </div>

            <div className="flex justify-end space-x-2.5 pt-2 border-t border-card-border">
              <button
                type="button"
                onClick={() => setDismissingInst(null)}
                className="px-4 py-2 text-xs font-medium text-body hover:bg-slate-100 border border-card-border rounded-lg transition-smooth"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={dismissLoading}
                className="px-5 py-2 text-xs bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg flex items-center space-x-1.5 disabled:opacity-50 transition-smooth shadow-xs"
              >
                {dismissLoading ? 'Dismissing...' : 'Confirm Dismissal'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Case Detail Slide-in Drawer */}
      {selectedCaseId && (
        <CaseDetailModal
          caseId={selectedCaseId}
          onClose={() => setSelectedCaseId(null)}
          onActionLogged={loadOverlaps}
        />
      )}

    </div>
  );
}
