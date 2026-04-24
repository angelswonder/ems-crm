import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppProvider, useApp } from "./contexts/AppContext";
import { LoginPage } from "./components/LoginPage";
import { LandingPage } from "./components/LandingPage";
import { IndividualAuthPage } from "./components/IndividualAuthPage";
import { IndividualDashboard } from "./components/IndividualDashboard";
import { AuthCallback } from "./components/AuthCallback";
import { Layout } from "./components/Layout";

function AppInner() {
  const { currentUser } = useApp();

  return (
    <Routes>
      <Route path="/" element={currentUser ? <Navigate to="/app" replace /> : <LandingPage />} />
      <Route path="/auth/individual-login" element={<IndividualAuthPage />} />
      <Route
        path="/auth/organization-login"
        element={currentUser ? <Navigate to="/app" replace /> : <LoginPage />}
      />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/individual/dashboard" element={<IndividualDashboard />} />
      <Route
        path="/app/*"
        element={
          currentUser ? (
            <Layout />
          ) : (
            <Navigate to="/auth/organization-login" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppInner />
      </BrowserRouter>
    </AppProvider>
  );
}
