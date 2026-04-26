import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { AppProvider } from "./contexts/AppContext";
import { LoginPage } from "./components/LoginPage";
import { LandingPage } from "./components/LandingPage";
import { IndividualAuthPage } from "./components/IndividualAuthPage";
import { OrganizationSignupPage } from "./components/OrganizationSignupPage";
import { IndividualDashboard } from "./components/IndividualDashboard";
import { AuthCallback } from "./components/AuthCallback";
import { Layout } from "./components/Layout";
import { SettingsProfile } from "./components/SettingsProfile";
import { PrivacyPolicyPage } from "./components/PrivacyPolicyPage";
import { TermsOfServicePage } from "./components/TermsOfServicePage";
import { ContactPage } from "./components/ContactPage";

function AppInner() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to="/app" replace /> : <LandingPage />} />
      <Route path="/auth/individual-login" element={<IndividualAuthPage />} />
      <Route path="/auth/organization-signup" element={<OrganizationSignupPage />} />
      <Route
        path="/auth/organization-login"
        element={user ? <Navigate to="/app" replace /> : <LoginPage />}
      />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/individual/dashboard" element={<Layout />} />
      <Route path="/individual/settings" element={<SettingsProfile />} />
      <Route
        path="/app/*"
        element={
          user ? (
            <Layout />
          ) : (
            <Navigate to="/auth/organization-login" replace />
          )
        }
      />
      <Route path="/privacy" element={<PrivacyPolicyPage />} />
      <Route path="/terms" element={<TermsOfServicePage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <AppInner />
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
}
