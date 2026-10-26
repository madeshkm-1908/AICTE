import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Building, Search, Filter, RotateCw, ExternalLink, X } from 'lucide-react';

export default function Institutions({ triggerRefresh }) {
  const navigate = useNavigate();
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('ALL');
  const [selectedInst, setSelectedInst] = useState(null);

  useEffect(() => {
    loadInstitutions();
  }, [region, triggerRefresh]);

  async function loadInstitutions() {
    setLoading(true);
    try {
      const res = await api.getInstitutions({ region, search });
      setInstitutions(res.institutions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    loadInstitutions();
  }

  async function openInstitutionModal(id) {
    try {
      const res = await api.getInstitutionDetail(id);
      setSelectedInst(res);
    } catch (err) {
      alert(err.message || 'Failed to load institution details');
    }
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-8">
      {/* Title & Filter Bar */}
      <div className="bg-white border border-card-border rounded-card p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-heading">
              AICTE Approved Technical Institutions Register
            </h1>
            <p className="text-2xs text-muted">
              Master institutional profiles and aggregate compliance risk tracking across all 5 AICTE regions
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, Permanent ID, or state..."
                className="pl-9 pr-3.5 py-2 text-xs border border-card-border rounded-lg bg-white text-heading w-64 focus:outline-hidden focus:border-aicte-navy-light transition-smooth"
              />
            </div>

            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="text-xs px-3 py-2 border border-card-border rounded-lg bg-white text-body focus:outline-hidden"
            >
              <option value="ALL">All Regions</option>
              <option value="Northern">Northern</option>
              <option value="Southern">Southern</option>
              <option value="Western">Western</option>
              <option value="Eastern">Eastern</option>
              <option value="Central">Central</option>
            </select>

            <button
              type="submit"
              className="px-4 py-2 bg-aicte-navy text-white text-xs font-semibold rounded-lg hover:bg-aicte-navy-mid transition-smooth"
            >
              Filter
            </button>
          </form>
        </div>
      </div>

      {/* Institutions Data Table */}
      <div className="bg-white border border-card-border rounded-card overflow-hidden shadow-card">
        <div className="overflow-x-auto">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Permanent ID</th>
                <th>Institution Name</th>
                <th>State & Region</th>
                <th>Category</th>
                <th className="text-center">Total Cases</th>
                <th className="text-center">Active Cases</th>
                <th className="text-center">RB Active</th>
                <th className="text-center">PGRC Active</th>
                <th className="text-center">SLA Breached</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {institutions && institutions.length > 0 ? (
                institutions.map((inst) => (
                  <tr key={inst.aicte_permanent_id}>
                    <td className="font-mono font-bold text-xs text-heading whitespace-nowrap">
                      {inst.aicte_permanent_id}
                    </td>

                    <td>
                      <button
                        onClick={() => navigate(`/institutions/${inst.aicte_permanent_id}`)}
                        className="text-left group"
                      >
                        <div className="font-semibold text-heading text-xs group-hover:text-aicte-navy-light transition-smooth">
                          {inst.name}
                        </div>
                        <div className="text-2xs text-muted truncate max-w-sm mt-0.5">
                          {inst.address}
                        </div>
                      </button>
                    </td>

                    <td className="whitespace-nowrap text-2xs text-body">
                      {inst.state} ({inst.region})
                    </td>

                    <td className="whitespace-nowrap text-2xs text-muted">
                      {inst.type}
                    </td>

                    <td className="text-center font-mono text-xs text-body">
                      {inst.total_cases}
                    </td>

                    <td className="text-center">
                      <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-heading border border-slate-200">
                        {inst.active_cases}
                      </span>
                    </td>

                    <td className="text-center font-mono text-xs text-blue-700 font-semibold">
                      {inst.rb_active || 0}
                    </td>

                    <td className="text-center font-mono text-xs text-amber-700 font-semibold">
                      {inst.pgrc_active || 0}
                    </td>

                    <td className="text-center font-mono text-xs">
                      {inst.overdue_cases > 0 ? (
                        <span className="font-bold text-red-600 px-2 py-0.5 rounded-full bg-red-50 border border-red-200">
                          {inst.overdue_cases}
                        </span>
                      ) : (
                        <span className="text-muted">0</span>
                      )}
                    </td>

                    <td className="text-right whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/institutions/${inst.aicte_permanent_id}`)}
                        className="px-3 py-1 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-card-border rounded-lg transition-smooth inline-flex items-center space-x-1"
                      >
                        <Building className="w-3 h-3 text-slate-500" />
                        <span>Profile Dossier</span>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="text-center py-12 text-muted">
                    {loading ? 'Retrieving institution records...' : 'No institutions found matching criteria.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Institution Details Modal */}
      {selectedInst && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-card-border shadow-drawer w-full max-w-3xl max-h-[90vh] flex flex-col p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-card-border pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-muted">{selectedInst.institution.aicte_permanent_id}</span>
                <h2 className="text-sm font-bold text-heading mt-0.5">{selectedInst.institution.name}</h2>
                <p className="text-2xs text-muted">{selectedInst.institution.address} • {selectedInst.institution.state}</p>
              </div>
              <button
                onClick={() => setSelectedInst(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-smooth"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3">
              <span className="text-3xs font-bold text-muted uppercase tracking-wider block">
                Full Complaint & Grievance History ({selectedInst.cases.length} records)
              </span>
              <table className="premium-table">
                <thead>
                  <tr>
                    <th>Case ID</th>
                    <th>Bureau</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Received</th>
                    <th>Target Date</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInst.cases.map(c => (
                    <tr key={c.case_id}>
                      <td className="font-mono font-bold text-heading text-xs">{c.case_id}</td>
                      <td className="text-2xs font-medium text-body">{c.bureau}</td>
                      <td className="text-xs text-body">{c.category}</td>
                      <td>
                        <span className="px-2 py-0.5 rounded-full text-2xs font-semibold bg-slate-100 text-body border border-slate-200">
                          {c.status}
                        </span>
                      </td>
                      <td className="font-mono text-2xs text-muted">{c.received_date}</td>
                      <td className="font-mono text-2xs text-body">{c.expected_disposal_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
