import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import CaseDetailModal from '../components/CaseDetailModal';
import { 
  Search, 
  Filter, 
  RotateCw, 
  ChevronLeft, 
  ChevronRight, 
  Eye,
  Plus,
  X,
  Building,
  Calendar,
  Send,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function AllCases({ triggerRefresh }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const initialStatus = searchParams.get('status') || 'ALL';
  const initialOverdue = searchParams.get('overdue') === 'true';

  const [cases, setCases] = useState([]);
  const [institutionsList, setInstitutionsList] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filters
  const [search, setSearch] = useState(initialSearch);
  const [bureau, setBureau] = useState('ALL');
  const [status, setStatus] = useState(initialStatus);
  const [region, setRegion] = useState('ALL');
  const [category, setCategory] = useState('ALL');
  const [priority, setPriority] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(initialOverdue);
  const [selectedCaseId, setSelectedCaseId] = useState(null);

  // Register New Case Modal State
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [newInstId, setNewInstId] = useState('');
  const [newCategory, setNewCategory] = useState('Faculty Deficiency & Qualification Mismatch');
  const [newBureau, setNewBureau] = useState('Regulation Bureau');
  const [newPriority, setNewPriority] = useState('High');
  const [newOfficer, setNewOfficer] = useState('Shri Anand Kumar Gupta');
  const [newDescription, setNewDescription] = useState('');
  const [newExpectedDate, setNewExpectedDate] = useState('');
  const [newComplainant, setNewComplainant] = useState('Faculty Member');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [registerError, setRegisterError] = useState('');

  useEffect(() => {
    loadCases();
  }, [pagination.page, bureau, status, region, category, priority, overdueOnly, dateFrom, dateTo, triggerRefresh]);

  useEffect(() => {
    // Load institutions for quick select
    api.getInstitutions().then(res => {
      setInstitutionsList(res.institutions || []);
      if (res.institutions && res.institutions.length > 0) {
        setNewInstId(res.institutions[0].aicte_permanent_id);
      }
    }).catch(() => {});
  }, []);

  async function loadCases() {
    setLoading(true);
    setError('');
    try {
      const res = await api.getCases({
        page: pagination.page,
        limit: 20,
        bureau,
        status,
        region,
        category,
        priority,
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
        overdue: overdueOnly ? 'true' : undefined,
        search
      });
      setCases(res.cases || []);
      setPagination(res.pagination || { page: 1, total: 0, totalPages: 1 });
    } catch (err) {
      setError(err.message || 'Failed to load case dockets');
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    setPagination(p => ({ ...p, page: 1 }));
    loadCases();
  }

  async function handleRegisterCaseSubmit(e) {
    e.preventDefault();
    if (!newDescription.trim() || !newInstId) return;

    setRegisterLoading(true);
    setRegisterError('');
    setRegisterSuccess('');

    try {
      const res = await api.createCase({
        aicte_permanent_id: newInstId,
        category: newCategory,
        description: newDescription,
        bureau: newBureau,
        priority: newPriority,
        assigned_officer: newOfficer,
        expected_disposal_date: newExpectedDate || undefined,
        complainant_type: newComplainant
      });

      setRegisterSuccess(`Case ${res.case_id} registered successfully against ${res.institution_name}.`);
      setNewDescription('');
      setTimeout(() => {
        setShowRegisterModal(false);
        setRegisterSuccess('');
        loadCases();
      }, 1500);
    } catch (err) {
      setRegisterError(err.message || 'Failed to register case');
    } finally {
      setRegisterLoading(false);
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

  const categoriesList = [
    'Faculty Deficiency & Qualification Mismatch',
    'Illegal Fee Surcharge & Capitation Levy',
    'Non-Refund of Caution Deposit & Fee Retention',
    'Withholding of Original Certificates & Marksheets',
    'Faculty Salary Arrears & 7th CPC Non-Compliance',
    'Unapproved Course & Illegal Seat Augmentation',
    'Infrastructural Non-Compliance & Deficient Labs',
    'Ragging & Non-Constitution of Anti-Ragging Cell',
    'Misleading Advertisements & Fake Affiliation Claims',
    'Irregular Examination Conduct & Attendance Tampering'
  ];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-8">
      
      {/* Title & Action Toolbar */}
      <div className="bg-white border border-card-border rounded-card p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-lg font-bold text-heading">
              Central Master Register of Cases
            </h1>
            <p className="text-2xs text-muted">
              Authoritative statutory repository of institutional grievances across all bureaus and regions
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowRegisterModal(true)}
              className="btn-saffron px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-saffron-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Register New Case</span>
            </button>

            <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2">
              <div className="relative">
                <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search ID, Institution, Category, Officer..."
                  className="pl-9 pr-3.5 py-2 text-xs border border-card-border rounded-lg bg-white text-heading w-64 focus:outline-hidden focus:border-aicte-navy-light transition-smooth"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-aicte-navy text-white text-xs font-semibold rounded-lg hover:bg-aicte-navy-mid transition-smooth"
              >
                Search
              </button>
            </form>
          </div>
        </div>

        {/* Multi-Dimensional Filters Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-slate-100 text-xs">
          <div className="flex items-center space-x-1 text-muted">
            <Filter className="w-3.5 h-3.5" />
            <span className="text-3xs font-semibold uppercase">Filters:</span>
          </div>

          {/* Bureau */}
          <select
            value={bureau}
            onChange={(e) => { setBureau(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
            className="text-xs px-2.5 py-1.5 border border-card-border rounded-lg bg-white text-body focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">All Bureaus</option>
            <option value="Regulation Bureau">Regulation Bureau</option>
            <option value="PGRC">PGRC</option>
            <option value="Approval Bureau">Approval Bureau</option>
            <option value="Regional Office">Regional Office</option>
          </select>

          {/* Category Filter */}
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
            className="text-xs px-2.5 py-1.5 border border-card-border rounded-lg bg-white text-body focus:outline-hidden cursor-pointer max-w-[200px] truncate"
          >
            <option value="ALL">All Categories</option>
            {categoriesList.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Status */}
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
            className="text-xs px-2.5 py-1.5 border border-card-border rounded-lg bg-white text-body focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Under Process">Under Process</option>
            <option value="Disposed">Disposed</option>
            <option value="Transferred">Transferred</option>
            <option value="Escalated">Escalated</option>
          </select>

          {/* Region */}
          <select
            value={region}
            onChange={(e) => { setRegion(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
            className="text-xs px-2.5 py-1.5 border border-card-border rounded-lg bg-white text-body focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">All Regions</option>
            <option value="Northern">Northern</option>
            <option value="Southern">Southern</option>
            <option value="Western">Western</option>
            <option value="Eastern">Eastern</option>
            <option value="Central">Central</option>
          </select>

          {/* Priority */}
          <select
            value={priority}
            onChange={(e) => { setPriority(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
            className="text-xs px-2.5 py-1.5 border border-card-border rounded-lg bg-white text-body focus:outline-hidden cursor-pointer"
          >
            <option value="ALL">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Date Range Filters */}
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-card-border px-2.5 py-1 rounded-lg">
            <span className="text-3xs text-muted uppercase font-semibold">From:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
              className="text-2xs bg-transparent text-heading focus:outline-hidden"
            />
            <span className="text-3xs text-muted uppercase font-semibold pl-1 border-l border-slate-200">To:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
              className="text-2xs bg-transparent text-heading focus:outline-hidden"
            />
          </div>

          {/* Overdue checkbox */}
          <label className="flex items-center space-x-1.5 cursor-pointer bg-slate-50 px-2.5 py-1.5 border border-card-border rounded-lg text-xs">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => { setOverdueOnly(e.target.checked); setPagination(p => ({ ...p, page: 1 })); }}
              className="rounded text-rose-600 focus:ring-0"
            />
            <span className="text-2xs font-semibold text-rose-700">Breached SLA Only</span>
          </label>

          <button
            onClick={loadCases}
            className="p-1.5 text-muted hover:text-heading ml-auto bg-slate-50 hover:bg-slate-100 border border-card-border rounded-lg transition-smooth"
            title="Refresh Table"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Cases Table Card */}
      <div className="bg-white border border-card-border rounded-card overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Case ID</th>
                <th>Received</th>
                <th>Institution Name & Location</th>
                <th>Grievance Category</th>
                <th>Bureau</th>
                <th>Officer</th>
                <th>Status</th>
                <th>Target SLA</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {cases && cases.length > 0 ? (
                cases.map((c) => {
                  const badge = getStatusBadge(c.status);
                  return (
                    <tr 
                      key={c.case_id}
                      onClick={() => setSelectedCaseId(c.case_id)}
                      className="cursor-pointer"
                    >
                      <td className="font-mono font-bold text-xs text-heading whitespace-nowrap">
                        {c.case_id}
                      </td>

                      <td className="font-mono text-2xs text-muted whitespace-nowrap">
                        {c.received_date}
                      </td>

                      <td>
                        <div className="font-semibold text-heading text-xs">
                          {c.institution_name}
                        </div>
                        <div className="text-2xs text-muted font-mono">
                          {c.aicte_permanent_id} • {c.institution_state}
                        </div>
                      </td>

                      <td className="text-body text-xs max-w-xs">
                        <div className="truncate">{c.category}</div>
                      </td>

                      <td className="whitespace-nowrap text-2xs font-medium text-heading">
                        {c.bureau}
                      </td>

                      <td className="whitespace-nowrap text-2xs text-muted">
                        {c.assigned_officer}
                      </td>

                      <td className="whitespace-nowrap">
                        <span className={`inline-flex items-center text-2xs font-semibold px-2 py-0.5 rounded-full border ${badge.bg} ${badge.text} ${badge.border}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot} mr-1.5`} />
                          {c.status}
                        </span>
                      </td>

                      <td className="whitespace-nowrap font-mono text-2xs">
                        <span className={c.is_overdue ? 'text-red-600 font-bold' : 'text-body'}>
                          {c.expected_disposal_date}
                        </span>
                        {c.is_overdue === 1 && (
                          <span className="block text-3xs font-semibold text-red-600">OVERDUE</span>
                        )}
                      </td>

                      <td className="text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCaseId(c.case_id);
                          }}
                          className="px-3 py-1 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-card-border rounded-lg transition-smooth inline-flex items-center space-x-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="9" className="text-center py-12 text-muted">
                    {loading ? 'Retrieving case dockets...' : 'No cases match your specified filters.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        <div className="px-6 py-4 bg-slate-50/60 border-t border-card-border flex items-center justify-between text-xs text-body">
          <div>
            Showing <strong className="text-heading">{cases.length}</strong> of{' '}
            <strong className="text-heading">{pagination.total}</strong> dockets
          </div>

          <div className="flex items-center space-x-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
              className="p-1.5 rounded-lg border border-card-border bg-white hover:bg-slate-100 disabled:opacity-40 transition-smooth"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-xs px-2 font-medium">
              Page {pagination.page} / {pagination.totalPages || 1}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
              className="p-1.5 rounded-lg border border-card-border bg-white hover:bg-slate-100 disabled:opacity-40 transition-smooth"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Register New Case Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-card-border shadow-drawer w-full max-w-xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-card-border pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-heading">
                    Register New Institutional Case
                  </h3>
                  <p className="text-2xs text-muted">Enter formal grievance docket into central registry</p>
                </div>
              </div>
              <button
                onClick={() => setShowRegisterModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-smooth"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {registerSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{registerSuccess}</span>
              </div>
            )}

            {registerError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{registerError}</span>
              </div>
            )}

            <form onSubmit={handleRegisterCaseSubmit} className="space-y-3.5 text-xs">
              {/* Institution Select */}
              <div>
                <label className="block text-2xs font-semibold text-body uppercase tracking-wider mb-1">
                  Target Technical Institution *
                </label>
                <select
                  value={newInstId}
                  onChange={(e) => setNewInstId(e.target.value)}
                  className="w-full text-xs p-2.5 border border-card-border rounded-xl bg-white text-heading focus:outline-hidden focus:border-aicte-navy-light"
                  required
                >
                  {institutionsList.map(inst => (
                    <option key={inst.aicte_permanent_id} value={inst.aicte_permanent_id}>
                      {inst.name} ({inst.state} - {inst.aicte_permanent_id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Category & Bureau */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-body uppercase tracking-wider mb-1">
                    Grievance Category *
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full text-xs p-2.5 border border-card-border rounded-xl bg-white text-heading focus:outline-hidden focus:border-aicte-navy-light"
                  >
                    {categoriesList.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-body uppercase tracking-wider mb-1">
                    Bureau Handling *
                  </label>
                  <select
                    value={newBureau}
                    onChange={(e) => {
                      setNewBureau(e.target.value);
                      if (e.target.value === 'PGRC') setNewOfficer('Smt. Manjula Sundaram');
                      else if (e.target.value === 'Regulation Bureau') setNewOfficer('Shri Anand Kumar Gupta');
                      else if (e.target.value === 'Approval Bureau') setNewOfficer('Er. Vikramaditya Rathore');
                      else setNewOfficer('Dr. K. Venkatesh Rao');
                    }}
                    className="w-full text-xs p-2.5 border border-card-border rounded-xl bg-white text-heading focus:outline-hidden focus:border-aicte-navy-light"
                  >
                    <option value="Regulation Bureau">Regulation Bureau (RB)</option>
                    <option value="PGRC">Public Grievance (PGRC)</option>
                    <option value="Approval Bureau">Approval Bureau</option>
                    <option value="Regional Office">Regional Office</option>
                  </select>
                </div>
              </div>

              {/* Officer & Priority */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-body uppercase tracking-wider mb-1">
                    Assigned Officer
                  </label>
                  <input
                    type="text"
                    value={newOfficer}
                    onChange={(e) => setNewOfficer(e.target.value)}
                    className="w-full text-xs p-2.5 border border-card-border rounded-xl bg-white text-heading focus:outline-hidden focus:border-aicte-navy-light"
                    required
                  />
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-body uppercase tracking-wider mb-1">
                    Priority Level
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full text-xs p-2.5 border border-card-border rounded-xl bg-white text-heading focus:outline-hidden focus:border-aicte-navy-light"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              {/* Complainant & Expected Disposal Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-2xs font-semibold text-body uppercase tracking-wider mb-1">
                    Complainant Type
                  </label>
                  <select
                    value={newComplainant}
                    onChange={(e) => setNewComplainant(e.target.value)}
                    className="w-full text-xs p-2.5 border border-card-border rounded-xl bg-white text-heading focus:outline-hidden focus:border-aicte-navy-light"
                  >
                    <option value="Student / Scholar">Student / Scholar</option>
                    <option value="Faculty Member">Faculty Member</option>
                    <option value="Parent / Guardian">Parent / Guardian</option>
                    <option value="Non-Teaching Staff">Non-Teaching Staff</option>
                    <option value="Whistleblower">Whistleblower</option>
                    <option value="Public Citizen">Public Citizen</option>
                  </select>
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-body uppercase tracking-wider mb-1">
                    Target Disposal Date (SLA)
                  </label>
                  <input
                    type="date"
                    value={newExpectedDate}
                    onChange={(e) => setNewExpectedDate(e.target.value)}
                    className="w-full text-xs p-2.5 border border-card-border rounded-xl bg-white text-heading focus:outline-hidden focus:border-aicte-navy-light"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-2xs font-semibold text-body uppercase tracking-wider mb-1">
                  Allegation & Summary *
                </label>
                <textarea
                  rows="3"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Provide concise grievance summary per AICTE Approval Process Handbook guidelines..."
                  className="w-full text-xs p-2.5 border border-card-border rounded-xl bg-white text-heading focus:outline-hidden focus:border-aicte-navy-light"
                  required
                />
              </div>

              <div className="flex justify-end space-x-2.5 pt-2 border-t border-card-border">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 text-xs font-medium text-body hover:bg-slate-100 border border-card-border rounded-lg transition-smooth"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registerLoading}
                  className="btn-saffron px-5 py-2 text-xs rounded-lg flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{registerLoading ? 'Registering...' : 'Register Docket'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Case Detail Slide-in Drawer */}
      {selectedCaseId && (
        <CaseDetailModal
          caseId={selectedCaseId}
          onClose={() => setSelectedCaseId(null)}
          onActionLogged={loadCases}
        />
      )}

    </div>
  );
}
