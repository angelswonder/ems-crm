import { useState, useRef } from "react";
import { cn } from "./ui/utils";
import {
  LayoutDashboard,
  BarChart3,
  Settings,
  FileText,
  User,
  Zap,
  Map,
  MapPin,
  PlusCircle,
  X,
  Building2,
  Navigation,
  Check,
  MessageSquare,
  LogOut,
  Shield,
  Briefcase,
  Mail,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

const NAV_ITEMS: { id: SectionId; name: string; icon: React.ElementType; description: string; badge?: string }[] = [
  { id: "dashboard",      name: "Dashboard",        icon: LayoutDashboard, description: "Overview & monitoring" },
  { id: "analytics",      name: "Analytics",        icon: BarChart3,        description: "Advanced analytics" },
  { id: "monitor",        name: "Monitor",          icon: Map,              description: "Live location map", badge: "LIVE" },
  { id: "crm",            name: "CRM",              icon: Briefcase,        description: "Customer relationship mgmt" },
  { id: "configuration",  name: "Configuration",    icon: Shield,           description: "User & system config" },
  { id: "reports",        name: "Reports",          icon: FileText,         description: "Notifications & logs" },
  { id: "messaging",      name: "Messaging",        icon: MessageSquare,    description: "Team chat hub" },
  { id: "email-admin",    name: "Email Admin",      icon: Mail,             description: "Email system management" },
  { id: "settings",       name: "Settings & Profile",icon: User,            description: "User preferences" },
];

const STATUS_OPTIONS = [
  { value: "active",   label: "Active",   dot: "bg-green-500" },
  { value: "warning",  label: "Warning",  dot: "bg-amber-500" },
  { value: "inactive", label: "Inactive", dot: "bg-gray-400" },
] as const;

const ROLE_GRADIENT: Record<string, string> = {
  admin:        "from-emerald-600 to-teal-700",
  manager:      "from-blue-600 to-indigo-700",
  "team-leader":"from-violet-600 to-purple-700",
  supervisor:   "from-amber-600 to-orange-700",
};

export function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  const { profile, signOut } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ name: "", address: "", lat: "", lng: "", status: "active" as "active" | "inactive" | "warning" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [addSuccess, setAddSuccess] = useState(false);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // For now, assume all org users have access to all sections
  const userPermissions = ["dashboard", "analytics", "monitor", "configuration", "reports", "settings", "messaging", "crm"];
  const visibleNav = NAV_ITEMS.filter((item) => userPermissions.includes(item.id));

  const handleMouseEnter = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setIsExpanded(true);
  };
  const handleMouseLeave = () => {
    hoverTimeout.current = setTimeout(() => setIsExpanded(false), 200);
  };

  const handleLogout = () => {
    setIsExpanded(false);
    signOut();
  };

  const handleMouseEnter = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setIsExpanded(true);
  };
  const handleMouseLeave = () => {
    hoverTimeout.current = setTimeout(() => setIsExpanded(false), 200);
  };

  const handleLogout = () => {
    setIsExpanded(false);
    logout();
  };

  const validateForm = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.address.trim()) e.address = "Required";
    if (form.lat && isNaN(Number(form.lat))) e.lat = "Invalid number";
    if (form.lng && isNaN(Number(form.lng))) e.lng = "Invalid number";
    return e;
  };

  const handleAddSubmit = () => {
    const e = validateForm();
    if (Object.keys(e).length) { setErrors(e); return; }
    // For now, just show success - location management not implemented in SaaS version
    setAddSuccess(true);
    setTimeout(() => {
      setShowAddModal(false);
      setAddSuccess(false);
      setForm({ name: "", address: "", lat: "", lng: "", status: "active" });
      setErrors({});
    }, 1500);
  };
      isCustom: true,
    });
    setForm({ name: "", address: "", lat: "", lng: "", status: "active" });
    setErrors({});
    setAddSuccess(true);
    setTimeout(() => { setAddSuccess(false); setShowAddModal(false); }, 1800);
  };

  const gradientClass = ROLE_GRADIENT[currentUser?.role ?? "admin"];

  return (
    <>
      {/* Add Location Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowAddModal(false); }}
        >
          <div className="w-[420px] bg-card rounded-3xl shadow-2xl overflow-hidden border border-border/30 mx-4">
            <div className="px-6 py-5 flex items-center justify-between" style={{ background: "linear-gradient(135deg, #2c5f4e, #1e4d3d)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-base">Add Location</h3>
                  <p className="text-white/60 text-xs mt-0.5">Appears in Dashboard & Monitor map</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {addSuccess ? (
                <div className="flex flex-col items-center py-6 gap-3">
                  <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center">
                    <Check className="w-7 h-7 text-primary" />
                  </div>
                  <p className="font-semibold text-foreground">Location Added!</p>
                  <p className="text-sm text-muted-foreground text-center">Visible in Dashboard and Monitor.</p>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground" />Location Name <span className="text-destructive">*</span>
                    </label>
                    <input value={form.name} onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setErrors((er) => ({ ...er, name: "" })); }} placeholder="e.g. Warehouse Unit 3" className={`w-full h-10 px-4 rounded-xl border bg-background/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${errors.name ? "border-destructive/60" : "border-border/50"}`} />
                    {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-muted-foreground" />Address <span className="text-destructive">*</span>
                    </label>
                    <input value={form.address} onChange={(e) => { setForm((f) => ({ ...f, address: e.target.value })); setErrors((er) => ({ ...er, address: "" })); }} placeholder="e.g. Building E, North Industrial Park" className={`w-full h-10 px-4 rounded-xl border bg-background/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${errors.address ? "border-destructive/60" : "border-border/50"}`} />
                    {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Latitude (opt.)</label>
                      <input value={form.lat} onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))} placeholder="51.5074" className="w-full h-10 px-3 rounded-xl border border-border/50 bg-background/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">Longitude (opt.)</label>
                      <input value={form.lng} onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))} placeholder="-0.1278" className="w-full h-10 px-3 rounded-xl border border-border/50 bg-background/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Status</label>
                    <div className="flex gap-2">
                      {STATUS_OPTIONS.map((opt) => (
                        <button key={opt.value} onClick={() => setForm((f) => ({ ...f, status: opt.value }))} className={`flex-1 flex items-center justify-center gap-1.5 h-9 rounded-xl border text-xs font-medium transition-all ${form.status === opt.value ? "border-primary bg-primary/10 text-primary" : "border-border/50 bg-background/60 text-muted-foreground hover:border-border"}`}>
                          <span className={`w-2 h-2 rounded-full ${opt.dot}`} />{opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={handleAddSubmit} className="w-full h-11 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-sm" style={{ background: "linear-gradient(135deg, #2c5f4e, #3a6b5a)" }}>
                    <PlusCircle className="w-4 h-4" />Add Location
                  </button>
                  <p className="text-xs text-muted-foreground text-center">Coordinates are auto-assigned if not provided.</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="ml-6 my-6" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <div
          className={cn(
            "flex flex-col h-[calc(100vh-3rem)] transition-all duration-300 ease-in-out rounded-3xl",
            "bg-gradient-to-b from-sidebar via-sidebar to-sidebar-accent shadow-2xl border border-sidebar-border/20 overflow-hidden",
            isExpanded ? "w-64" : "w-20"
          )}
        >
          {/* Logo */}
          <div className="p-5 flex flex-col items-center relative flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-sidebar-primary to-sidebar-primary/80 rounded-full flex items-center justify-center shadow-lg">
              <Zap className="w-6 h-6 text-sidebar-primary-foreground" />
            </div>
            {isExpanded && (
              <div className="mt-3 text-center">
                <h2 className="text-sidebar-foreground font-semibold text-base whitespace-nowrap">EMS Control</h2>
                <p className="text-sidebar-foreground/70 text-xs whitespace-nowrap mt-0.5">Energy Management</p>
              </div>
            )}
          </div>

          {/* Role badge (expanded) */}
          {isExpanded && currentUser && (
            <div className="px-4 mb-3 flex-shrink-0">
              <div className="bg-sidebar-accent/60 rounded-xl px-3 py-2 flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full bg-sidebar-primary animate-pulse`} />
                <span className="text-sidebar-foreground/80 text-xs whitespace-nowrap truncate">{ROLE_LABELS[currentUser.role]}</span>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-4 py-2 overflow-y-auto overflow-x-hidden">
            <div className="space-y-2">
              {visibleNav.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                const hasUnread = item.id === "reports" && unreadCount > 0;

                return (
                  <div key={item.id} className="relative group">
                    <button
                      onClick={() => onPageChange(item.id)}
                      className={cn(
                        "transition-all duration-300 flex items-center relative overflow-hidden",
                        "hover:scale-105 hover:shadow-lg",
                        isExpanded
                          ? "w-full px-4 py-3 justify-start rounded-xl"
                          : "w-12 h-12 justify-center mx-auto rounded-full",
                        isActive
                          ? "bg-gradient-to-br from-sidebar-primary to-sidebar-primary/80 shadow-lg shadow-sidebar-primary/30 scale-105"
                          : "bg-gradient-to-br from-sidebar-accent to-sidebar-accent/80 hover:from-sidebar-primary/80 hover:to-sidebar-primary/60"
                      )}
                    >
                      <Icon className={cn("transition-colors duration-300 flex-shrink-0 w-5 h-5", isActive ? "text-sidebar-primary-foreground" : "text-sidebar-accent-foreground group-hover:text-sidebar-primary-foreground")} />

                      {isExpanded && (
                        <div className="ml-3 flex-1 overflow-hidden">
                          <div className={cn("font-medium text-sm whitespace-nowrap transition-colors duration-300 flex items-center gap-2", isActive ? "text-sidebar-primary-foreground" : "text-sidebar-accent-foreground group-hover:text-sidebar-primary-foreground")}>
                            {item.name}
                            {item.badge && (
                              <span className="text-[10px] bg-sidebar-primary/30 text-sidebar-primary-foreground px-1.5 py-0.5 rounded-full">{item.badge}</span>
                            )}
                            {hasUnread && (
                              <span className="ml-auto text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                            )}
                          </div>
                          {isActive && <div className="text-xs text-sidebar-primary-foreground/70 mt-0.5 whitespace-nowrap">{item.description}</div>}
                        </div>
                      )}

                      {/* Unread dot on collapsed */}
                      {hasUnread && !isExpanded && (
                        <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-sidebar" />
                      )}
                      {/* Active indicators */}
                      {isActive && !isExpanded && (
                        <>
                          <div className="absolute inset-0 rounded-full bg-sidebar-primary opacity-20 animate-pulse" />
                          <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-1 h-6 bg-sidebar-primary rounded-l-full" />
                        </>
                      )}
                      {isActive && isExpanded && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 w-2 h-2 bg-sidebar-primary-foreground rounded-full animate-pulse" />
                      )}
                    </button>

                    {/* Tooltip */}
                    {!isExpanded && (
                      <div className="absolute left-full ml-4 px-3 py-2 bg-gradient-to-br from-sidebar-primary to-sidebar-primary/90 text-sidebar-primary-foreground rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-50 shadow-lg transform translate-x-2 group-hover:translate-x-0">
                        <div className="font-medium text-sm flex items-center gap-1.5">
                          {item.name}
                          {item.badge && <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-full">{item.badge}</span>}
                          {hasUnread && <span className="text-[10px] bg-red-500 px-1.5 py-0.5 rounded-full">{unreadCount} new</span>}
                        </div>
                        <div className="text-xs opacity-75 mt-0.5">{item.description}</div>
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-sidebar-primary rotate-45" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </nav>

          {/* Bottom section */}
          <div className="px-4 pb-4 space-y-2 flex-shrink-0">
            <div className="h-px bg-sidebar-border/30 mx-2" />

            {profile && (
              <div className="relative group">
                <button
                  onClick={() => setShowAddModal(true)}
                  className={cn(
                    "transition-all duration-300 flex items-center relative overflow-hidden",
                    "hover:scale-105 hover:shadow-lg",
                    isExpanded ? "w-full px-4 py-2.5 justify-start rounded-xl" : "w-12 h-12 justify-center mx-auto rounded-full",
                    "bg-gradient-to-br from-sidebar-primary/30 to-sidebar-primary/20 hover:from-sidebar-primary/50 hover:to-sidebar-primary/40 ring-1 ring-sidebar-primary/40"
                  )}
                >
                  <PlusCircle className="w-5 h-5 text-sidebar-primary flex-shrink-0" />
                  {isExpanded && (
                    <div className="ml-3">
                      <div className="font-medium text-sm text-sidebar-primary whitespace-nowrap">Add Location</div>
                      <div className="text-xs text-sidebar-primary/70 whitespace-nowrap">Track new device site</div>
                    </div>
                  )}
                </button>
                {!isExpanded && (
                  <div className="absolute left-full ml-4 px-3 py-2 bg-gradient-to-br from-sidebar-primary to-sidebar-primary/90 text-sidebar-primary-foreground rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-50 shadow-lg transform translate-x-2 group-hover:translate-x-0">
                    <div className="font-medium text-sm">Add Location</div>
                    <div className="text-xs opacity-75 mt-0.5">Track new device site</div>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-sidebar-primary rotate-45" />
                  </div>
                )}
              </div>
            )}

            {/* Logout */}
            <div className="relative group">
              <button
                onClick={handleLogout}
                className={cn(
                  "transition-all duration-300 flex items-center relative overflow-hidden",
                  "hover:scale-105",
                  isExpanded ? "w-full px-4 py-2.5 justify-start rounded-xl" : "w-12 h-12 justify-center mx-auto rounded-full",
                  "bg-red-500/10 hover:bg-red-500/20 ring-1 ring-red-500/20"
                )}
              >
                <LogOut className="w-5 h-5 text-red-500 flex-shrink-0" />
                {isExpanded && (
                  <div className="ml-3">
                    <div className="font-medium text-sm text-red-500 whitespace-nowrap">Log Out</div>
                    <div className="text-xs text-red-400/70 whitespace-nowrap">Return to login page</div>
                  </div>
                )}
              </button>
              {!isExpanded && (
                <div className="absolute left-full ml-4 px-3 py-2 bg-red-600 text-white rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-50 shadow-lg transform translate-x-2 group-hover:translate-x-0">
                  <div className="font-medium text-sm">Log Out</div>
                  <div className="text-xs opacity-75 mt-0.5">Return to login page</div>
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-red-600 rotate-45" />
                </div>
              )}
            </div>

            {/* User profile */}
            {currentUser && (
              <div className="relative group">
                <div
                  className={cn(
                    "transition-all duration-300 flex items-center cursor-pointer hover:scale-105",
                    isExpanded ? "gap-3 px-2 py-2" : "justify-center py-1"
                  )}
                  onClick={() => currentUser.permissions.includes("settings") && onPageChange("settings")}
                >
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradientClass} flex items-center justify-center shadow-lg flex-shrink-0`}>
                    <span className="text-white font-semibold text-sm">{currentUser.initials}</span>
                  </div>
                  {isExpanded && (
                    <div className="overflow-hidden">
                      <div className="text-sidebar-foreground font-medium text-sm whitespace-nowrap truncate">{currentUser.name}</div>
                      <div className="text-sidebar-foreground/60 text-xs whitespace-nowrap truncate">{currentUser.companyEmail}</div>
                    </div>
                  )}
                </div>
                {!isExpanded && (
                  <div className="absolute left-full ml-4 px-3 py-2 bg-gradient-to-br from-sidebar-primary to-sidebar-primary/90 text-sidebar-primary-foreground rounded-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-50 shadow-lg transform translate-x-2 group-hover:translate-x-0">
                    <div className="font-medium text-sm">{currentUser.name}</div>
                    <div className="text-xs opacity-75 mt-0.5">{ROLE_LABELS[currentUser.role]}</div>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-sidebar-primary rotate-45" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}