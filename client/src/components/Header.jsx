import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { 
  Building2, 
  Search, 
  Bell, 
  LogOut, 
  Menu, 
  CheckCircle2, 
  ShieldCheck,
  ChevronDown,
  AlertTriangle,
  Clock,
  ExternalLink,
  Check,
  X,
  Building,
  FileText
} from 'lucide-react';

export default function Header({ 
  lastUpdated, 
  isLive, 
  alertCount = 0, 
  sidebarCollapsed, 
  setSidebarCollapsed,
  onRefreshNeeded
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef(null);

  // Bell Dropdown State
  const [showBellDropdown, setShowBellDropdown] = useState(false);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [bellLoading, setBellLoading] = useState(false);
  const bellRef = useRef(null);

  // Debounced search
  useEffect(() => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setSearchResults(null);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.globalSearch(searchQuery);
        setSearchResults(res);
        setShowSearchDropdown(true);
      } catch (err) {
        console.error(err);
      } finally {
        setSearchLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load preview alerts when bell dropdown opens
  useEffect(() => {
    if (showBellDropdown) {
      setBellLoading(true);
      api.getAlerts({ status: 'active' })
        .then(res => {
          setRecentAlerts((res.alerts || []).slice(0, 5));
        })
        .catch(console.error)
        .finally(() => setBellLoading(false));
    }
  }, [showBellDropdown]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSearchDropdown(false);
      }
      if (bellRef.current && !bellRef.current.contains(e.target)) {
        setShowBellDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function handleAcknowledgeAlert(alertId, e) {
    e.stopPropagation();
    try {
      await api.resolveAlert(alertId);
      setRecentAlerts(prev => prev.filter(a => a.id !== alertId));
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err) {
      console.error(err);
    }
  }

  async function handleAcknowledgeAll() {
    try {
      await api.resolveAllAlerts('ALL');
      setRecentAlerts([]);
      setShowBellDropdown(false);
      if (onRefreshNeeded) onRefreshNeeded();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <header className="bg-primary-gradient text-white sticky top-0 z-40 shadow-sm border-b border-white/10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Left: Hamburger & AICTE Brand in ONE clean line */}
          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-smooth"
              title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            >
              <Menu className="w-5 h-5" />
            </button>

            <div 
              onClick={() => navigate('/')}
              className="flex items-center space-x-2.5 cursor-pointer select-none"
            >
              <div className="w-9 h-9 rounded-lg bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20 shadow-xs">
                <Building2 className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex items-center space-x-2">
                <span className="font-semibold text-white text-sm sm:text-base tracking-tight whitespace-nowrap">
                  अखिल भारतीय तकनीकी शिक्षा परिषद
                </span>
                <span className="text-white/40 hidden md:inline">|</span>
                <span className="font-bold text-white text-sm tracking-wide hidden md:inline">
                  AICTE CMS
                </span>
              </div>
            </div>
          </div>

          {/* Middle: Global Search Bar with Instant Suggestions */}
          <div ref={searchRef} className="flex-1 max-w-md hidden sm:block relative">
            <div className="relative">
              <Search className="w-4 h-4 text-white/60 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => { if (searchResults) setShowSearchDropdown(true); }}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    setShowSearchDropdown(false);
                    navigate(`/cases?search=${encodeURIComponent(searchQuery.trim())}`);
                  }
                }}
                placeholder="Search cases, institutions, Permanent IDs..."
                className="w-full pl-10 pr-8 py-2 bg-white/10 hover:bg-white/15 focus:bg-white focus:text-slate-900 focus:placeholder-slate-400 text-white placeholder-white/60 text-xs rounded-lg border border-white/15 focus:border-white focus:outline-hidden transition-smooth"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setSearchResults(null); setShowSearchDropdown(false); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Instant Suggestions Dropdown */}
            {showSearchDropdown && searchResults && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl border border-card-border shadow-drawer overflow-hidden z-50 text-slate-800 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
                  
                  {/* Institutions Matches */}
                  {searchResults.institutions && searchResults.institutions.length > 0 && (
                    <div className="p-2">
                      <div className="px-2.5 py-1 text-3xs font-bold uppercase tracking-wider text-muted flex items-center space-x-1">
                        <Building className="w-3 h-3 text-slate-400" />
                        <span>Institutions ({searchResults.institutions.length})</span>
                      </div>
                      {searchResults.institutions.map(inst => (
                        <div
                          key={inst.aicte_permanent_id}
                          onClick={() => {
                            setShowSearchDropdown(false);
                            navigate(`/institutions/${inst.aicte_permanent_id}`);
                          }}
                          className="px-2.5 py-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-smooth flex items-center justify-between"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-semibold text-xs text-heading truncate">{inst.name}</div>
                            <div className="text-2xs text-muted font-mono">{inst.aicte_permanent_id} • {inst.state} ({inst.region})</div>
                          </div>
                          <span className="text-3xs font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 whitespace-nowrap">
                            {inst.active_cases || 0} active
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Cases Matches */}
                  {searchResults.cases && searchResults.cases.length > 0 && (
                    <div className="p-2">
                      <div className="px-2.5 py-1 text-3xs font-bold uppercase tracking-wider text-muted flex items-center space-x-1">
                        <FileText className="w-3 h-3 text-slate-400" />
                        <span>Grievance Dockets ({searchResults.cases.length})</span>
                      </div>
                      {searchResults.cases.map(c => (
                        <div
                          key={c.case_id}
                          onClick={() => {
                            setShowSearchDropdown(false);
                            navigate(`/cases?search=${encodeURIComponent(c.case_id)}`);
                          }}
                          className="px-2.5 py-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-smooth flex items-center justify-between"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-bold text-xs text-aicte-navy">{c.case_id}</span>
                              <span className="text-2xs text-body truncate">{c.category}</span>
                            </div>
                            <div className="text-2xs text-muted truncate">{c.institution_name} • {c.bureau}</div>
                          </div>
                          <span className="text-3xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 whitespace-nowrap">
                            {c.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Empty state */}
                  {(!searchResults.institutions || searchResults.institutions.length === 0) &&
                   (!searchResults.cases || searchResults.cases.length === 0) && (
                    <div className="p-6 text-center text-xs text-muted">
                      No direct matches for "{searchQuery}". Press Enter to run full text scan.
                    </div>
                  )}

                  {/* Footer link to full search */}
                  <div 
                    onClick={() => {
                      setShowSearchDropdown(false);
                      navigate(`/cases?search=${encodeURIComponent(searchQuery)}`);
                    }}
                    className="p-2.5 bg-slate-50 hover:bg-slate-100 text-center text-xs font-semibold text-aicte-navy-light cursor-pointer border-t border-slate-100 transition-smooth"
                  >
                    View All Matching Results in All Cases &rarr;
                  </div>

                </div>
              </div>
            )}
          </div>

          {/* Right: Live Sync, Notifications Dropdown, User Profile */}
          <div className="flex items-center space-x-3 shrink-0">
            
            {/* Live Sync Status */}
            <div className="hidden lg:flex items-center space-x-2 px-3 py-1.5 bg-white/10 rounded-lg text-xs font-medium text-white/90 border border-white/10">
              <span className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isLive ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${isLive ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              </span>
              <span className="text-2xs font-semibold tracking-wide uppercase text-white/90">
                {isLive ? 'Live Sync' : 'Connecting'}
              </span>
              {lastUpdated && (
                <span className="text-2xs font-mono text-white/60 pl-1 border-l border-white/20">
                  {lastUpdated}
                </span>
              )}
            </div>

            {/* Notification Bell with Dropdown */}
            <div ref={bellRef} className="relative">
              <button
                onClick={() => setShowBellDropdown(!showBellDropdown)}
                className="relative p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-smooth"
                title="System Alerts & Escalations"
              >
                <Bell className="w-4 h-4" />
                {alertCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-3xs font-bold rounded-full flex items-center justify-center ring-2 ring-aicte-navy">
                    {alertCount > 9 ? '9+' : alertCount}
                  </span>
                )}
              </button>

              {/* Bell Dropdown Popup */}
              {showBellDropdown && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl border border-card-border shadow-drawer overflow-hidden z-50 text-slate-800 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="p-3.5 bg-slate-50 border-b border-card-border flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-xs text-heading">System Alerts</span>
                      {alertCount > 0 && (
                        <span className="text-3xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                          {alertCount} unread
                        </span>
                      )}
                    </div>
                    {alertCount > 0 && (
                      <button
                        onClick={handleAcknowledgeAll}
                        className="text-2xs font-medium text-aicte-navy-light hover:underline"
                      >
                        Acknowledge All
                      </button>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {bellLoading ? (
                      <div className="p-6 text-center text-xs text-muted">Loading alerts...</div>
                    ) : recentAlerts.length > 0 ? (
                      recentAlerts.map(alert => (
                        <div 
                          key={alert.id}
                          onClick={() => {
                            setShowBellDropdown(false);
                            navigate('/alerts');
                          }}
                          className="p-3 hover:bg-slate-50/80 cursor-pointer transition-smooth flex items-start space-x-2.5"
                        >
                          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                            alert.severity === 'Critical' ? 'bg-red-500 ring-2 ring-red-100' : 'bg-amber-500 ring-2 ring-amber-100'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-heading truncate">{alert.title}</div>
                            <p className="text-2xs text-muted line-clamp-2 mt-0.5">{alert.description}</p>
                            <span className="text-3xs font-mono text-slate-400 mt-1 block">{alert.created_at}</span>
                          </div>
                          <button
                            onClick={(e) => handleAcknowledgeAlert(alert.id, e)}
                            title="Acknowledge alert"
                            className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-smooth shrink-0"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-xs text-muted">
                        No active alerts pending review.
                      </div>
                    )}
                  </div>

                  <div className="p-2.5 bg-slate-50 border-t border-card-border text-center">
                    <button
                      onClick={() => { setShowBellDropdown(false); navigate('/alerts'); }}
                      className="text-xs font-semibold text-aicte-navy-light hover:underline inline-flex items-center space-x-1"
                    >
                      <span>Open Full Alerts Console</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile */}
            {user && (
              <div className="flex items-center space-x-2.5 pl-2 border-l border-white/15">
                <div className="hidden md:block text-right">
                  <div className="text-xs font-semibold text-white leading-tight">
                    {user.full_name}
                  </div>
                  <div className="text-2xs text-white/70 font-medium">
                    {user.role} {user.region ? `(${user.region})` : ''}
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center font-bold text-xs border border-white/30 shadow-xs">
                  {user.full_name ? user.full_name.charAt(0) : 'U'}
                </div>

                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-smooth"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

          </div>

        </div>
      </div>
    </header>
  );
}
