import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import KpiCard from '../components/KpiCard';
import CaseDetailModal from '../components/CaseDetailModal';
import { 
  FileText, 
  Clock, 
  RotateCw, 
  CheckCircle, 
  ArrowUpRight, 
  AlertTriangle, 
  AlertOctagon,
  Building,
  Filter,
  Eye,
  Layers,
  ChevronRight,
  TrendingUp,
  Activity,
  Calendar,
  Sparkles
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

export default function Dashboard({ triggerRefresh }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bureauFilter, setBureauFilter] = useState('ALL');
  const [regionFilter, setRegionFilter] = useState('ALL');
  const [selectedCaseId, setSelectedCaseId] = useState(null);

  useEffect(() => {
    fetchDashboard();
  }, [bureauFilter, regionFilter, triggerRefresh]);

  async function fetchDashboard() {
    setLoading(true);
    setError('');
    try {
      const res = await api.getDashboardSummary({
        bureau: bureauFilter,
        region: regionFilter
      });
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  }

  // Official Status Colors (never used as card background, only for dots/badges/charts)
  const STATUS_COLORS = {
    'Pending': '#F59E0B',       // Amber
    'Under Process': '#2563EB', // Blue
    'Disposed': '#16A34A',      // Green
    'Transferred': '#7C3AED',   // Purple
    'Escalated': '#DC2626'      // Red
  };

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

  const kpis = data?.kpis || {};
  const charts = data?.charts || {};
  const overlaps = data?.overlappingCases || { count: 0, items: [] };
  const recentActivity = data?.recentActivity || [];

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const officerName = user?.full_name || 'Authorised Official';
  const currentDateFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-8">
      
      {/* 1. Hero Summary Banner with Primary Navy Gradient */}
      <div className="bg-primary-gradient rounded-card p-6 text-white shadow-card relative overflow-hidden flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Decorative subtle ambient ring */}
        <div className="absolute right-0 top-0 -mt-12 -mr-12 w-80 h-80 rounded-full bg-white/5 pointer-events-none blur-2xl" />

        <div className="space-y-1.5 z-10">
          <div className="flex items-center space-x-2 text-white/80 text-xs font-medium">
            <Calendar className="w-3.5 h-3.5 text-amber-400" />
            <span>{currentDateFormatted}</span>
            <span className="text-white/40">•</span>
            <span>AICTE Central Secretariat</span>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            {greeting}, {officerName}
          </h1>

          <p className="text-xs sm:text-sm text-white/90 font-medium">
            {overlaps.count > 0 ? (
              <span className="inline-flex items-center">
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-2 animate-pulse" />
                <strong>{overlaps.count} institutions</strong> require cross-bureau coordination between Regulation Bureau and PGRC.
              </span>
            ) : (
              'All institutional grievance channels operating within standard regulatory timelines.'
            )}
          </p>
        </div>

        {/* Hero Call to Action Button */}
        <div className="z-10 shrink-0">
          <button
            onClick={() => navigate('/overlaps')}
            className="btn-saffron px-5 py-2.5 rounded-lg text-xs font-semibold flex items-center space-x-2 shadow-saffron-sm"
          >
            <Layers className="w-4 h-4" />
            <span>Review Overlaps</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Filter & Context Toolbar */}
      <div className="bg-white border border-card-border rounded-card p-3.5 shadow-card flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2 text-xs text-body">
          <Filter className="w-4 h-4 text-muted" />
          <span className="font-semibold text-heading">Filter Dashboard:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Bureau Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-card-border px-3 py-1.5 rounded-lg">
            <span className="text-3xs font-semibold text-muted uppercase">Bureau:</span>
            <select
              value={bureauFilter}
              onChange={(e) => setBureauFilter(e.target.value)}
              className="bg-transparent font-medium text-heading text-xs focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">All Bureaus (Central View)</option>
              <option value="Regulation Bureau">Regulation Bureau (RB)</option>
              <option value="PGRC">PGRC (Public Grievance)</option>
              <option value="Approval Bureau">Approval Bureau</option>
              <option value="Regional Office">Regional Offices</option>
            </select>
          </div>

          {/* Region Filter */}
          <div className="flex items-center space-x-1.5 bg-slate-50 border border-card-border px-3 py-1.5 rounded-lg">
            <span className="text-3xs font-semibold text-muted uppercase">Region:</span>
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              className="bg-transparent font-medium text-heading text-xs focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">All AICTE Regions</option>
              <option value="Northern">Northern Region</option>
              <option value="Southern">Southern Region</option>
              <option value="Western">Western Region</option>
              <option value="Eastern">Eastern Region</option>
              <option value="Central">Central Region</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            onClick={fetchDashboard}
            title="Refresh database metrics"
            className="p-2 text-body hover:text-heading bg-slate-50 hover:bg-slate-100 border border-card-border rounded-lg transition-smooth"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3. KPI Metrics Row: 6 Equal Cards in One Row with White Background */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          title="Total Cases"
          value={kpis.total}
          icon={FileText}
          subtext="Master institutional register"
          iconGradient="from-slate-100 to-slate-200"
          iconColor="text-slate-700"
          onClick={() => navigate('/cases')}
        />

        <KpiCard
          title="Pending Review"
          value={kpis.pending}
          icon={Clock}
          subtext="Awaiting preliminary scrutiny"
          badge="Initial"
          badgeType="pending"
          iconGradient="from-amber-100 to-amber-200"
          iconColor="text-amber-700"
          onClick={() => navigate('/cases?status=Pending')}
        />

        <KpiCard
          title="Under Process"
          value={kpis.under_process}
          icon={RotateCw}
          subtext="Active scrutiny & hearings"
          badge="Active"
          badgeType="process"
          iconGradient="from-blue-100 to-blue-200"
          iconColor="text-blue-700"
          onClick={() => navigate('/cases?status=Under Process')}
        />

        <KpiCard
          title="Disposed"
          value={kpis.disposed}
          icon={CheckCircle}
          subtext="Speaking orders issued"
          badge="Resolved"
          badgeType="disposed"
          iconGradient="from-emerald-100 to-emerald-200"
          iconColor="text-emerald-700"
          onClick={() => navigate('/cases?status=Disposed')}
        />

        <KpiCard
          title="Escalated"
          value={kpis.escalated}
          icon={AlertTriangle}
          subtext="Referred to Council"
          badge="Special"
          badgeType="escalated"
          iconGradient="from-red-100 to-red-200"
          iconColor="text-red-700"
          onClick={() => navigate('/cases?status=Escalated')}
        />

        {/* Overdue Card: ONLY card with red accent left border */}
        <KpiCard
          title="Overdue (SLA)"
          value={kpis.overdue}
          icon={AlertOctagon}
          subtext={kpis.approaching_sla ? `${kpis.approaching_sla} due in ≤7 days` : 'Past target disposal'}
          badge="Breached"
          badgeType="overdue"
          isOverdue={true}
          iconGradient="from-rose-100 to-rose-200"
          iconColor="text-rose-700"
          onClick={() => navigate('/cases?overdue=true')}
        />
      </div>

      {/* 4. Potential Overlapping Cases Panel (Max 5 rows, compact chips, No inline dumps) */}
      <div className="bg-white border border-card-border rounded-card shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-card-border flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-heading">
                Potential Overlapping Cases
              </h2>
              <p className="text-2xs text-muted">
                Institutions simultaneously undergoing parallel inquiries across Regulation Bureau and PGRC
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-2xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              {overlaps.count} Active Duplications
            </span>
            <button
              onClick={() => navigate('/overlaps')}
              className="text-xs font-semibold text-aicte-navy-light hover:text-aicte-navy transition-smooth flex items-center space-x-1"
            >
              <span>View All</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Institution Name</th>
                <th>Region & State</th>
                <th className="text-center">RB Cases</th>
                <th className="text-center">PGRC Cases</th>
                <th>Recent Case Dockets</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {overlaps.items && overlaps.items.length > 0 ? (
                // Only show max 5 rows per user instruction
                overlaps.items.slice(0, 5).map((inst) => {
                  const rbCases = inst.cases.filter(c => c.bureau === 'Regulation Bureau');
                  const pgrcCases = inst.cases.filter(c => c.bureau === 'PGRC');
                  const totalDockets = inst.cases.length;
                  const firstTwo = inst.cases.slice(0, 2);
                  const remainingCount = totalDockets - 2;

                  return (
                    <tr key={inst.aicte_permanent_id}>
                      <td className="font-medium text-heading">
                        <div className="font-semibold text-heading text-xs">
                          {inst.institution_name}
                        </div>
                        <div className="text-2xs text-muted font-mono mt-0.5">
                          ID: {inst.aicte_permanent_id}
                        </div>
                      </td>

                      <td className="text-body text-xs whitespace-nowrap">
                        {inst.region} Region ({inst.state})
                      </td>

                      <td className="text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {inst.rb_open_count} RB
                        </span>
                      </td>

                      <td className="text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          {inst.pgrc_open_count} PGRC
                        </span>
                      </td>

                      {/* Clean compact chips: Max 2 chips + "+N more" label. Never dumping all IDs! */}
                      <td>
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          {firstTwo.map((c) => (
                            <button
                              key={c.case_id}
                              onClick={() => setSelectedCaseId(c.case_id)}
                              className="font-mono text-3xs px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-medium transition-smooth"
                              title={`${c.bureau}: ${c.category}`}
                            >
                              {c.case_id}
                            </button>
                          ))}
                          {remainingCount > 0 && (
                            <span 
                              onClick={() => navigate('/overlaps')}
                              className="text-3xs text-muted font-medium hover:text-heading cursor-pointer pl-1"
                            >
                              +{remainingCount} more
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="text-right whitespace-nowrap">
                        <button
                          onClick={() => navigate('/overlaps')}
                          className="px-3 py-1 text-xs font-medium text-aicte-navy-mid bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-smooth inline-flex items-center space-x-1"
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
                  <td colSpan="6" className="text-center py-8 text-muted">
                    No overlapping cases found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Analytics Charts Grid (4 Rounded Cards, 12px Radius, Clean Gridlines) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Donut Chart for Status Split */}
        <div className="bg-white border border-card-border rounded-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-heading">
                Status Distribution
              </h3>
              <p className="text-2xs text-muted">Active and resolved grievance workflow stages</p>
            </div>
            <span className="text-3xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-muted">
              Live Breakdown
            </span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.statusDistribution || []}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                >
                  {(charts.statusDistribution || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status] || '#94A3B8'} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', color: '#FFF', fontSize: '12px', borderRadius: '8px' }}
                  itemStyle={{ color: '#FFF' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36} 
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Bureau-wise Workload Bar Chart */}
        <div className="bg-white border border-card-border rounded-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-heading">
                Bureau Workload Comparison
              </h3>
              <p className="text-2xs text-muted">Active inquiries, closed cases, and SLA breaches</p>
            </div>
            <span className="text-3xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-muted">
              Workload Split
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.bureauWorkload || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis 
                  dataKey="bureau" 
                  tick={{ fontSize: 11, fill: '#64748B' }} 
                  tickFormatter={(val) => val === 'Regulation Bureau' ? 'RB' : (val === 'Approval Bureau' ? 'Approval' : (val === 'Regional Office' ? 'Regional' : val))}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', color: '#FFF', fontSize: '12px', borderRadius: '8px' }}
                  itemStyle={{ color: '#FFF' }}
                />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '11px', paddingBottom: '12px' }} />
                <Bar dataKey="active" name="Active Open" fill="#1D6FD1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="disposed" name="Disposed" fill="#16A34A" radius={[4, 4, 0, 0]} />
                <Bar dataKey="overdue" name="SLA Breached" fill="#DC2626" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Region-wise Case Volume */}
        <div className="bg-white border border-card-border rounded-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-heading">
                Regional Jurisdiction Volume
              </h3>
              <p className="text-2xs text-muted">Inquiries distributed across the 5 AICTE regions</p>
            </div>
            <span className="text-3xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-muted">
              Statutory Regions
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.regionDistribution || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="region" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', color: '#FFF', fontSize: '12px', borderRadius: '8px' }}
                  itemStyle={{ color: '#FFF' }}
                />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '11px', paddingBottom: '12px' }} />
                <Bar dataKey="total_cases" name="Total Cases" fill="#0B2545" radius={[4, 4, 0, 0]} />
                <Bar dataKey="active_cases" name="Active Open" fill="#F59E0B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Monthly Filing & Disposal Timeline */}
        <div className="bg-white border border-card-border rounded-card p-5 shadow-card">
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-heading">
                Monthly Intake & Disposal Trend
              </h3>
              <p className="text-2xs text-muted">Intake velocity vs formal disposal speaking orders</p>
            </div>
            <span className="text-3xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-muted">
              Trendline
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.monthlyTrend || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', color: '#FFF', fontSize: '12px', borderRadius: '8px' }}
                  itemStyle={{ color: '#FFF' }}
                />
                <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: '11px', paddingBottom: '12px' }} />
                <Line type="monotone" dataKey="received" name="Received" stroke="#0B2545" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="resolved" name="Disposed" stroke="#16A34A" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* 6. Recent Procedural Actions & Official Log Feed */}
      <div className="bg-white border border-card-border rounded-card shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-card-border flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-heading">
                Recent Procedural Actions & Case Activity
              </h2>
              <p className="text-2xs text-muted">
                Audit trail of notices, hearings, inspections and decisions across all bureaus
              </p>
            </div>
          </div>
          <span className="text-2xs font-mono font-medium text-muted">
            Last {recentActivity.length} Events
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="premium-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Case ID</th>
                <th>Institution</th>
                <th>Action Taken</th>
                <th>Officer & Bureau</th>
                <th>Status</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.map((act) => {
                const badge = getStatusBadge(act.status);
                return (
                  <tr key={act.id}>
                    <td className="font-mono text-xs text-muted whitespace-nowrap">
                      {act.timestamp}
                    </td>

                    <td className="font-mono font-bold text-xs text-heading whitespace-nowrap">
                      {act.case_id}
                    </td>

                    <td>
                      <div className="font-medium text-heading text-xs truncate max-w-xs">
                        {act.institution_name}
                      </div>
                      <div className="text-2xs text-muted font-mono">
                        {act.aicte_permanent_id}
                      </div>
                    </td>

                    <td className="text-xs text-body">
                      <div className="font-medium text-heading">{act.action}</div>
                      {act.remarks && (
                        <div className="text-2xs text-muted italic line-clamp-1 mt-0.5">
                          "{act.remarks}"
                        </div>
                      )}
                    </td>

                    <td className="text-2xs whitespace-nowrap">
                      <span className="font-semibold text-heading block">{act.by_officer}</span>
                      <span className="text-muted">[{act.bureau}]</span>
                    </td>

                    <td className="whitespace-nowrap">
                      <span className={`inline-flex items-center text-2xs font-semibold px-2 py-0.5 rounded-full border ${badge.bg} ${badge.text} ${badge.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot} mr-1`} />
                        {act.status}
                      </span>
                    </td>

                    <td className="text-right whitespace-nowrap">
                      <button
                        onClick={() => setSelectedCaseId(act.case_id)}
                        className="px-3 py-1 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-smooth"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Case Detail Slide-in Drawer */}
      {selectedCaseId && (
        <CaseDetailModal
          caseId={selectedCaseId}
          onClose={() => setSelectedCaseId(null)}
          onActionLogged={fetchDashboard}
        />
      )}

    </div>
  );
}
