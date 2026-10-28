import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import { 
  Lock, 
  User, 
  Building2, 
  ShieldCheck, 
  ArrowRight, 
  AlertCircle,
  CheckCircle2,
  Sparkles,
  GraduationCap
} from 'lucide-react';

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('admin_mgmt');
  const [password, setPassword] = useState('aicte@2026');
  const [demoUsers, setDemoUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      if (user.role === 'Complainant') {
        navigate('/complainant');
      } else {
        navigate('/');
      }
    }
  }, [user, navigate]);

  useEffect(() => {
    async function loadDemo() {
      try {
        const res = await api.getDemoUsers();
        setDemoUsers(res.users || []);
      } catch (e) {
        // Fallback default roles
      }
    }
    loadDemo();
  }, []);

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Invalid institutional credentials');
    } finally {
      setLoading(false);
    }
  }

  function handleQuickRoleSelect(u) {
    setUsername(u.username);
    setPassword('aicte@2026');
  }

  return (
    <div className="min-h-screen bg-page flex">
      
      {/* Left: Split Screen Gradient Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-gradient text-white flex-col justify-between p-12 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-96 h-96 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-16 -ml-16 w-96 h-96 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        {/* Top: AICTE Official Identity */}
        <div className="z-10 flex items-center space-x-3">
          <div className="w-11 h-11 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20 shadow-md">
            <Building2 className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="text-sm font-semibold tracking-wide text-white/90">
              अखिल भारतीय तकनीकी शिक्षा परिषद
            </div>
            <div className="text-xs font-bold tracking-wider text-white">
              ALL INDIA COUNCIL FOR TECHNICAL EDUCATION
            </div>
          </div>
        </div>

        {/* Middle: Dignified National Tagline & Value Props */}
        <div className="z-10 space-y-6 max-w-lg my-auto">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-2xs font-semibold text-amber-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Digital India • Statutory Oversight</span>
          </div>

          <h2 className="text-3xl font-bold tracking-tight text-white leading-tight">
            Unified Institutional Complaint Monitoring & Inter-Bureau Harmonisation
          </h2>

          <p className="text-sm text-white/80 leading-relaxed font-normal">
            A single, synchronized intelligence cockpit bridging the Regulation Bureau, Public Grievance Redressal Cell, Approval Bureau, and Regional Directorates to eliminate duplication and accelerate grievance redressal.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4 text-xs text-white/80">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Real-time SSE Event Stream</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Automated Overlap Detection</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>5 AICTE Regional Coverage</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Full Audit Trail & Timelines</span>
            </div>
          </div>
        </div>

        {/* Bottom: Government Attribution */}
        <div className="z-10 text-2xs text-white/60 border-t border-white/10 pt-4">
          Ministry of Education, Government of India • Smart India Hackathon Prototype
        </div>
      </div>

      {/* Right: Clean White Form with Chip Role Quick-Select */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md bg-white border border-card-border rounded-2xl p-8 shadow-card">
          
          {/* Link to Citizen / Complainant Portal */}
          <div className="mb-6 p-3 bg-gradient-to-r from-blue-50 to-amber-50 border border-blue-200/80 rounded-xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <GraduationCap className="w-4 h-4 text-aicte-navy shrink-0" />
              <span className="text-2xs font-semibold text-aicte-navy">Student, Parent or Faculty?</span>
            </div>
            <Link
              to="/complainant/login"
              className="inline-flex items-center space-x-1 text-xs font-bold text-aicte-navy-light hover:text-aicte-navy underline transition-smooth"
            >
              <span>Citizen Portal</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="mb-6">
            <span className="text-3xs font-bold text-muted uppercase tracking-wider block">
              Authorized Official Access
            </span>
            <h1 className="text-xl font-bold text-heading mt-1">
              Sign In to AICTE Portal
            </h1>
            <p className="text-xs text-body mt-1">
              Access the centralized complaint monitoring & case resolution dashboard.
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-2xs font-semibold text-body uppercase tracking-wider mb-1.5">
                Officer Username / ID
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter authorized username"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs border border-card-border rounded-xl bg-white text-heading focus:outline-hidden focus:border-aicte-navy-light transition-smooth"
                />
              </div>
            </div>

            <div>
              <label className="block text-2xs font-semibold text-body uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs border border-card-border rounded-xl bg-white text-heading focus:outline-hidden focus:border-aicte-navy-light transition-smooth"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-primary-gradient hover:opacity-95 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center space-x-2 disabled:opacity-50 transition-smooth"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Dashboard'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Select Role Chips (As instructed: "role quick-select as small chips") */}
          <div className="mt-8 pt-5 border-t border-slate-100">
            <div className="flex items-center space-x-1.5 text-3xs font-bold text-muted uppercase tracking-wider mb-2.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              <span>Quick Test Role Selector (1-Click)</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {demoUsers.slice(0, 5).map((u) => {
                const isSelected = username === u.username;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleQuickRoleSelect(u)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-smooth ${
                      isSelected
                        ? 'bg-aicte-navy text-white border-aicte-navy shadow-xs font-semibold'
                        : 'bg-slate-50 hover:bg-slate-100 text-body border-card-border'
                    }`}
                  >
                    {u.role}
                  </button>
                );
              })}
            </div>
            <p className="text-3xs text-muted mt-2 font-mono">
              Default Test Password: aicte@2026
            </p>
          </div>

        </div>
      </div>

    </div>
  );
}
