import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import ComplainantHeader from '../components/ComplainantHeader';
import { 
  Building2, 
  Search, 
  PlusCircle, 
  FileText, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Upload, 
  Paperclip, 
  X, 
  Calendar, 
  Copy, 
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Sparkles,
  Inbox,
  Eye,
  RefreshCw
} from 'lucide-react';

const CATEGORIES = [
  'Admission & Fee Malpractice',
  'Faculty Deficiency & Qualification Mismatch',
  'Non-Refund of Caution Deposit & Fee Retention',
  'Infrastructure & Lab Equipment Deficiencies',
  'Withholding of Original Certificates & Marksheets',
  'Harassment & Victimization of Students/Staff',
  'Examination Irregularities & Unfair Practices',
  'Unauthorized / Unapproved Courses & Intake'
];

export default function ComplainantPortal() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('my-complaints'); // 'my-complaints' | 'new-complaint'

  // Complaints List State
  const [complaints, setComplaints] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState('');

  // Selected Complaint Tracking State
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [trackingDetail, setTrackingDetail] = useState(null);
  const [loadingTracking, setLoadingTracking] = useState(false);

  // Form State for New Complaint
  const [searchQuery, setSearchQuery] = useState('');
  const [institutionResults, setInstitutionResults] = useState([]);
  const [selectedInstitution, setSelectedInstitution] = useState(null);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [incidentDate, setIncidentDate] = useState(new Date().toISOString().split('T')[0]);
  const [attachment, setAttachment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [submittedSuccess, setSubmittedSuccess] = useState(null); // { case_id, institution_name, received_date }

  // Load My Complaints
  async function loadComplaints() {
    setLoadingList(true);
    setListError('');
    try {
      const res = await api.getMyComplaints();
      setComplaints(res.complaints || []);
    } catch (err) {
      setListError(err.message || 'Failed to load your complaints list.');
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    loadComplaints();
  }, []);

  // Search Institutions
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setInstitutionResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.searchComplainantInstitutions(searchQuery);
        setInstitutionResults(res.institutions || []);
      } catch (e) {
        console.error('Institution search error:', e);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Open Tracking Modal
  async function handleOpenTracking(caseId) {
    setSelectedCaseId(caseId);
    setTrackingModalOpen(true);
    setLoadingTracking(true);
    try {
      const res = await api.getMyComplaintDetail(caseId);
      setTrackingDetail(res);
    } catch (err) {
      console.error('Error fetching tracking detail:', err);
    } finally {
      setLoadingTracking(false);
    }
  }

  // Handle Form Submission
  async function handleComplaintSubmit(e) {
    e.preventDefault();
    setFormError('');

    if (!selectedInstitution) {
      return setFormError('Please search and select an AICTE-approved institution.');
    }
    if (!description || description.trim().length < 15) {
      return setFormError('Please enter a detailed description of at least 15 characters.');
    }

    setSubmitting(true);

    try {
      const payload = {
        aicte_permanent_id: selectedInstitution.aicte_permanent_id,
        category,
        description: description.trim(),
        incident_date: incidentDate,
        attachment_name: attachment ? attachment.name : null,
        attachment_data: attachment ? attachment.name : null // simplified file label
      };

      const res = await api.submitComplainantGrievance(payload);

      setSubmittedSuccess({
        case_id: res.case_id,
        institution_name: res.institution_name,
        received_date: res.received_date
      });

      // Reset form
      setSelectedInstitution(null);
      setSearchQuery('');
      setDescription('');
      setAttachment(null);
      setCategory(CATEGORIES[0]);

      // Reload list
      loadComplaints();
    } catch (err) {
      setFormError(err.message || 'Failed to submit grievance. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleFileUpload(e) {
    const file = e.target.files && e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size exceeds 5MB limit. Please upload a smaller document.');
        return;
      }
      setAttachment({
        name: file.name,
        size: (file.size / 1024).toFixed(1) + ' KB'
      });
    }
  }

  function getStatusBadge(status) {
    switch (status) {
      case 'Received':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            <span>Received</span>
          </span>
        );
      case 'Under Review':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>Under Review</span>
          </span>
        );
      case 'Action Taken':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            <span>Action Taken</span>
          </span>
        );
      case 'Closed':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Closed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <span>{status}</span>
          </span>
        );
    }
  }

  return (
    <div className="min-h-screen bg-page flex flex-col antialiased">
      <ComplainantHeader activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* SUBMISSION CONFIRMATION BANNER */}
        {submittedSuccess && (
          <div className="mb-6 p-6 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-2xs font-bold uppercase tracking-wider text-emerald-800">
                      Grievance Successfully Registered
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-3xs font-semibold bg-emerald-100 text-emerald-800">
                      AICTE PGRC Intake
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-heading mt-0.5">
                    Your Case Reference ID: <span className="text-aicte-navy font-mono text-lg">{submittedSuccess.case_id}</span>
                  </h3>
                  <p className="text-xs text-body mt-1">
                    Registered against <strong>{submittedSuccess.institution_name}</strong> on {submittedSuccess.received_date}. Please preserve this Case ID for all future inquiries.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(submittedSuccess.case_id);
                    alert(`Case ID ${submittedSuccess.case_id} copied to clipboard!`);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-emerald-300 text-emerald-800 hover:bg-emerald-50 transition-smooth flex items-center space-x-1.5 shadow-2xs"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Case ID</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleOpenTracking(submittedSuccess.case_id);
                  }}
                  className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white transition-smooth flex items-center space-x-1.5 shadow-xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Track Status</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSubmittedSuccess(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: MY COMPLAINTS LIST */}
        {activeTab === 'my-complaints' && (
          <div className="space-y-6">
            
            {/* Header & Quick Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-heading">
                  My Registered Complaints
                </h1>
                <p className="text-xs text-body mt-1">
                  Track the progress, status changes, and official redressal milestones of your submitted petitions.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={loadComplaints}
                  title="Refresh Complaints"
                  className="p-2.5 rounded-xl border border-card-border bg-white hover:bg-slate-50 text-body transition-smooth flex items-center space-x-1.5 text-xs font-medium"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingList ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>

                <button
                  onClick={() => setActiveTab('new-complaint')}
                  className="px-4 py-2.5 rounded-xl bg-primary-gradient hover:opacity-95 text-white font-semibold text-xs transition-smooth shadow-xs flex items-center space-x-2"
                >
                  <PlusCircle className="w-4 h-4 text-emerald-300" />
                  <span>Raise New Complaint</span>
                </button>
              </div>
            </div>

            {/* Error Banner */}
            {listError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{listError}</span>
              </div>
            )}

            {/* Loading State */}
            {loadingList ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-28 bg-white border border-card-border rounded-2xl animate-pulse p-6" />
                ))}
              </div>
            ) : complaints.length === 0 ? (
              /* Empty State */
              <div className="bg-white border border-card-border rounded-2xl p-12 text-center shadow-card max-w-xl mx-auto">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 text-aicte-navy-light flex items-center justify-center mx-auto mb-4 border border-blue-100">
                  <Inbox className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-heading">
                  No Complaints Registered Yet
                </h3>
                <p className="text-xs text-body mt-1 max-w-sm mx-auto leading-relaxed">
                  You haven't submitted any grievances yet. If you have an issue with admission, caution deposit, certificates, or faculty deficiencies, submit a formal petition now.
                </p>
                <button
                  onClick={() => setActiveTab('new-complaint')}
                  className="mt-6 px-5 py-2.5 rounded-xl bg-primary-gradient hover:opacity-95 text-white font-semibold text-xs transition-smooth shadow-xs inline-flex items-center space-x-2"
                >
                  <PlusCircle className="w-4 h-4 text-emerald-300" />
                  <span>Lodge Your First Grievance</span>
                </button>
              </div>
            ) : (
              /* Complaints Cards List */
              <div className="grid grid-cols-1 gap-4">
                {complaints.map((c) => (
                  <div
                    key={c.case_id}
                    className="bg-white border border-card-border hover:border-aicte-navy-light/40 rounded-2xl p-5 sm:p-6 shadow-card transition-smooth flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-aicte-navy bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
                          {c.case_id}
                        </span>
                        {getStatusBadge(c.status)}
                        <span className="text-3xs text-muted font-medium flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>Filed on: {c.received_date}</span>
                        </span>
                        {c.has_attachment && (
                          <span className="inline-flex items-center space-x-1 text-3xs font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
                            <Paperclip className="w-3 h-3" />
                            <span>Attachment: {c.attachment_name}</span>
                          </span>
                        )}
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-heading">
                          {c.institution_name}
                        </h3>
                        <div className="text-xs text-muted flex items-center space-x-2 mt-0.5">
                          <span>PID: {c.aicte_permanent_id}</span>
                          <span>•</span>
                          <span>{c.institution_state} ({c.institution_region} Region)</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 rounded-md text-2xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          {c.category}
                        </span>
                      </div>

                      <p className="text-xs text-body line-clamp-2 leading-relaxed pt-1">
                        {c.description}
                      </p>
                    </div>

                    <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 shrink-0 gap-2">
                      <button
                        onClick={() => handleOpenTracking(c.case_id)}
                        className="px-4 py-2 rounded-xl bg-slate-50 hover:bg-aicte-navy hover:text-white border border-card-border text-heading text-xs font-semibold transition-smooth flex items-center space-x-1.5 shadow-2xs group"
                      >
                        <Eye className="w-3.5 h-3.5 text-aicte-navy group-hover:text-white" />
                        <span>Track Grievance</span>
                        <ChevronRight className="w-3.5 h-3.5 text-muted group-hover:text-white" />
                      </button>

                      <div className="text-3xs text-muted text-right hidden md:block">
                        Expected Disposal: {c.expected_disposal_date}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}

        {/* TAB 2: RAISE NEW COMPLAINT FORM */}
        {activeTab === 'new-complaint' && (
          <div className="max-w-3xl mx-auto space-y-6">
            
            <div>
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-3xs font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>Statutory Grievance Filing</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-heading">
                Raise a New Formal Complaint
              </h1>
              <p className="text-xs text-body mt-1">
                Submit an institutional grievance directly to the AICTE Public Grievance Redressal Cell (PGRC).
              </p>
            </div>

            {formError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleComplaintSubmit} className="bg-white border border-card-border rounded-2xl p-6 sm:p-8 shadow-card space-y-6">
              
              {/* 1. Institution Selector */}
              <div>
                <label className="block text-2xs font-semibold text-body uppercase tracking-wider mb-1.5">
                  1. Select AICTE-Approved Institution <span className="text-red-500">*</span>
                </label>

                {selectedInstitution ? (
                  <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/50 flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <Building2 className="w-4 h-4 text-emerald-700" />
                        <span className="font-bold text-xs text-emerald-900">{selectedInstitution.name}</span>
                      </div>
                      <div className="text-2xs text-emerald-800 mt-1 space-x-2">
                        <span>AICTE Permanent ID: <strong className="font-mono">{selectedInstitution.aicte_permanent_id}</strong></span>
                        <span>•</span>
                        <span>{selectedInstitution.state} ({selectedInstitution.region} Region)</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedInstitution(null);
                        setSearchQuery('');
                      }}
                      className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline ml-2"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative">
                      <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search institution by name or AICTE Permanent ID (e.g. 1-10294811)..."
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs border border-card-border rounded-xl bg-white text-heading focus:outline-hidden focus:border-aicte-navy-light transition-smooth"
                      />
                    </div>

                    {/* Suggestions Dropdown */}
                    {institutionResults.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white border border-card-border rounded-xl shadow-lg z-50 divide-y divide-slate-100">
                        {institutionResults.map((inst) => (
                          <button
                            key={inst.aicte_permanent_id}
                            type="button"
                            onClick={() => {
                              setSelectedInstitution(inst);
                              setInstitutionResults([]);
                            }}
                            className="w-full text-left p-3 hover:bg-slate-50 transition-smooth flex flex-col"
                          >
                            <span className="text-xs font-semibold text-heading">{inst.name}</span>
                            <div className="flex items-center space-x-2 text-3xs text-muted mt-0.5">
                              <span className="font-mono font-medium text-aicte-navy">{inst.aicte_permanent_id}</span>
                              <span>•</span>
                              <span>{inst.state} ({inst.region})</span>
                              <span>•</span>
                              <span>{inst.type}</span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="text-3xs text-muted mt-1.5">
                      Type at least 2 characters to search across 10,000+ AICTE institutions.
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Category & Incident Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs font-semibold text-body uppercase tracking-wider mb-1.5">
                    2. Complaint Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs border border-card-border rounded-xl bg-white text-heading focus:outline-hidden focus:border-aicte-navy-light transition-smooth"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-body uppercase tracking-wider mb-1.5">
                    3. Date of Incident / Occurrence
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="date"
                      value={incidentDate}
                      onChange={(e) => setIncidentDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs border border-card-border rounded-xl bg-white text-heading focus:outline-hidden focus:border-aicte-navy-light transition-smooth"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Detailed Description */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-2xs font-semibold text-body uppercase tracking-wider">
                    4. Grievance Description & Facts <span className="text-red-500">*</span>
                  </label>
                  <span className="text-3xs text-muted font-mono">
                    {description.length} characters (min 15)
                  </span>
                </div>
                <textarea
                  required
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail the specific grievance, dates, communication with college authorities, and redressal sought..."
                  className="w-full p-3.5 text-xs border border-card-border rounded-xl bg-white text-heading focus:outline-hidden focus:border-aicte-navy-light transition-smooth"
                />
              </div>

              {/* 4. Optional Attachment */}
              <div>
                <label className="block text-2xs font-semibold text-body uppercase tracking-wider mb-1.5">
                  5. Supporting Evidence (Optional)
                </label>
                
                {attachment ? (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs">
                      <Paperclip className="w-4 h-4 text-aicte-navy" />
                      <span className="font-medium text-heading">{attachment.name}</span>
                      <span className="text-3xs text-muted">({attachment.size})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachment(null)}
                      className="text-xs text-red-600 hover:text-red-800 font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-card-border hover:border-aicte-navy-light/60 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-smooth bg-slate-50/50 hover:bg-slate-50">
                    <Upload className="w-6 h-6 text-muted mb-1" />
                    <span className="text-xs font-semibold text-heading">Click to upload document or screenshot</span>
                    <span className="text-3xs text-muted mt-0.5">PDF, PNG, JPG up to 5MB</span>
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {/* Declaration */}
              <div className="p-3 bg-blue-50/60 border border-blue-200/60 rounded-xl text-3xs text-blue-900 leading-relaxed">
                By submitting this petition, I declare that the facts stated above are true to the best of my knowledge and understand that false allegations may incur regulatory penalties under AICTE Act guidelines.
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('my-complaints')}
                  className="px-4 py-2.5 text-xs font-medium text-body hover:bg-slate-100 rounded-xl transition-smooth"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-primary-gradient hover:opacity-95 text-white font-semibold text-xs rounded-xl shadow-xs transition-smooth disabled:opacity-50 flex items-center space-x-2"
                >
                  <span>{submitting ? 'Submitting Petition...' : 'Submit Grievance to AICTE'}</span>
                  <PlusCircle className="w-4 h-4 text-emerald-300" />
                </button>
              </div>

            </form>

          </div>
        )}

      </main>

      {/* COMPLAINT TRACKING TIMELINE MODAL */}
      {trackingModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-card-border rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-card-border flex items-center justify-between sticky top-0 bg-white z-10">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-aicte-navy-light flex items-center justify-center border border-blue-100">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-heading">
                    Grievance Tracking & Status Timeline
                  </h3>
                  <div className="text-3xs text-muted flex items-center space-x-1.5 mt-0.5">
                    <span>Reference ID:</span>
                    <strong className="font-mono text-aicte-navy">{selectedCaseId}</strong>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setTrackingModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {loadingTracking ? (
                <div className="py-12 text-center text-xs text-muted space-y-2">
                  <div className="w-6 h-6 border-2 border-aicte-navy border-t-transparent rounded-full animate-spin mx-auto" />
                  <span>Retrieving verified timeline from national database...</span>
                </div>
              ) : trackingDetail ? (
                <>
                  {/* Case Summary Card */}
                  <div className="p-4 bg-slate-50 border border-card-border rounded-xl space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="font-bold text-xs text-heading">
                        {trackingDetail.complaint.institution_name}
                      </div>
                      {getStatusBadge(trackingDetail.complaint.status)}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-3xs text-muted border-t border-slate-200/60 pt-2.5">
                      <div>
                        <span className="block text-slate-400">Category:</span>
                        <span className="font-medium text-heading">{trackingDetail.complaint.category}</span>
                      </div>
                      <div>
                        <span className="block text-slate-400">Date Lodged:</span>
                        <span className="font-medium text-heading">{trackingDetail.complaint.received_date}</span>
                      </div>
                      <div>
                        <span className="block text-slate-400">Expected Disposal:</span>
                        <span className="font-medium text-heading">{trackingDetail.complaint.expected_disposal_date}</span>
                      </div>
                    </div>
                  </div>

                  {/* Public-Safe Timeline Stepper */}
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-4">
                      Official Milestone Progress
                    </h4>

                    <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                      {trackingDetail.timeline.map((event, idx) => (
                        <div key={event.id || idx} className="relative group">
                          {/* Dot */}
                          <div className={`absolute -left-[27px] top-1 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                            idx === trackingDetail.timeline.length - 1
                              ? 'border-emerald-500 bg-emerald-50'
                              : 'border-aicte-navy-light bg-blue-50'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              idx === trackingDetail.timeline.length - 1
                                ? 'bg-emerald-600'
                                : 'bg-aicte-navy'
                            }`} />
                          </div>

                          {/* Content */}
                          <div className="bg-white border border-card-border rounded-xl p-3.5 shadow-2xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-heading">
                                {event.title}
                              </span>
                              <span className="text-3xs text-muted font-mono">
                                {new Date(event.timestamp).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                            <p className="text-xs text-body mt-1 leading-relaxed">
                              {event.note}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl text-3xs text-amber-900 flex items-start space-x-2">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      Internal administrative assignments and officer notes are kept confidential under AICTE administrative rules. You will be notified via this timeline upon case closure or official committee action.
                    </span>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-xs text-red-600">
                  Could not load tracking details for this complaint.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-card-border flex justify-end">
              <button
                type="button"
                onClick={() => setTrackingModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-white border border-card-border text-heading hover:bg-slate-100 transition-smooth"
              >
                Close Tracking
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
