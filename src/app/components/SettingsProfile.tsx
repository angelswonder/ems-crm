import { useState } from "react";
import { useApp, ROLE_LABELS } from "../contexts/AppContext";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  User,
  Bell,
  Shield,
  Palette,
  Database,
  Globe,
  ChevronRight,
  Check,
  Trash2,
  MapPin,
  PlusCircle,
  Building2,
  Navigation,
  Edit2,
  Save,
  X,
  Mail,
  Lock,
} from "lucide-react";

const STATUS_OPTIONS = [
  { value: "active",   label: "Active",   dot: "bg-green-500" },
  { value: "warning",  label: "Warning",  dot: "bg-amber-500" },
  { value: "inactive", label: "Inactive", dot: "bg-gray-400" },
] as const;

const SETTINGS_SECTIONS = [
  { icon: Bell,     label: "Notifications",  desc: "Alerts & thresholds" },
  { icon: Shield,   label: "Security",        desc: "Auth & permissions" },
  { icon: Palette,  label: "Appearance",      desc: "Theme & display" },
  { icon: Database, label: "Data & Storage",  desc: "Export & retention" },
  { icon: Globe,    label: "Integrations",    desc: "APIs & webhooks" },
];

const ROLE_GRADIENT: Record<string, string> = {
  admin:        "from-emerald-600 to-teal-700",
  manager:      "from-blue-600 to-indigo-700",
  "team-leader":"from-violet-600 to-purple-700",
  supervisor:   "from-amber-600 to-orange-700",
};

