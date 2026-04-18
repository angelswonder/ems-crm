import { useState } from "react";
import { useApp } from "../contexts/AppContext";
import { Sidebar } from "./Sidebar";
import { Dashboard } from "./Dashboard";
import { Analytics } from "./Analytics";
import { Monitor } from "./Monitor";
import { Configuration } from "./Configuration";
import { Reports } from "./Reports";
import { SettingsProfile } from "./SettingsProfile";
import { Messaging } from "./Messaging";
import { CRMHub } from "./crm/CRMHub";
import { Toaster } from "sonner";

export function Layout() {
  const { currentUser } = useApp();
  const [currentPage, setCurrentPage] = useState("dashboard");

  const safePage = currentUser?.permissions.includes(currentPage as any)
    ? currentPage
    : currentUser?.permissions[0] ?? "dashboard";

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
      default:              return <Dashboard />;
    }
  };

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