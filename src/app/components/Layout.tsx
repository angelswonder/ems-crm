import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Sidebar } from "./Sidebar";
import { Dashboard } from "./Dashboard";
import { Analytics } from "./Analytics";
import { Monitor } from "./Monitor";
import { Configuration } from "./Configuration";
import { Reports } from "./Reports";
import { SettingsProfile } from "./SettingsProfile";
import { Messaging } from "./Messaging";
import { CRMHub } from "./crm/CRMHub";
import { EmailAdminPage } from "./EmailAdminPage";
import { SuperAdminDashboard } from "./admin/SuperAdminDashboard";
import { Toaster } from "sonner";

export function Layout() {
  const { profile, tenant, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Set a timeout for profile loading to prevent indefinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!profile) {
        console.warn('Profile loading timeout - using fallback');
        setLoadingTimeout(true);
      }
    }, 5000);

    return () => clearTimeout(timeout);
  }, [profile]);

  // For now, assume all org users have access to all sections
  // TODO: Implement proper role-based permissions
  const userPermissions = ["dashboard", "analytics", "monitor", "configuration", "reports", "settings", "messaging", "crm"];

  const safePage = userPermissions.includes(currentPage) ? currentPage : "dashboard";

  const renderContent = () => {
    if (safePage === "dashboard" && profile?.is_super_admin) {
      return <SuperAdminDashboard />;
    }

    switch (safePage) {
      case "dashboard":      return <Dashboard />;
      case "analytics":     return <Analytics />;
      case "monitor":       return <Monitor />;
      case "configuration": return <Configuration />;
      case "reports":       return <Reports />;
      case "settings":      return <SettingsProfile />;
      case "messaging":     return <Messaging />;
      case "crm":           return <CRMHub />;
      case "email-admin":   return <EmailAdminPage />;
      default:              return <Dashboard />;
    }
  };

  if (!profile && !loadingTimeout) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="mx-auto w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-slate-400">Loading your dashboard...</p>
          <p className="text-xs text-slate-500">If this takes too long, try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Toaster richColors position="top-right" />
      <div className="flex-shrink-0">
        <Sidebar currentPage={safePage} onPageChange={setCurrentPage} />
      </div>
      <main className="flex-1 overflow-auto">{renderContent()}</main>
    </div>
  );
}