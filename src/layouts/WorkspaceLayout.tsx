import { useState, useRef, useEffect } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import AppSidebar from '@/components/AppSidebar';
import { Topbar } from '@/components/Topbar';
import { Loader2 } from 'lucide-react';
import SetupPage from '@/pages/SetupPage';
import RoleSelectionPage from '@/pages/RoleSelectionPage';
import PendingApprovalPage from '@/pages/PendingApprovalPage';

export function WorkspaceLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, loading, profile, pendingApproval } = useAuth();
  // Tracks whether the first real Supabase profile fetch has completed.
  // Prevents rendering SetupPage during the brief window where loading=false
  // but the profile hasn't been fetched yet (warm-start from localStorage cache).
  const profileFetchedOnce = useRef(false);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!loading && !profileFetchedOnce.current) {
      profileFetchedOnce.current = true;
      // Give a brief 500ms settling window so the real Supabase fetch can
      // complete before we decide to show SetupPage.
      const timer = setTimeout(() => setSettled(true), 500);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  // Safe to use plain `loading` here because AuthContext guarantees that
  // loading stays true until BOTH user AND profile are fully resolved.
  // The old `(user && !profileSettled)` guard is no longer needed.
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // At this point loading is false AND user is set, so profile has been
  // fetched (or confirmed absent).
  if (!profile?.role) {
    // Has selected a pending role but awaiting admin approval
    if (pendingApproval) {
      return (
        <LanguageProvider>
          <PendingApprovalPage />
        </LanguageProvider>
      );
    }

    // No role and no pending_role → first-time OAuth user, pick a role
    if (profile && !profile.pending_role) {
      return (
        <LanguageProvider>
          <RoleSelectionPage />
        </LanguageProvider>
      );
    }

    // Edge case: profile not loaded yet or truly misconfigured.
    // Only show SetupPage after the settling period to avoid a flash on reload.
    if (!settled) {
      return (
        <div className="h-screen flex items-center justify-center bg-background">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      );
    }

    return (
      <LanguageProvider>
        <SetupPage />
      </LanguageProvider>
    );
  }

  return (
    <LanguageProvider>
      <div className="h-screen flex overflow-hidden bg-background">
        <AppSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Topbar onToggleSidebar={() => setSidebarOpen((p) => !p)} />
          <main className="flex-1 overflow-y-auto p-6 md:p-8 pb-20 lg:pb-8">
            <div className="animate-fade-in">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </LanguageProvider>
  );
}
