import { useState } from "react";
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
import { Toaster } from "sonner";

export function Layout() {
  const { profile, tenant } = useAuth();
  const [currentPage, setCurrentPage] = useState("dashboard");

  // For now, assume all org users have access to all sections
  // TODO: Implement proper role-based permissions
  const userPermissions = ["dashboard", "analytics", "monitor", "configuration", "reports", "settings", "messaging", "crm"];

  const safePage = userPermissions.includes(currentPage) ? currentPage : "dashboard";

  const renderContent = () => {
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

  if (!profile) {
    return <div>Loading...</div>;
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