import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  Lock, 
  Mail, 
  Phone, 
  User, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles,
  LogIn,
  GraduationCap
} from 'lucide-react';

export default function ComplainantRegister() {
  const { complainantRegister, user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    password: '',
    complainant_type: 'Student'
  });
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

  const complainantTypes = [
    { value: 'Student', label: 'Student', desc: 'Enrolled or seeking admission' },
    { value: 'Faculty', label: 'Faculty / Staff', desc: 'Teaching or non-teaching employee' },
    { value: 'Parent', label: 'Parent / Guardian', desc: 'Representing a ward/candidate' },
    { value: 'Other', label: 'Other Citizen', desc: 'General public or stakeholder' }
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (formData.name.trim().length < 2) {
      return setError('Please enter your full legal name.');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      return setError('Please enter a valid email address.');
    }
    if (!/^\+?[0-9\s-]{10,15}$/.test(formData.mobile)) {
      return setError('Please enter a valid 10-digit mobile number.');
    }
    if (formData.password.length < 6) {
      return setError('Password must be at least 6 characters long.');
    }

    setLoading(true);

    try {
      await complainantRegister(formData);
      navigate('/complainant');
    } catch (err) {
      setError(err.message || 'Failed to complete registration. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-page flex flex-col justify-between">
      
      {/* Top Banner */}
      <div className="bg-slate-900 text-white text-xs py-2 px-4 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <GraduationCap className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-slate-300 font-medium">AICTE Public Grievance Registration Portal</span>
          </div>
          <Link 
            to="/login" 
            className="inline-flex items-center space-x-1.5 text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2 transition-smooth"
          >
            <span>AICTE Staff & Bureau Login</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-4xl bg-white border border-card-border rounded-2xl shadow-card overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          
          {/* Left Hero */}
          <div className="lg:col-span-5 bg-primary-gradient text-white p-8 flex flex-col justify-between relative overflow-hidden">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20">
                <Building2 className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <div className="text-xs font-semibold text-white/80 uppercase tracking-wider">
                  Citizen Onboarding
                </div>
                <h2 className="text-xl font-bold text-white mt-1">
                  Create Your Complainant Account
                </h2>
              </div>
              <p className="text-xs text-white/80 leading-relaxed font-normal">
                Register once to lodge official complaints against AICTE-approved institutions, attach documentation, and receive tamper-proof timeline progress.
              </p>
            </div>

            <div className="my-6 space-y-3 text-xs text-white/80">
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Zero registration fees • Direct regulatory intake</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Instant confirmation with AICTE Case ID</span>
              </div>
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Official status updates from grievance committees</span>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10 text-3xs text-white/60">
              Your personal information is protected under national data privacy guidelines.
            </div>
          </div>

          {/* Right Form */}
          <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-center">
            
            <div className="mb-6">
              <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-3xs font-bold uppercase tracking-wider mb-2">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Public Citizen Registration</span>
              </div>
              <h1 className="text-xl font-bold text-heading">
                Register as a Complainant
              </h1>
              <p className="text-xs text-body mt-1">
                Provide your contact details to receive official petition status tracking.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Complainant Type Selector */}
              <div>
                <label className="block text-2xs font-semibold text-body uppercase tracking-wider mb-2">
                  I am registering as a
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {complainantTypes.map((t) => {
                    const isSelected = formData.complainant_type === t.value;
                    return (
                      <button
                        key={t.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, complainant_type: t.value }))}
                        className={`p-2 rounded-xl border text-center transition-smooth ${
                          isSelected
                            ? 'bg-aicte-navy text-white border-aicte-navy font-semibold shadow-xs'
                            : 'bg-white text-body border-card-border hover:bg-slate-50'
                        }`}
                      >
                        <div className="text-xs">{t.label}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-2xs font-semibold text-body uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter full legal name"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs border border-card-border rounded-xl bg-white text-heading focus:outline-hidden focus:border-aicte-navy-light transition-smooth"
                  />
                </div>
              </div>

              {/* Email & Mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-2xs font-semibold text-body uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="e.g. citizen@example.com"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs border border-card-border rounded-xl bg-white text-heading focus:outline-hidden focus:border-aicte-navy-light transition-smooth"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-2xs font-semibold text-body uppercase tracking-wider mb-1.5">
                    10-Digit Mobile Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="tel"
                      required
                      value={formData.mobile}
                      onChange={(e) => setFormData(prev => ({ ...prev, mobile: e.target.value }))}
                      placeholder="e.g. 9876543210"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs border border-card-border rounded-xl bg-white text-heading focus:outline-hidden focus:border-aicte-navy-light transition-smooth"
                    />
                  </div>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-2xs font-semibold text-body uppercase tracking-wider mb-1.5">
                  Create Password (minimum 6 characters)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Create secure password"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs border border-card-border rounded-xl bg-white text-heading focus:outline-hidden focus:border-aicte-navy-light transition-smooth"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-primary-gradient hover:opacity-95 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center justify-center space-x-2 disabled:opacity-50 transition-smooth mt-2"
              >
                <span>{loading ? 'Registering Account...' : 'Create Account & Proceed'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Back to Login */}
            <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-body text-xs">Already have a complainant account?</span>
              <Link
                to="/complainant/login"
                className="inline-flex items-center space-x-1 font-semibold text-aicte-navy-light hover:text-aicte-navy transition-smooth"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In Here</span>
              </Link>
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
