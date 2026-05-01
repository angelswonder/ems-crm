import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AppProvider } from "./contexts/AppContext";
import { LoginPage } from "./components/LoginPage";
import { LandingPage } from "./components/LandingPage";
import { IndividualAuthPage } from "./components/IndividualAuthPage";
import { OrganizationSignupPage } from "./components/OrganizationSignupPage";
import { IndividualDashboard } from "./components/IndividualDashboard";
import { SettingsProfile } from "./components/SettingsProfile";
import { AuthCallback } from "./components/AuthCallback";
import { Layout } from "./components/Layout";
import { PrivacyPolicyPage } from "./components/PrivacyPolicyPage";
import { TermsOfServicePage } from "./components/TermsOfServicePage";
import { ContactPage } from "./components/ContactPage";
import { DebugPage } from "./components/DebugPage";

// Authenticated app component - only loaded when needed
function AuthApp() {
  return (
    <AuthProvider>
      <AppProvider>
        <AuthRoutes />
      </AppProvider>
    </AuthProvider>
  );
}

// Auth routes component - handles all authenticated/auth-related routes
function AuthRoutes() {
  const { user, loading, profile } = useAuth();

  // Show loading while auth is initializing
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center space-y-4">
          <div className="mx-auto w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-slate-300">Initializing application...</p>
          <button
            onClick={() => window.location.href = '/'}
            className="text-xs text-slate-400 hover:text-slate-200 underline mt-4"
          >
            Reset to Landing Page (dev)
          </button>
        </div>
      </div>
    );
  }

  // Determine if user is an individual or organization user based on metadata and profile
  const isIndividualUser = user?.user_metadata?.user_type === 'individual' || (user && !profile?.org_id);
  const isOrgUser = user?.user_metadata?.user_type === 'organization' || (user && profile?.org_id);

  return (
    <Routes>
      <Route path="/auth/individual-login" element={<IndividualAuthPage />} />
      <Route path="/auth/organization-signup" element={<OrganizationSignupPage />} />
      <Route
        path="/auth/organization-login"
        element={user ? <Navigate to="/app" replace /> : <LoginPage />}
      />
      <Route path="/auth/callback" element={<AuthCallback />} />
      
      {/* Route based on user type */}
      <Route path="/individual/dashboard" element={isIndividualUser && user ? <IndividualDashboard /> : user && isOrgUser ? <Navigate to="/app" replace /> : <Navigate to="/auth/individual-login" replace />} />
      <Route path="/individual/settings" element={isIndividualUser && user ? <SettingsProfile /> : user && isOrgUser ? <Navigate to="/app" replace /> : <Navigate to="/auth/individual-login" replace />} />
      
      <Route
        path="/app/*"
        element={
          isOrgUser && user ? (
            <Layout />
          ) : user && isIndividualUser ? (
            <Navigate to="/individual/dashboard" replace />
          ) : (
            <Navigate to="/auth/organization-login" replace />
          )
        }
      />
      
      {/* Catch all for auth routes - redirect to landing */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page - no auth context */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/debug" element={<DebugPage />} />

        {/* All other routes use auth context */}
        <Route path="/*" element={<AuthApp />} />
      </Routes>
    </BrowserRouter>
  );
}
