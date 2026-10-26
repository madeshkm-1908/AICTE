import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  RefreshCw, 
  Eye, 
  Building, 
  FileText,
  Lock,
  ArrowRight,
  X
} from 'lucide-react';

export default function ImportData() {
  const { user } = useAuth();
  const [importType, setImportType] = useState('institutions'); // 'institutions' | 'cases'
  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Access check: Senior Management and Regulation Bureau only
  const hasPermission = user && ['Senior Management', 'Regulation Bureau'].includes(user.role);

  if (!hasPermission) {
    return (
      <div className="max-w-[800px] mx-auto p-10 bg-white rounded-card border border-card-border shadow-card text-center space-y-4 my-12">
        <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto border border-rose-200">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-heading">Restricted Regulatory Function</h2>
        <p className="text-xs text-body leading-relaxed max-w-lg mx-auto">
          Central Registry Batch Ingestion is restricted to <strong>Senior Management</strong> and <strong>Regulation Bureau</strong> officials. Your credential role is <strong>{user?.role}</strong>.
        </p>
      </div>
    );
  }

  // Parse CSV string respecting quotes
  function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return { headers: [], rows: [] };

    function parseLine(line) {
      const result = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i];
        if (c === '"') {
          if (inQuotes && line[i + 1] === '"') {
            cur += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (c === ',' && !inQuotes) {
          result.push(cur.trim());
          cur = '';
        } else {
          cur += c;
        }
      }
      result.push(cur.trim());
      return result;
    }

    const rawHeaders = parseLine(lines[0]).map(h => h.replace(/^"|"$/g, '').toLowerCase().replace(/\s+/g, '_'));
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      if (values.length === 1 && values[0] === '') continue;
      const rowObj = {};
      rawHeaders.forEach((h, idx) => {
        rowObj[h] = values[idx] !== undefined ? values[idx].replace(/^"|"$/g, '') : '';
      });
      rows.push(rowObj);
    }

    return { headers: rawHeaders, rows };
  }

  function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setIsParsing(true);
    setErrorMsg('');
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      setRawText(content);
      const parsed = parseCSV(content);
      setHeaders(parsed.headers);
      setParsedRows(parsed.rows);
      setIsParsing(false);
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read file.');
      setIsParsing(false);
    };
    reader.readAsText(file);
  }

  function handleTextChange(text) {
    setRawText(text);
    setErrorMsg('');
    setImportResult(null);
    if (!text.trim()) {
      setParsedRows([]);
      setHeaders([]);
      return;
    }
    const parsed = parseCSV(text);
    setHeaders(parsed.headers);
    setParsedRows(parsed.rows);
  }

  async function handleExecuteImport() {
    if (parsedRows.length === 0) {
      setErrorMsg('No valid rows available to import.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const res = await api.executeImport({
        type: importType,
        rows: parsedRows
      });
      setImportResult(res);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to complete data import.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleReset() {
    setRawText('');
    setFileName('');
    setParsedRows([]);
    setHeaders([]);
    setImportResult(null);
    setErrorMsg('');
  }

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto pb-12">
      
      {/* Title & Type Selection */}
      <div className="bg-white border border-card-border rounded-card p-6 shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-aicte-navy/10 flex items-center justify-center text-aicte-navy">
                <UploadCloud className="w-4 h-4" />
              </div>
              <h1 className="text-lg font-bold text-heading">
                Central Registry Data Import & Ingestion
              </h1>
            </div>
            <p className="text-xs text-muted mt-1">
              Authorized batch ingestion for approved technical institutions or grievance dockets with automatic overlap re-scanning
            </p>
          </div>

          <button
            onClick={() => api.downloadImportTemplate(importType)}
            className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 border border-card-border rounded-lg text-xs font-semibold text-heading transition-smooth inline-flex items-center space-x-1.5 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Download {importType === 'institutions' ? 'Institutions' : 'Cases'} Template</span>
          </button>
        </div>

        {/* Import Type Selector Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs max-w-md">
          <button
            onClick={() => { setImportType('institutions'); handleReset(); }}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-smooth inline-flex items-center justify-center space-x-1.5 ${
              importType === 'institutions' 
                ? 'bg-white text-heading shadow-xs font-semibold' 
                : 'text-body hover:text-heading'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Institutions Registry</span>
          </button>
          <button
            onClick={() => { setImportType('cases'); handleReset(); }}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-smooth inline-flex items-center justify-center space-x-1.5 ${
              importType === 'cases' 
                ? 'bg-white text-heading shadow-xs font-semibold' 
                : 'text-body hover:text-heading'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Grievance Dockets</span>
          </button>
        </div>
      </div>

      {/* File Upload & Input Zone */}
      <div className="bg-white border border-card-border rounded-card p-6 shadow-card space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
          Step 1: Upload CSV Document or Paste Tabular Records
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Upload Box */}
          <label className="border-2 border-dashed border-slate-200 hover:border-aicte-navy-light rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer bg-slate-50/50 hover:bg-slate-50 transition-smooth text-center">
            <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
            <span className="text-xs font-semibold text-heading">Click to browse or drag & drop CSV</span>
            <span className="text-2xs text-muted mt-1">Accepts standard .csv files formatted per sample template</span>
            {fileName && (
              <span className="mt-2 text-2xs font-mono font-bold text-aicte-navy bg-white px-2.5 py-1 rounded-md border border-slate-200">
                Selected: {fileName}
              </span>
            )}
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>

          {/* Paste Raw Text Box */}
          <div className="flex flex-col space-y-1.5">
            <div className="flex items-center justify-between text-2xs text-muted">
              <span>Or paste raw CSV text directly:</span>
              {rawText && (
                <button onClick={handleReset} className="text-rose-600 hover:underline">
                  Clear
                </button>
              )}
            </div>
            <textarea
              rows={5}
              value={rawText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="aicte_permanent_id,name,address,state,region,type..."
              className="w-full p-3 font-mono text-xs border border-card-border rounded-xl bg-white text-heading focus:outline-hidden focus:border-aicte-navy-light"
            />
          </div>

        </div>

        {errorMsg && (
          <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* Preview Section */}
      {parsedRows.length > 0 && (
        <div className="bg-white border border-card-border rounded-card shadow-card overflow-hidden space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted">
                Step 2: Review First {Math.min(5, parsedRows.length)} Records ({parsedRows.length} Total Parsed)
              </h2>
              <p className="text-2xs text-muted mt-0.5">
                Verify headers: <strong className="font-mono text-heading">{headers.slice(0, 6).join(', ')}</strong>...
              </p>
            </div>

            <button
              onClick={handleExecuteImport}
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-aicte-navy text-white rounded-lg text-xs font-semibold hover:bg-aicte-navy-mid transition-smooth inline-flex items-center space-x-2 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Validating & Ingesting Records...</span>
                </>
              ) : (
                <>
                  <span>Confirm & Execute Import ({parsedRows.length} Rows)</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <div className="overflow-x-auto border border-card-border rounded-xl">
            <table className="premium-table">
              <thead>
                <tr>
                  <th className="w-12">#</th>
                  {headers.map(h => (
                    <th key={h} className="whitespace-nowrap font-mono">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsedRows.slice(0, 5).map((row, idx) => (
                  <tr key={idx}>
                    <td className="font-mono text-muted text-xs">{idx + 1}</td>
                    {headers.map(h => (
                      <td key={h} className="text-xs text-body whitespace-nowrap max-w-xs truncate">
                        {row[h] || '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Result Summary */}
      {importResult && (
        <div className="bg-white border border-card-border rounded-card p-6 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h2 className="text-sm font-bold text-heading">
                Import Batch Processing Report
              </h2>
            </div>
            <span className="text-2xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
              Real-Time Sync Emitted
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <span className="text-3xs font-bold text-emerald-800 uppercase tracking-wider block">
                Successfully Added
              </span>
              <div className="text-2xl font-bold font-mono text-emerald-700 mt-1">
                +{importResult.summary.added}
              </div>
              <div className="text-2xs text-emerald-800/80 mt-0.5">Written to persistent database</div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <span className="text-3xs font-bold text-amber-800 uppercase tracking-wider block">
                Skipped (Duplicates)
              </span>
              <div className="text-2xl font-bold font-mono text-amber-700 mt-1">
                {importResult.summary.skipped}
              </div>
              <div className="text-2xs text-amber-800/80 mt-0.5">Already present on record</div>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4">
              <span className="text-3xs font-bold text-rose-800 uppercase tracking-wider block">
                Rejected (Validation Errors)
              </span>
              <div className="text-2xl font-bold font-mono text-rose-700 mt-1">
                {importResult.summary.rejected}
              </div>
              <div className="text-2xs text-rose-800/80 mt-0.5">Failed schema or relational checks</div>
            </div>
          </div>

          {importResult.errors && importResult.errors.length > 0 && (
            <div className="space-y-2 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted">
                Validation Feedback & Rejection Notes ({importResult.errors.length} items)
              </h3>
              <div className="max-h-60 overflow-y-auto border border-card-border rounded-xl divide-y divide-slate-100 text-xs">
                {importResult.errors.map((e, idx) => (
                  <div key={idx} className="p-3 flex items-start space-x-2 text-2xs">
                    <span className="font-mono font-bold text-muted px-1.5 py-0.5 bg-slate-100 rounded">
                      Row {e.row}
                    </span>
                    <span className="font-mono text-heading font-semibold">[{e.id}]</span>
                    <span className="text-body flex-1">{e.reason}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-muted flex items-center justify-between">
            <span>
              Automatic Overlap Detection and Alert Surveillance scan executed. Dashboard numbers updated.
            </span>
            <button
              onClick={handleReset}
              className="font-semibold text-aicte-navy-light hover:underline"
            >
              Upload Another Batch &rarr;
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
