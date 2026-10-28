import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  Lock, 
  Mail, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  UserPlus,
  ShieldCheck,
  HelpCircle
} from 'lucide-react';

export default function ComplainantLogin() {
  const { complainantLogin, user } = useAuth();
  const navigate = useNavigate();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (user) {
      if (user.role === 'Complainant') {
        navigate('/complainant');
      } else {
        navigate('/');
      }
    }
  }, [user, navigate]);

  async function handleSubmit(e) {
    if (e) e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await complainantLogin(identifier, password);
      navigate('/complainant');
    } catch (err) {
      setError(err.message || 'Invalid login credentials. Please check your email and password.');
    } finally {
      setLoading(false);
    }
  }

  function handleDemoLogin(roleType = 'Student') {
    if (roleType === 'Student') {
      setIdentifier('student.rahul@example.com');
      setPassword('aicte@2026');
    } else if (roleType === 'Faculty') {
      setIdentifier('faculty.priya@example.com');
      setPassword('aicte@2026');
    } else {
      setIdentifier('parent.sharma@example.com');
      setPassword('aicte@2026');
    }
  }

  return (
    <div className="min-h-screen bg-page flex flex-col justify-between">
      
      {/* Top Banner Link to Official Login */}
      <div className="bg-slate-900 text-white text-xs py-2 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-medium">Public Grievance Portal for Students, Parents & Faculty</span>
          </div>
          <Link 
            to="/login" 
            className="inline-flex items-center space-x-1.5 text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2 transition-smooth"
          >
            <span>Are you an AICTE Official / Regional Staff? Official Login</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-4xl bg-white border border-card-border rounded-2xl shadow-card overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          
          {/* Left Hero (Gradient Side) */}
          <div className="lg:col-span-5 bg-primary-gradient text-white p-8 flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />
            
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20">
                <Building2 className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                  अखिल भारतीय तकनीकी शिक्षा परिषद
                </div>
                <h2 className="text-xl font-bold text-white mt-1">
                  Citizen Grievance Redressal Portal
                </h2>
              </div>
              <p className="text-xs text-white/80 leading-relaxed font-normal">
                Direct, transparent grievance intake overseen by the AICTE Public Grievance Redressal Cell (PGRC). Track your petitions with real-time status updates.
              </p>
            </div>

            <div className="my-6 space-y-3 text-xs text-white/80">
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Confidential & tamper-proof complaint filing</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Unique AICTE Tracking ID generation</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Automated inter-bureau coordination</span>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 text-3xs text-white/60">
              Statutory Redressal Mechanism under AICTE Regulations 2026.
            </div>
          </div>

          {/* Right Form */}
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-center">
            
            <div className="mb-6">
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-aicte-navy text-3xs font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Complainant Login</span>
              </div>
              <h1 className="text-xl font-bold text-heading">
                Sign In to Track Grievances
              </h1>
              <p className="text-xs text-body mt-1">
                Enter your registered citizen email or mobile and password.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-2xs font-semibold text-body uppercase tracking-wider mb-1.5">
                  Email or Registered Mobile Number
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="e.g. citizen@example.com or 9876543210"
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
                    placeholder="Enter your account password"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs border border-card-border rounded-xl bg-white text-heading focus:outline-hidden focus:border-aicte-navy-light transition-smooth"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-primary-gradient hover:opacity-95 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center space-x-2 disabled:opacity-50 transition-smooth"
              >
                <span>{loading ? 'Authenticating...' : 'Sign In to Complainant Portal'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Registration Navigation */}
            <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs gap-2">
              <span className="text-body text-xs">Don't have a complainant account?</span>
              <Link
                to="/complainant/register"
                className="inline-flex items-center space-x-1 font-semibold text-aicte-navy-light hover:text-aicte-navy transition-smooth"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Register as New Grievant</span>
              </Link>
            </div>

            {/* Quick Demo Credentials */}
            <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center space-x-1.5 text-3xs font-bold text-muted uppercase tracking-wider mb-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                <span>Quick Test Account (Fill Sample Credential)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleDemoLogin('Student')}
                  className="px-2.5 py-1 text-3xs rounded-lg bg-white border border-slate-200 hover:bg-slate-100 font-medium text-heading transition-smooth"
                >
                  Student (Rahul)
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoLogin('Faculty')}
                  className="px-2.5 py-1 text-3xs rounded-lg bg-white border border-slate-200 hover:bg-slate-100 font-medium text-heading transition-smooth"
                >
                  Faculty (Priya)
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoLogin('Parent')}
                  className="px-2.5 py-1 text-3xs rounded-lg bg-white border border-slate-200 hover:bg-slate-100 font-medium text-heading transition-smooth"
                >
                  Parent (Sharma)
                </button>
              </div>
              <div className="text-3xs text-muted mt-1.5 font-mono">
                Password: <code>aicte@2026</code> (or register your own account in 10 seconds)
              </div>
            </div>

          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-4 text-3xs text-muted">
        All India Council for Technical Education • Nelson Mandela Marg, Vasant Kunj, New Delhi-110070
      </footer>

    </div>
  );
}
