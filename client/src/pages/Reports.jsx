import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  BarChart3, 
  FileSpreadsheet, 
  Download, 
  Printer, 
  RotateCw, 
  Calendar, 
  Filter, 
  Building2, 
  Clock, 
  Layers, 
  TrendingUp, 
  ShieldCheck,
  CheckCircle2,
  PieChart as PieIcon
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell, 
  AreaChart, 
  Area 
} from 'recharts';

export default function Reports() {
  const [reportType, setReportType] = useState('bureau');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [reportType, dateFrom, dateTo]);

  async function loadReport() {
    setLoading(true);
    try {
      const res = await api.getReport(reportType, { from: dateFrom, to: dateTo });
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handlePreset(range) {
    const today = new Date().toISOString().split('T')[0];
    if (range === 'ALL') {
      setDateFrom('');
      setDateTo('');
    } else if (range === '30D') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setDateFrom(d.toISOString().split('T')[0]);
      setDateTo(today);
    } else if (range === '90D') {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      setDateFrom(d.toISOString().split('T')[0]);
      setDateTo(today);
    } else if (range === 'YTD') {
      setDateFrom('2026-01-01');
      setDateTo(today);
    }
  }

  // Export Table Data to CSV
  function exportCSV() {
    if (!data || !data.table || data.table.length === 0) return;

    const headers = Object.keys(data.table[0]);
    const csvRows = [];
    csvRows.push(headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','));

    data.table.forEach(row => {
      const values = headers.map(h => {
        const val = row[h] !== null && row[h] !== undefined ? String(row[h]) : '';
        return `"${val.replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(','));
    });

    const csvBlob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(csvBlob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `AICTE_Statutory_Report_${reportType}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Export to Print/PDF
  function exportPDF() {
    window.print();
  }

  const reportTabs = [
    { id: 'bureau', label: 'Bureau-Wise Workload', icon: Building2 },
    { id: 'region', label: 'Region-Wise Caseload', icon: Layers },
    { id: 'institution', label: 'Institution-Wise History', icon: BarChart3 },
    { id: 'ageing', label: 'Pending Ageing (0-90+ Days)', icon: Clock },
    { id: 'disposal_rate', label: 'Disposal Rate & Turnaround', icon: CheckCircle2 },
    { id: 'overlaps', label: 'Cross-Bureau Overlaps', icon: FileSpreadsheet },
    { id: 'performance', label: 'Monthly/Quarterly Performance', icon: TrendingUp }
  ];

  const CHART_COLORS = ['#1D6FD1', '#F59E0B', '#16A34A', '#DC2626', '#7C3AED', '#06B6D4'];

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      
      {/* Title & Action Bar */}
      <div className="bg-white border border-card-border rounded-card p-6 shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-aicte-navy/10 flex items-center justify-center text-aicte-navy">
                <BarChart3 className="w-4 h-4" />
              </div>
              <h1 className="text-lg font-bold text-heading">
                AICTE Statutory Reports & Council Briefings
              </h1>
            </div>
            <p className="text-xs text-muted mt-1">
              Data-verified statutory summaries across bureaus, jurisdictional regions, institutional risk profiles, and pending-docket ageing
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={exportCSV}
              disabled={loading || !data}
              className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-card-border rounded-lg text-xs font-semibold text-heading transition-smooth inline-flex items-center space-x-1.5 shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={exportPDF}
              disabled={loading || !data}
              className="px-3.5 py-2 bg-aicte-navy text-white rounded-lg text-xs font-semibold hover:bg-aicte-navy-mid transition-smooth inline-flex items-center space-x-1.5 shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Export PDF / Print</span>
            </button>
          </div>
        </div>

        {/* Report Selector Tabs */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-2 border-b border-slate-100 scrollbar-none">
          {reportTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = reportType === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setReportType(tab.id)}
                className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-smooth inline-flex items-center space-x-1.5 ${
                  isActive 
                    ? 'bg-aicte-navy text-white font-semibold shadow-xs' 
                    : 'text-body hover:bg-slate-100 hover:text-heading'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Date Filters & Presets */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-2xs text-muted font-medium">From:</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-xs px-2.5 py-1.5 border border-card-border rounded-lg bg-white text-body focus:outline-hidden"
              />
            </div>

            <div className="flex items-center space-x-1.5 text-xs">
              <span className="text-2xs text-muted font-medium">To:</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-xs px-2.5 py-1.5 border border-card-border rounded-lg bg-white text-body focus:outline-hidden"
              />
            </div>

            <div className="flex items-center space-x-1 pl-2">
              <button
                onClick={() => handlePreset('30D')}
                className="px-2.5 py-1 text-2xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-smooth"
              >
                Last 30D
              </button>
              <button
                onClick={() => handlePreset('90D')}
                className="px-2.5 py-1 text-2xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-smooth"
              >
                Last 90D
              </button>
              <button
                onClick={() => handlePreset('YTD')}
                className="px-2.5 py-1 text-2xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-smooth"
              >
                FY 2026
              </button>
              <button
                onClick={() => handlePreset('ALL')}
                className="px-2.5 py-1 text-2xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-smooth"
              >
                All Time
              </button>
            </div>
          </div>

          <button
            onClick={loadReport}
            className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-50 border border-slate-200 rounded-lg ml-auto"
            title="Refresh Report Data"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Highlights Row */}
      {data && data.kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.entries(data.kpis).map(([k, v]) => (
            <div key={k} className="bg-white border border-card-border rounded-card p-4 shadow-card">
              <span className="text-3xs font-bold text-muted uppercase tracking-wider block">
                {k.replace(/_/g, ' ')}
              </span>
              <div className="text-2xl font-bold font-mono text-heading mt-1 tabular-nums">
                {typeof v === 'number' && k.includes('pct') || k.includes('rate') ? `${v}%` : v}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Chart Card */}
      <div className="bg-white border border-card-border rounded-card p-6 shadow-card space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-semibold text-heading">
              {data ? data.title : 'Analytical Visualization'}
            </h2>
            <p className="text-2xs text-muted">Comparative breakdown rendered from live SQLite registry</p>
          </div>
          <span className="text-3xs font-mono font-medium px-2 py-0.5 rounded bg-slate-100 text-muted">
            Report Type: {reportType}
          </span>
        </div>

        <div className="h-72 w-full flex items-center justify-center">
          {loading ? (
            <div className="w-full h-full skeleton rounded-xl" />
          ) : data && data.chartData && data.chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              {reportType === 'ageing' ? (
                <BarChart data={data.chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="bracket" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Open Cases" fill="#1D6FD1" radius={[6, 6, 0, 0]} />
                </BarChart>
              ) : reportType === 'performance' ? (
                <AreaChart data={data.chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  <Area type="monotone" dataKey="lodged" name="Lodged (Inflow)" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.2} />
                  <Area type="monotone" dataKey="resolved" name="Resolved (Outflow)" stroke="#16A34A" fill="#16A34A" fillOpacity={0.2} />
                  <Area type="monotone" dataKey="overdue" name="Breached SLA" stroke="#DC2626" fill="#DC2626" fillOpacity={0.15} />
                </AreaChart>
              ) : (
                <BarChart data={data.chartData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={40} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                  {data.chartData[0]?.total !== undefined && (
                    <Bar dataKey="total" name="Total Inflow" fill="#0B2545" radius={[4, 4, 0, 0]} />
                  )}
                  {data.chartData[0]?.active !== undefined && (
                    <Bar dataKey="active" name="Active Dockets" fill="#1D6FD1" radius={[4, 4, 0, 0]} />
                  )}
                  {data.chartData[0]?.disposed !== undefined && (
                    <Bar dataKey="disposed" name="Disposed Orders" fill="#16A34A" radius={[4, 4, 0, 0]} />
                  )}
                  {data.chartData[0]?.overdue !== undefined && (
                    <Bar dataKey="overdue" name="SLA Breached" fill="#DC2626" radius={[4, 4, 0, 0]} />
                  )}
                  {data.chartData[0]?.count !== undefined && (
                    <Bar dataKey="count" name="Institutions Flagged" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  )}
                </BarChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-xs text-muted">No data available for this criteria.</div>
          )}
        </div>
      </div>

      {/* Tabular Data Grid */}
      <div className="bg-white border border-card-border rounded-card shadow-card overflow-hidden">
        <div className="p-4 border-b border-card-border flex items-center justify-between">
          <div>
            <h3 className="text-xs font-semibold text-heading uppercase tracking-wider">
              Statutory Data Register ({data && data.table ? data.table.length : 0} Rows)
            </h3>
          </div>
          <span className="text-2xs font-mono text-muted">Tabular Extract Ready for Audit</span>
        </div>

        <div className="overflow-x-auto max-h-[500px]">
          <table className="premium-table">
            <thead>
              <tr>
                {data && data.table && data.table.length > 0 ? (
                  Object.keys(data.table[0]).map(col => (
                    <th key={col} className="whitespace-nowrap">
                      {col.replace(/_/g, ' ')}
                    </th>
                  ))
                ) : (
                  <th>Loading records...</th>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="10" className="text-center py-12 text-muted">
                    Computing statistical aggregates...
                  </td>
                </tr>
              ) : data && data.table && data.table.length > 0 ? (
                data.table.map((row, idx) => (
                  <tr key={idx}>
                    {Object.entries(row).map(([k, val], cellIdx) => (
                      <td key={cellIdx} className="whitespace-nowrap text-xs text-body font-mono">
                        {typeof val === 'number' ? (
                          <span className={k.includes('overdue') && val > 0 ? 'text-red-600 font-bold' : ''}>
                            {k.includes('pct') ? `${val}%` : val}
                          </span>
                        ) : (
                          <span className={cellIdx === 0 ? 'font-bold text-heading font-sans' : ''}>
                            {String(val || '-')}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="text-center py-8 text-muted">
                    No records found matching date filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
