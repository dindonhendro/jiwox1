import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import Layout from '@/components/Layout';
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Onboarding from '@/pages/Onboarding';
import Chat from '@/pages/Chat';
import Journal from '@/pages/Journal';
import Rescue from '@/pages/Rescue';
import PrivacyPolicy from '@/pages/PrivacyPolicy';
import Tools from '@/pages/Tools';
import SleepCompanion from '@/pages/SleepCompanion';
import Visualization from '@/pages/Visualization';
import Consultation from '@/pages/Consultation';
import Community from '@/pages/Community';

// The animated landing lives as a static file outside the SPA. Any /welcome
// variant that reaches the router gets forwarded to the real file so the
// catch-all doesn't swallow it.
function WelcomeRedirect() {
  useEffect(() => {
    window.location.replace('/welcome/index.html');
  }, []);
  return null;
}

// ROUTE PROTECTION COMPONENT
function ProtectedRoute() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-jiwo-bg flex flex-col items-center justify-center gap-2">
        <div className="w-10 h-10 border-4 border-jiwo-primary border-t-transparent rounded-full animate-spin"></div>
        <span className="text-sm font-bold text-jiwo-primary">Memuat Jiwo.ai...</span>
      </div>
    );
  }

  return session ? <Outlet /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<Login />} />
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/welcome" element={<WelcomeRedirect />} />
        <Route path="/welcome/*" element={<WelcomeRedirect />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          {/* Main App Layout */}
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/tools/community" element={<Community />} />
            <Route path="/tools" element={<Tools />} />
            <Route path="/tools/consultation" element={<Consultation />} />
            <Route path="/visualization" element={<Visualization />} />
          </Route>

          {/* Standalone Full-screen Calming Pages */}
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/rescue" element={<Rescue />} />
          <Route path="/tools/sleep" element={<SleepCompanion />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