export function SettingsProfile() {
  const { currentUser, updateUser, addNotification, locations, addLocation, removeLocation } = useApp();

  // Profile edit state
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState(currentUser?.name ?? "");
  const [profileSaved, setProfileSaved] = useState(false);

  // Add location form state
  const [locForm, setLocForm] = useState({ name: "", address: "", lat: "", lng: "", status: "active" as "active" | "inactive" | "warning" });
  const [locErrors, setLocErrors] = useState<Record<string, string>>({});
  const [locSuccess, setLocSuccess] = useState(false);

  const [activeSection, setActiveSection] = useState<string | null>(null);

  if (!currentUser) return null;

  const handleSaveProfile = () => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    const oldName = currentUser.name;
    updateUser(currentUser.id, { name: trimmed });
    addNotification({
      type: "profile-change",
      subject: `Profile Updated — ${trimmed}`,
      body: `A user has updated their profile.\n\nUser ID: ${currentUser.id}\nRole: ${ROLE_LABELS[currentUser.role]}\nPrevious Name: ${oldName}\nNew Name: ${trimmed}\nTimestamp: ${new Date().toLocaleString()}`,
      fromUser: currentUser.id,
    });
    setEditingProfile(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 3000);
  };

  const handleCancelEdit = () => {
    setEditName(currentUser.name);
    setEditingProfile(false);
  };

  const validateLoc = () => {
    const e: Record<string, string> = {};
    if (!locForm.name.trim()) e.name = "Required";
    if (!locForm.address.trim()) e.address = "Required";
    if (locForm.lat && isNaN(Number(locForm.lat))) e.lat = "Invalid";
    if (locForm.lng && isNaN(Number(locForm.lng))) e.lng = "Invalid";
    return e;
  };

  const handleAddLoc = () => {
    const e = validateLoc();
    if (Object.keys(e).length) { setLocErrors(e); return; }
    const baseLat = 51.506 + (Math.random() - 0.5) * 0.015;
    const baseLng = -0.09 + (Math.random() - 0.5) * 0.015;
    addLocation({
      id: `custom-${Date.now()}`,
      name: locForm.name.trim(),
      address: locForm.address.trim(),
      lat: locForm.lat ? Number(locForm.lat) : baseLat,
      lng: locForm.lng ? Number(locForm.lng) : baseLng,
      status: locForm.status,
      isCustom: true,
    });
    setLocForm({ name: "", address: "", lat: "", lng: "", status: "active" });
    setLocErrors({});
    setLocSuccess(true);
    setTimeout(() => setLocSuccess(false), 3000);
  };

  const customLocations = locations.filter((l) => l.isCustom);
  const defaultLocations = locations.filter((l) => !l.isCustom);
  const gradient = ROLE_GRADIENT[currentUser.role] ?? ROLE_GRADIENT.admin;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8faf9" }}>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Settings & Profile</h1>
          <p className="text-muted-foreground mt-0.5">Manage your account, preferences, and device locations</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left column */}
          <div className="xl:col-span-1 space-y-4">
            {/* Profile card */}
            <Card className="border-border/30 shadow-sm overflow-hidden">
              <div className={`h-16 bg-gradient-to-br ${gradient}`} />
              <CardContent className="pt-0 pb-5 px-5 -mt-8">
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg ring-4 ring-background`}>
                  <span className="text-white text-xl font-bold">{currentUser.initials}</span>
                </div>
                <div className="mt-3">
                  {editingProfile ? (
                    <div className="space-y-2">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full h-9 px-3 rounded-xl border border-border/50 bg-background text-sm font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveProfile}
                          className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-xl text-white text-xs font-medium transition-all hover:opacity-90"
                          style={{ background: "linear-gradient(135deg, #2c5f4e, #3a6b5a)" }}
                        >
                          <Save className="w-3 h-3" />Save
                        </button>
                        <button onClick={handleCancelEdit} className="flex-1 h-8 rounded-xl border border-border/50 text-xs text-muted-foreground hover:bg-muted/40 transition-colors">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-foreground text-base flex items-center gap-2">
                          {currentUser.name}
                          {profileSaved && <Check className="w-4 h-4 text-green-500" />}
                        </div>
                        <div className="text-sm text-muted-foreground mt-0.5">{currentUser.companyEmail}</div>
                        <Badge className={`mt-2 text-xs ${currentUser.role === "admin" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : currentUser.role === "manager" ? "bg-blue-50 text-blue-700 border-blue-200" : currentUser.role === "team-leader" ? "bg-violet-50 text-violet-700 border-violet-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
                          {ROLE_LABELS[currentUser.role]}
                        </Badge>
                      </div>
                      <button
                        onClick={() => { setEditName(currentUser.name); setEditingProfile(true); }}
                        className="w-8 h-8 rounded-xl bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors flex-shrink-0 mt-0.5"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-primary" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Profile details */}
                <div className="mt-4 space-y-2 pt-4 border-t border-border/20">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{currentUser.username}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Shield className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{currentUser.permissions.length} sections accessible</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Lock className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Password: ••••••••</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Settings nav */}
            <Card className="border-border/30 shadow-sm">
              <CardContent className="p-2">
                {SETTINGS_SECTIONS.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => setActiveSection(activeSection === s.label ? null : s.label)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group ${activeSection === s.label ? "bg-primary/10 text-primary" : "hover:bg-muted/50 text-foreground"}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${activeSection === s.label ? "bg-primary/20" : "bg-muted/60 group-hover:bg-muted"}`}>
                      <s.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="text-sm font-medium">{s.label}</div>
                      <div className="text-xs text-muted-foreground">{s.desc}</div>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${activeSection === s.label ? "rotate-90" : ""}`} />
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right column */}
          <div className="xl:col-span-2 space-y-5">
            {/* Add Location card */}
            <Card className="border-border/30 shadow-sm overflow-hidden">
              <div className="px-5 py-4 flex items-center gap-3" style={{ background: "linear-gradient(135deg, #2c5f4e, #1e4d3d)" }}>
                <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-white font-semibold text-base leading-tight">Add Location</h2>
                  <p className="text-white/60 text-xs mt-0.5">New locations appear in the Dashboard filter and Monitor map</p>
                </div>
                {locSuccess && (
                  <div className="flex items-center gap-1.5 bg-white/15 text-white px-3 py-1.5 rounded-full text-xs font-medium">
                    <Check className="w-3.5 h-3.5" />Added!
                  </div>
                )}
              </div>

              <CardContent className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-muted-foreground" />Location Name <span className="text-destructive">*</span>
                    </label>
                    <input value={locForm.name} onChange={(e) => { setLocForm((f) => ({ ...f, name: e.target.value })); setLocErrors((er) => ({ ...er, name: "" })); }} placeholder="e.g. Warehouse Unit 3" className={`w-full h-11 px-4 rounded-xl border bg-background/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${locErrors.name ? "border-destructive/50" : "border-border/50 hover:border-border"}`} />
                    {locErrors.name && <p className="text-xs text-destructive">{locErrors.name}</p>}
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-muted-foreground" />Address <span className="text-destructive">*</span>
                    </label>
                    <input value={locForm.address} onChange={(e) => { setLocForm((f) => ({ ...f, address: e.target.value })); setLocErrors((er) => ({ ...er, address: "" })); }} placeholder="e.g. Building E, North Industrial Park" className={`w-full h-11 px-4 rounded-xl border bg-background/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all ${locErrors.address ? "border-destructive/50" : "border-border/50 hover:border-border"}`} />
                    {locErrors.address && <p className="text-xs text-destructive">{locErrors.address}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Latitude <span className="text-muted-foreground font-normal">(optional)</span></label>
                    <input value={locForm.lat} onChange={(e) => setLocForm((f) => ({ ...f, lat: e.target.value }))} placeholder="51.5074" className="w-full h-11 px-4 rounded-xl border border-border/50 bg-background/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Longitude <span className="text-muted-foreground font-normal">(optional)</span></label>
                    <input value={locForm.lng} onChange={(e) => setLocForm((f) => ({ ...f, lng: e.target.value }))} placeholder="-0.1278" className="w-full h-11 px-4 rounded-xl border border-border/50 bg-background/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" />
                  </div>
                  <div className="sm:col-span-2 space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Status</label>
                    <div className="flex gap-2">
                      {STATUS_OPTIONS.map((opt) => (
                        <button key={opt.value} onClick={() => setLocForm((f) => ({ ...f, status: opt.value }))} className={`flex-1 flex items-center justify-center gap-2 h-11 rounded-xl border text-sm font-medium transition-all ${locForm.status === opt.value ? "border-primary bg-primary/10 text-primary shadow-sm" : "border-border/50 bg-background/60 text-muted-foreground hover:border-border hover:text-foreground"}`}>
                          <span className={`w-2 h-2 rounded-full ${opt.dot}`} />{opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <button onClick={handleAddLoc} className="mt-5 w-full h-11 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-sm" style={{ background: "linear-gradient(135deg, #2c5f4e, #3a6b5a)" }}>
                  <PlusCircle className="w-4 h-4" />Add Location to System
                </button>
                <p className="text-xs text-muted-foreground text-center mt-2.5">Coordinates auto-assigned if not provided.</p>
              </CardContent>
            </Card>

            {/* Custom locations */}
            {customLocations.length > 0 && (
              <Card className="border-border/30 shadow-sm">
                <CardHeader className="px-5 py-3 border-b border-border/20">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground text-sm">Custom Locations</span>
                    <Badge className="bg-primary/10 text-primary border-primary/20">{customLocations.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {customLocations.map((loc, i) => (
                    <div key={loc.id} className={`flex items-center gap-3 px-5 py-3.5 ${i < customLocations.length - 1 ? "border-b border-border/20" : ""}`}>
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <MapPin className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{loc.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{loc.address}</div>
                      </div>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${loc.status === "active" ? "bg-green-50 text-green-700 border-green-200" : loc.status === "warning" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-gray-100 text-gray-500 border-gray-200"}`}>
                        {loc.status}
                      </span>
                      <button onClick={() => removeLocation(loc.id)} className="w-8 h-8 rounded-lg bg-destructive/5 hover:bg-destructive/10 flex items-center justify-center text-destructive/60 hover:text-destructive transition-all flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Default locations */}
            <Card className="border-border/30 shadow-sm">
              <CardHeader className="px-5 py-3 border-b border-border/20">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground text-sm">Default Locations</span>
                  <Badge className="bg-muted text-muted-foreground border-border/30">{defaultLocations.length} built-in</Badge>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {defaultLocations.map((loc, i) => (
                  <div key={loc.id} className={`flex items-center gap-3 px-5 py-3 ${i < defaultLocations.length - 1 ? "border-b border-border/10" : ""}`}>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${loc.status === "active" ? "bg-green-500" : loc.status === "warning" ? "bg-amber-500" : "bg-gray-400"}`} />
                    <span className="text-sm text-foreground flex-1 truncate">{loc.name}</span>
                    <span className="text-xs text-muted-foreground">{loc.address}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
