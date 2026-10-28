import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import AllCases from './pages/AllCases';
import Institutions from './pages/Institutions';
import InstitutionProfile from './pages/InstitutionProfile';
import Overlaps from './pages/Overlaps';
import Alerts from './pages/Alerts';
import Reports from './pages/Reports';
import AuditLog from './pages/AuditLog';
import ImportData from './pages/ImportData';
import Login from './pages/Login';
import ComplainantLogin from './pages/ComplainantLogin';
import ComplainantRegister from './pages/ComplainantRegister';
import ComplainantPortal from './pages/ComplainantPortal';
import { subscribeToLiveUpdates, api } from './services/api';

function ProtectedComplainantRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center font-mono text-xs text-muted">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 bg-aicte-navy-light rounded-full animate-ping" />
          <span>Verifying citizen session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/complainant/login" replace />;
  }

  if (user.role !== 'Complainant') {
    return <Navigate to="/" replace />;
  }

  return <ComplainantPortal />;
}

function ProtectedLayout() {
  const { user, loading } = useAuth();
  const [triggerRefresh, setTriggerRefresh] = useState(0);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState('');
  const [overlapCount, setOverlapCount] = useState(0);
  const [alertCount, setAlertCount] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Subscribe to Live Updates (SSE + 5-sec Polling)
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToLiveUpdates(
      (event) => {
        setIsLive(true);
        const timeStr = new Date().toLocaleTimeString('en-IN', { hour12: false });
        setLastUpdated(timeStr);
        setTriggerRefresh(prev => prev + 1);

        // Fetch counts for sidebar badges
        api.getOverlaps().then(res => setOverlapCount(res.total_overlapping || 0)).catch(() => {});
        api.getAlerts({ status: 'active' }).then(res => setAlertCount((res.alerts || []).length)).catch(() => {});
      },
      () => {
        setIsLive(false);
      }
    );

    // Initial load of badge counts
    api.getOverlaps().then(res => setOverlapCount(res.total_overlapping || 0)).catch(() => {});
    api.getAlerts({ status: 'active' }).then(res => setAlertCount((res.alerts || []).length)).catch(() => {});
    setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour12: false }));

    return () => unsubscribe();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center font-mono text-xs text-muted">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 bg-aicte-navy-light rounded-full animate-ping" />
          <span>Verifying institutional session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Redirect complainants to the dedicated Complainant Portal
  if (user.role === 'Complainant') {
    return <Navigate to="/complainant" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-page text-body antialiased">
      {/* Top Header */}
      <Header 
        lastUpdated={lastUpdated} 
        isLive={isLive} 
        alertCount={alertCount}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
        onRefreshNeeded={() => setTriggerRefresh(prev => prev + 1)}
      />

      <div className="flex flex-1 w-full">
        {/* Collapsible Gradient Sidebar */}
        <Sidebar 
          overlapCount={overlapCount} 
          alertCount={alertCount}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />

        {/* Main View Area */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto min-w-0">
          <Routes>
            <Route path="/" element={<Dashboard triggerRefresh={triggerRefresh} />} />
            <Route path="/cases" element={<AllCases triggerRefresh={triggerRefresh} />} />
            <Route path="/institutions" element={<Institutions triggerRefresh={triggerRefresh} />} />
            <Route path="/institutions/:id" element={<InstitutionProfile triggerRefresh={triggerRefresh} />} />
            <Route path="/overlaps" element={<Overlaps triggerRefresh={triggerRefresh} />} />
            <Route path="/alerts" element={<Alerts triggerRefresh={triggerRefresh} />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/audit" element={<AuditLog />} />
            <Route path="/import" element={<ImportData />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/complainant/login" element={<ComplainantLogin />} />
          <Route path="/complainant/register" element={<ComplainantRegister />} />
          <Route path="/complainant/*" element={<ProtectedComplainantRoute />} />
          <Route path="/*" element={<ProtectedLayout />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
