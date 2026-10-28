import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, 
  LogOut, 
  PlusCircle, 
  FileText, 
  User, 
  ShieldCheck,
  ExternalLink
} from 'lucide-react';

export default function ComplainantHeader({ activeTab, setActiveTab }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/complainant/login');
  }

  return (
    <header className="bg-primary-gradient text-white border-b border-aicte-navy-dark shadow-sm sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Left: Brand & Portal Title */}
          <div className="flex items-center space-x-3">
            <Link to="/complainant" className="flex items-center space-x-3 group">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-xs flex items-center justify-center border border-white/20 shadow-xs group-hover:bg-white/15 transition-smooth">
                <Building2 className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold tracking-wider text-white">AICTE CITIZEN PORTAL</span>
                  <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-3xs font-semibold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    PGRC Public Cell
                  </span>
                </div>
                <div className="text-3xs text-white/70 hidden sm:block">
                  Centralised Grievance Registration & Status Tracking System
                </div>
              </div>
            </Link>
          </div>

          {/* Center: Navigation Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={() => setActiveTab('my-complaints')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-smooth ${
                activeTab === 'my-complaints'
                  ? 'bg-white/20 text-white font-semibold shadow-xs'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4 text-amber-300" />
              <span>My Complaints</span>
            </button>

            <button
              onClick={() => setActiveTab('new-complaint')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-smooth ${
                activeTab === 'new-complaint'
                  ? 'bg-white/20 text-white font-semibold shadow-xs'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <PlusCircle className="w-4 h-4 text-emerald-300" />
              <span>Raise New Complaint</span>
            </button>
          </nav>

          {/* Right: User Badge & Actions */}
          <div className="flex items-center space-x-3">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-xs font-semibold text-white leading-tight">
                {user?.full_name || 'Citizen User'}
              </span>
              <div className="flex items-center justify-end space-x-1 text-3xs text-white/70">
                <span className="text-amber-300 font-medium">{user?.designation || 'Citizen'}</span>
                <span>•</span>
                <span className="truncate max-w-[120px]">{user?.email}</span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out of Complainant Portal"
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/90 hover:text-white border border-white/15 transition-smooth flex items-center space-x-1 text-xs"
            >
              <LogOut className="w-4 h-4 text-red-300" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
