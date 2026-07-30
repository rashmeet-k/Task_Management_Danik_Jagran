import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Projects } from './pages/Projects';
import { ProjectDetails } from './pages/ProjectDetails';
import { Members } from './pages/Members';
import { RecentActivityPage } from './pages/RecentActivity';
import { Reports } from './pages/Reports';
import { SettingsPage } from './pages/Settings';
import { SearchPage } from './pages/SearchPage';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-12 h-12 rounded-full border-4 border-[#00adef] border-t-transparent animate-spin" />
          <span className="font-sans text-xs text-slate-400 font-bold uppercase tracking-wider">Syncing database data...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex print:bg-white">
      {/* Collapsible hover Sidebar on the left */}
      <Sidebar currentPath={location.pathname} />

      {/* Right container panel */}
      <div className="flex-1 flex flex-col pl-[72px] print:pl-0">
        {/* Header Navbar */}
        <Navbar />

        {/* Main Padded Content Stage */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto print:p-0 print:m-0 print:max-w-none">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/:id" element={<ProjectDetails />} />
            <Route 
              path="/members" 
              element={<Members />} 
            />
            <Route 
              path="/activity" 
              element={user.role === 'Admin' || user.role === 'Project Manager' ? <RecentActivityPage /> : <Navigate to="/" replace />} 
            />
            <Route 
              path="/reports" 
              element={user.role === 'Admin' || user.role === 'Project Manager' ? <Reports /> : <Navigate to="/" replace />} 
            />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
