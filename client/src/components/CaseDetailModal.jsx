import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  X, 
  Clock, 
  Building, 
  AlertCircle, 
  Send, 
  CheckCircle2, 
  ShieldAlert,
  Calendar,
  User,
  FileText,
  Layers,
  ArrowRight,
  ArrowRightLeft,
  AlertTriangle,
  CheckCircle,
  Link2,
  FileCheck
} from 'lucide-react';

export default function CaseDetailModal({ caseId, onClose, onActionLogged }) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Active Action Tab State: 'action' | 'transfer' | 'escalate' | 'dispose' | 'link'
  const [activeTab, setActiveTab] = useState('action');

  // Form states
  const [actionName, setActionName] = useState('Preliminary Scrutiny Completed');
  const [newStatus, setNewStatus] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [remarks, setRemarks] = useState('');
  
  // Transfer form state
  const [targetBureau, setTargetBureau] = useState('PGRC');
  const [targetOfficer, setTargetOfficer] = useState('Smt. Manjula Sundaram');
  const [transferRemarks, setTransferRemarks] = useState('');

  // Escalate form state
  const [escalateRemarks, setEscalateRemarks] = useState('Persistent non-compliance; referred to Standing Appellate Committee');

  // Dispose form state
  const [disposeRemarks, setDisposeRemarks] = useState('Formal hearing concluded and speaking order issued to institutional trust');

  // Link form state
  const [targetLinkCaseId, setTargetLinkCaseId] = useState('');
  const [linkRemarks, setLinkRemarks] = useState('Parallel proceeding connected for joint review');

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!caseId) return;
    loadCase();
  }, [caseId]);

  async function loadCase() {
    setLoading(true);
    setError('');
    try {
      const res = await api.getCaseDetail(caseId);
      setData(res);
      setNewStatus(res.case.status);
    } catch (err) {
      setError(err.message || 'Failed to fetch case details');
    } finally {
      setLoading(false);
    }
  }

  // 1. Submit Standard Action
  async function handleSubmitAction(e) {
    e.preventDefault();
    if (!actionName.trim()) return;

    setSubmitting(true);
    setError('');
    setSuccessMsg('');
    try {
      await api.postCaseAction(caseId, {
        action: actionName,
        remarks,
        newStatus: newStatus || undefined,
        nextAction: nextAction || undefined,
        byOfficer: user ? user.full_name : 'Authorised Officer',
        bureau: user ? user.bureau : data?.case?.bureau
      });
      setSuccessMsg('Procedural action successfully recorded.');
      setRemarks('');
      if (onActionLogged) onActionLogged();
      await loadCase();
    } catch (err) {
      setError(err.message || 'Failed to record action');
    } finally {
      setSubmitting(false);
    }
  }

  // 2. Submit Bureau Transfer
  async function handleTransfer(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMsg('');
    try {
      await api.transferCase(caseId, {
        target_bureau: targetBureau,
        target_officer: targetOfficer,
        remarks: transferRemarks,
        by_officer: user ? user.full_name : 'Authorised Officer'
      });
      setSuccessMsg(`Case successfully transferred to ${targetBureau}.`);
      setTransferRemarks('');
      if (onActionLogged) onActionLogged();
      await loadCase();
    } catch (err) {
      setError(err.message || 'Failed to transfer case');
    } finally {
      setSubmitting(false);
    }
  }

  // 3. Submit Escalation
  async function handleEscalate(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMsg('');
    try {
      await api.escalateCase(caseId, {
        remarks: escalateRemarks,
        by_officer: user ? user.full_name : 'Authorised Officer'
      });
      setSuccessMsg('Case successfully escalated to SAC / Council.');
      if (onActionLogged) onActionLogged();
      await loadCase();
    } catch (err) {
      setError(err.message || 'Failed to escalate case');
    } finally {
      setSubmitting(false);
    }
  }

  // 4. Submit Disposal
  async function handleDispose(e) {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccessMsg('');
    try {
      await api.disposeCase(caseId, {
        remarks: disposeRemarks,
        by_officer: user ? user.full_name : 'Authorised Officer'
      });
      setSuccessMsg('Case successfully marked as Disposed & Closed.');
      if (onActionLogged) onActionLogged();
      await loadCase();
    } catch (err) {
      setError(err.message || 'Failed to dispose case');
    } finally {
      setSubmitting(false);
    }
  }

  // 5. Submit Link Case
  async function handleLinkCase(e) {
    e.preventDefault();
    if (!targetLinkCaseId.trim()) return;

    setSubmitting(true);
    setError('');
    setSuccessMsg('');
    try {
      await api.linkCases(caseId, targetLinkCaseId.trim(), data?.case?.aicte_permanent_id, linkRemarks);
      setSuccessMsg(`Case ${caseId} formally linked to ${targetLinkCaseId.trim()}.`);
      setTargetLinkCaseId('');
      if (onActionLogged) onActionLogged();
      await loadCase();
    } catch (err) {
      setError(err.message || 'Failed to link case');
    } finally {
      setSubmitting(false);
    }
  }

  if (!caseId) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending': return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' };
      case 'Under Process': return { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' };
      case 'Disposed': return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' };
      case 'Transferred': return { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' };
      case 'Escalated': return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' };
      default: return { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-500' };
    }
  };

  const statusStyle = data?.case ? getStatusColor(data.case.status) : getStatusColor('');

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div 
        className="bg-white w-full max-w-3xl h-full shadow-drawer flex flex-col border-l border-card-border animate-in slide-in-from-right duration-200"
      >
        {/* Drawer Header */}
        <div className="px-6 py-4 border-b border-card-border bg-slate-50/70 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <span className="font-mono text-xs font-bold px-2.5 py-1 bg-white text-aicte-navy border border-slate-200 rounded-md shadow-2xs">
              {caseId}
            </span>
            {data?.case && (
              <span className={`inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-full border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dot} mr-1.5`} />
                {data.case.status}
              </span>
            )}
            <span className="text-2xs font-semibold px-2 py-0.5 bg-slate-100 text-body rounded border border-slate-200">
              Priority: {data?.case?.priority}
            </span>
          </div>

          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-smooth"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="space-y-4">
              <div className="h-20 skeleton" />
              <div className="h-32 skeleton" />
              <div className="h-40 skeleton" />
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center space-x-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {data && data.case && (
            <>
              {/* Institution Profile Summary Card */}
              <div className="bg-slate-50/70 border border-card-border rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-3xs font-bold text-muted uppercase tracking-wider block">
                      Target Technical Institution
                    </span>
                    <h3 className="text-sm font-bold text-heading mt-0.5">
                      {data.case.institution_name}
                    </h3>
                  </div>
                  <a
                    href={`/institutions/${data.case.aicte_permanent_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-2xs font-mono font-medium px-2 py-0.5 bg-white border border-slate-200 rounded text-aicte-navy-light hover:underline"
                  >
                    Permanent ID: {data.case.aicte_permanent_id}
                  </a>
                </div>

                <div className="text-2xs text-body leading-relaxed">
                  {data.case.institution_address} • <strong className="text-heading">{data.case.institution_region} Region ({data.case.institution_state})</strong> • {data.case.institution_type}
                </div>

                {/* Case Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2.5 border-t border-slate-200/60 text-2xs">
                  <div>
                    <span className="text-muted block">Current Bureau</span>
                    <span className="font-semibold text-heading">{data.case.bureau}</span>
                  </div>
                  <div>
                    <span className="text-muted block">Assigned Officer</span>
                    <span className="font-semibold text-heading truncate block">{data.case.assigned_officer}</span>
                  </div>
                  <div>
                    <span className="text-muted block">Lodged Date</span>
                    <span className="font-mono text-heading">{data.case.received_date}</span>
                  </div>
                  <div>
                    <span className="text-muted block">Target SLA</span>
                    <span className={`font-mono font-bold ${data.case.is_overdue ? 'text-red-600' : 'text-heading'}`}>
                      {data.case.expected_disposal_date}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/60 text-2xs">
                  <div>
                    <span className="text-muted block">Last Procedural Action</span>
                    <span className="font-medium text-heading">{data.case.last_action || 'Initial filing'}</span>
                    {data.case.last_action_date && (
                      <span className="text-muted font-mono block">({data.case.last_action_date})</span>
                    )}
                  </div>
                  <div>
                    <span className="text-muted block">Next Scheduled Action</span>
                    <span className="font-medium text-heading">{data.case.next_action || 'Pending Committee Review'}</span>
                  </div>
                </div>
              </div>

              {/* Allegation Summary */}
              <div className="space-y-1.5">
                <span className="text-3xs font-bold text-muted uppercase tracking-wider">
                  Grievance Category & Allegation Summary
                </span>
                <div className="p-4 bg-white border border-card-border rounded-xl text-xs leading-relaxed text-body shadow-2xs">
                  <div className="font-semibold text-heading mb-1">
                    {data.case.category}
                  </div>
                  <p>{data.case.description}</p>
                  <div className="mt-2 text-2xs text-muted">
                    Complainant: <strong className="text-body">{data.case.complainant_type || 'Public Citizen'}</strong>
                  </div>
                </div>
              </div>

              {/* Formally Linked Cases Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-3xs font-bold text-muted uppercase tracking-wider">
                    Formally Linked Related Proceedings ({data.linkedCases ? data.linkedCases.length : 0})
                  </span>
                  <button
                    onClick={() => setActiveTab('link')}
                    className="text-2xs text-aicte-navy-light font-semibold hover:underline flex items-center space-x-1"
                  >
                    <Link2 className="w-3 h-3" />
                    <span>+ Link Another Case</span>
                  </button>
                </div>

                {data.linkedCases && data.linkedCases.length > 0 ? (
                  <div className="space-y-2">
                    {data.linkedCases.map((lc) => (
                      <div key={lc.link_id} className="p-3 bg-slate-50 border border-card-border rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-bold text-heading">{lc.case_id}</span>
                            <span className="text-2xs text-muted">[{lc.bureau}]</span>
                            <span className="text-2xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-medium">
                              {lc.status}
                            </span>
                          </div>
                          <div className="text-2xs text-body mt-0.5 font-medium">{lc.category}</div>
                          {lc.link_remarks && (
                            <div className="text-3xs text-muted italic mt-0.5">"{lc.link_remarks}"</div>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            // Inspect linked case
                            api.getCaseDetail(lc.case_id).then(() => loadCase());
                          }}
                          className="px-2.5 py-1 text-2xs bg-white hover:bg-slate-100 border border-slate-200 rounded text-heading font-medium"
                        >
                          View Docket
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 bg-white border border-card-border rounded-xl text-center text-2xs text-muted">
                    No related proceedings formally linked to this docket yet.
                  </div>
                )}
              </div>

              {/* Action History Timeline */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-3xs font-bold text-muted uppercase tracking-wider">
                    Chronological Action Timeline ({data.history ? data.history.length : 0} Audit Records)
                  </span>
                </div>

                <div className="border border-card-border rounded-xl overflow-hidden bg-white shadow-2xs divide-y divide-slate-100">
                  {data.history && data.history.length > 0 ? (
                    data.history.map((h) => (
                      <div key={h.id} className="p-3.5 hover:bg-slate-50/50 transition-smooth">
                        <div className="flex items-center justify-between text-2xs mb-1">
                          <span className="font-bold text-heading">{h.action}</span>
                          <span className="font-mono text-muted">{h.timestamp}</span>
                        </div>
                        <div className="text-2xs text-muted mb-1">
                          Officer: <strong className="text-body">{h.by_officer}</strong> • Bureau: <strong className="text-body">{h.bureau}</strong>
                        </div>
                        {h.remarks && (
                          <p className="text-2xs text-body bg-slate-50 p-2 rounded-lg border border-slate-100 italic">
                            "{h.remarks}"
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-muted">
                      No procedural actions recorded yet
                    </div>
                  )}
                </div>
              </div>

              {/* Interactive Management Actions Container */}
              <div className="border-t border-card-border pt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-3xs font-bold text-muted uppercase tracking-wider">
                    Case Management & Bureau Interventions
                  </span>
                  
                  {/* Action Tabs Bar */}
                  <div className="flex bg-slate-100 p-1 rounded-lg text-2xs">
                    <button
                      type="button"
                      onClick={() => setActiveTab('action')}
                      className={`px-2.5 py-1 rounded font-medium transition-smooth ${activeTab === 'action' ? 'bg-white text-heading shadow-xs font-semibold' : 'text-muted hover:text-heading'}`}
                    >
                      Log Action
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('transfer')}
                      className={`px-2.5 py-1 rounded font-medium transition-smooth ${activeTab === 'transfer' ? 'bg-white text-heading shadow-xs font-semibold' : 'text-muted hover:text-heading'}`}
                    >
                      Transfer
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('escalate')}
                      className={`px-2.5 py-1 rounded font-medium transition-smooth ${activeTab === 'escalate' ? 'bg-white text-heading shadow-xs font-semibold' : 'text-muted hover:text-heading'}`}
                    >
                      Escalate
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('dispose')}
                      className={`px-2.5 py-1 rounded font-medium transition-smooth ${activeTab === 'dispose' ? 'bg-white text-heading shadow-xs font-semibold' : 'text-muted hover:text-heading'}`}
                    >
                      Dispose
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('link')}
                      className={`px-2.5 py-1 rounded font-medium transition-smooth ${activeTab === 'link' ? 'bg-white text-heading shadow-xs font-semibold' : 'text-muted hover:text-heading'}`}
                    >
                      Link Case
                    </button>
                  </div>
                </div>

                {/* 1. Tab: Log Standard Procedural Action */}
                {activeTab === 'action' && (
                  <form onSubmit={handleSubmitAction} className="bg-slate-50/60 p-4 border border-card-border rounded-xl space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-2xs text-muted font-medium mb-1">Action Type</label>
                        <select
                          value={actionName}
                          onChange={(e) => setActionName(e.target.value)}
                          className="w-full text-xs px-3 py-2 border border-card-border rounded-lg bg-white text-heading"
                        >
                          <option value="Preliminary Scrutiny Completed">Preliminary Scrutiny Completed</option>
                          <option value="Issue Show Cause Notice (SCN) to Trust">Issue Show Cause Notice (SCN) to Trust</option>
                          <option value="Physical/Virtual Inspection Ordered">Physical/Virtual Inspection Ordered</option>
                          <option value="Expert Committee Report Submitted to SAC">Expert Committee Report Submitted to SAC</option>
                          <option value="Standing Appellate Committee Hearing">Standing Appellate Committee Hearing</option>
                          <option value="Personal Hearing Scheduled">Personal Hearing Scheduled</option>
                          <option value="Joint Bureau Conciliation & Harmonisation">Joint Bureau Conciliation & Harmonisation</option>
                          <option value="Compliance Verified & Penalty Imposed">Compliance Verified & Penalty Imposed</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-2xs text-muted font-medium mb-1">Status Update</label>
                        <select
                          value={newStatus}
                          onChange={(e) => setNewStatus(e.target.value)}
                          className="w-full text-xs px-3 py-2 border border-card-border rounded-lg bg-white text-heading font-medium"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Under Process">Under Process</option>
                          <option value="Disposed">Disposed</option>
                          <option value="Transferred">Transferred</option>
                          <option value="Escalated">Escalated</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-2xs text-muted font-medium mb-1">Next Expected Action</label>
                      <input
                        type="text"
                        value={nextAction}
                        onChange={(e) => setNextAction(e.target.value)}
                        placeholder="e.g. Await response within 14 calendar days"
                        className="w-full text-xs px-3 py-2 border border-card-border rounded-lg bg-white text-heading"
                      />
                    </div>

                    <div>
                      <label className="block text-2xs text-muted font-medium mb-1">Procedural Remarks / Record</label>
                      <textarea
                        rows="2"
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Enter official minute or reference order..."
                        className="w-full text-xs p-2.5 border border-card-border rounded-lg bg-white text-heading"
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="btn-saffron px-5 py-2 text-xs rounded-lg flex items-center space-x-1.5 disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{submitting ? 'Recording...' : 'Record Action'}</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* 2. Tab: Transfer Bureau */}
                {activeTab === 'transfer' && (
                  <form onSubmit={handleTransfer} className="bg-slate-50/60 p-4 border border-card-border rounded-xl space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-2xs text-muted font-medium mb-1">Target Receiving Bureau *</label>
                        <select
                          value={targetBureau}
                          onChange={(e) => {
                            setTargetBureau(e.target.value);
                            if (e.target.value === 'Regulation Bureau') setTargetOfficer('Shri Anand Kumar Gupta');
                            else if (e.target.value === 'PGRC') setTargetOfficer('Smt. Manjula Sundaram');
                            else if (e.target.value === 'Approval Bureau') setTargetOfficer('Er. Vikramaditya Rathore');
                            else setTargetOfficer('Dr. K. Venkatesh Rao');
                          }}
                          className="w-full text-xs px-3 py-2 border border-card-border rounded-lg bg-white text-heading"
                        >
                          <option value="Regulation Bureau">Regulation Bureau (RB)</option>
                          <option value="PGRC">Public Grievance Redressal Cell (PGRC)</option>
                          <option value="Approval Bureau">Approval Bureau</option>
                          <option value="Regional Office">Regional Office</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-2xs text-muted font-medium mb-1">Assign to Officer *</label>
                        <input
                          type="text"
                          value={targetOfficer}
                          onChange={(e) => setTargetOfficer(e.target.value)}
                          className="w-full text-xs px-3 py-2 border border-card-border rounded-lg bg-white text-heading"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-2xs text-muted font-medium mb-1">Transfer Justification Memo *</label>
                      <textarea
                        rows="2"
                        value={transferRemarks}
                        onChange={(e) => setTransferRemarks(e.target.value)}
                        placeholder="State reason for transfer (e.g. subject matter falls within mandate of receiving bureau)..."
                        className="w-full text-xs p-2.5 border border-card-border rounded-lg bg-white text-heading"
                        required
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="btn-saffron px-5 py-2 text-xs rounded-lg flex items-center space-x-1.5 disabled:opacity-50"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        <span>{submitting ? 'Transferring...' : 'Execute Inter-Bureau Transfer'}</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* 3. Tab: Escalate Case */}
                {activeTab === 'escalate' && (
                  <form onSubmit={handleEscalate} className="bg-red-50/30 p-4 border border-red-200 rounded-xl space-y-3 text-xs">
                    <div>
                      <div className="font-semibold text-red-950 text-xs mb-1">
                        Escalate Case to Standing Appellate Committee (SAC)
                      </div>
                      <p className="text-2xs text-red-800">
                        Escalating elevates docket priority to <strong>Urgent</strong>, alerts the Member Secretary, and schedules an expedited appellate hearing.
                      </p>
                    </div>

                    <div>
                      <label className="block text-2xs text-muted font-medium mb-1">Escalation Grounds *</label>
                      <textarea
                        rows="2"
                        value={escalateRemarks}
                        onChange={(e) => setEscalateRemarks(e.target.value)}
                        className="w-full text-xs p-2.5 border border-red-200 rounded-lg bg-white text-heading"
                        required
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-5 py-2 text-xs bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold flex items-center space-x-1.5 disabled:opacity-50 transition-smooth shadow-xs"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{submitting ? 'Escalating...' : 'Confirm Escalation'}</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* 4. Tab: Dispose Case */}
                {activeTab === 'dispose' && (
                  <form onSubmit={handleDispose} className="bg-emerald-50/30 p-4 border border-emerald-200 rounded-xl space-y-3 text-xs">
                    <div>
                      <div className="font-semibold text-emerald-950 text-xs mb-1">
                        Formally Dispose & Close Docket
                      </div>
                      <p className="text-2xs text-emerald-800">
                        Concludes proceedings, updates real-time dashboard disposal metrics, and archives case record.
                      </p>
                    </div>

                    <div>
                      <label className="block text-2xs text-muted font-medium mb-1">Speaking Order Reference & Findings *</label>
                      <textarea
                        rows="2"
                        value={disposeRemarks}
                        onChange={(e) => setDisposeRemarks(e.target.value)}
                        className="w-full text-xs p-2.5 border border-emerald-200 rounded-lg bg-white text-heading"
                        required
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="px-5 py-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center space-x-1.5 disabled:opacity-50 transition-smooth shadow-xs"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>{submitting ? 'Closing...' : 'Issue Disposal Order'}</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* 5. Tab: Link Related Case */}
                {activeTab === 'link' && (
                  <form onSubmit={handleLinkCase} className="bg-slate-50/60 p-4 border border-card-border rounded-xl space-y-3 text-xs">
                    <div>
                      <label className="block text-2xs text-muted font-medium mb-1">Related Docket ID to Connect *</label>
                      <input
                        type="text"
                        value={targetLinkCaseId}
                        onChange={(e) => setTargetLinkCaseId(e.target.value)}
                        placeholder="e.g. AICTE-PGRC-2026-1014"
                        className="w-full text-xs px-3 py-2 border border-card-border rounded-lg bg-white text-heading font-mono"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-2xs text-muted font-medium mb-1">Linkage Justification</label>
                      <input
                        type="text"
                        value={linkRemarks}
                        onChange={(e) => setLinkRemarks(e.target.value)}
                        className="w-full text-xs px-3 py-2 border border-card-border rounded-lg bg-white text-heading"
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="btn-saffron px-5 py-2 text-xs rounded-lg flex items-center space-x-1.5 disabled:opacity-50"
                      >
                        <Link2 className="w-3.5 h-3.5" />
                        <span>{submitting ? 'Linking...' : 'Connect Dockets'}</span>
                      </button>
                    </div>
                  </form>
                )}

              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
