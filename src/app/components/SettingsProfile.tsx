import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useApp, ThemeName } from "../contexts/AppContext";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Switch } from "./ui/switch";
import { Badge } from "./ui/badge";
import {
  User,
  Bell,
  Shield,
  Palette,
  Database,
  ChevronRight,
  Check,
  Edit2,
  Lock,
  Code2,
} from "lucide-react";
import { toast } from "sonner";

const SETTINGS_SECTIONS = [
  { icon: Bell,     label: "Notifications",  desc: "Alerts & thresholds" },
  { icon: Shield,   label: "Security",        desc: "Auth & permissions" },
  { icon: Palette,  label: "Appearance",      desc: "Theme & display" },
  { icon: Database, label: "Data & Storage",  desc: "Export & retention" },
  { icon: Code2,    label: "About",          desc: "Developer & info" },
];

export function SettingsProfile() {
  const { profile, updateProfile, user } = useAuth();
  const { theme, setTheme } = useApp();

  // Profile edit state
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState(profile?.full_name ?? "");
  const [profileSaved, setProfileSaved] = useState(false);

  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Notifications state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);
  const [thresholdAlert, setThresholdAlert] = useState(85);
  const [testNotificationMessage, setTestNotificationMessage] = useState<string | null>(null);

  // Appearance & storage state
  const [selectedTheme, setSelectedTheme] = useState<ThemeName>(theme);
  const [retentionPolicy, setRetentionPolicy] = useState("365");
  const [autoArchive, setAutoArchive] = useState(true);

  // Return early if no profile
  if (!profile || !user) {
    return (
      <div className="flex h-full items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="mx-auto w-8 h-8 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-slate-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  const handleSaveProfile = async () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      toast.error("Name cannot be empty");
      return;
    }
    try {
      await updateProfile({ full_name: trimmed });
      setEditingProfile(false);
      setProfileSaved(true);
      toast.success("Profile updated successfully!");
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (error) {
      toast.error("Failed to update profile");
      console.error("Error:", error);
    }
  };

  const handleCancelEdit = () => {
    setEditName(profile?.full_name ?? "");
    setEditingProfile(false);
  };

  useEffect(() => {
    if (profile?.full_name) {
      setEditName(profile.full_name);
    }
  }, [profile?.full_name]);

  useEffect(() => {
    setSelectedTheme(theme);
  }, [theme]);

  const handleThemeChange = async (newTheme: ThemeName) => {
    setSelectedTheme(newTheme);
    setTheme(newTheme);

    if (profile) {
      try {
        await updateProfile({ theme_preference: newTheme });
        toast.success("Theme preference saved.");
      } catch (error) {
        console.error("Failed to save theme preference:", error);
        toast.error("Unable to save theme preference.");
      }
    }
  };

  const handleSendTestNotification = () => {
    setTestNotificationMessage("Test notification sent successfully!");
    setTimeout(() => setTestNotificationMessage(null), 3000);
  };

  const handleExportData = () => {
    const payload = {
      user: { 
        name: profile.full_name, 
        email: profile.email, 
        role: profile.role, 
        id: profile.id 
      },
      organization: profile.org_id,
      timestamp: new Date().toISOString(),
    };
    
    const dataStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ems-profile-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success("✓ Profile exported successfully.");
  };

  const renderSectionContent = () => {
    if (!activeSection) {
      return (
        <Card className="border-border/30 shadow-sm">
          <CardHeader className="px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">System Settings Overview</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Configure notifications, security, appearance, and data storage.</p>
              </div>
              <Badge className="bg-primary/10 text-primary border-primary/20">Ready</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 p-5">
            <div className="rounded-3xl border border-border/50 bg-background/80 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Theme</div>
              <div className="text-sm font-medium text-foreground mt-2">{selectedTheme} mode</div>
              <div className="text-xs text-muted-foreground mt-1">Display style: Standard</div>
            </div>
            <div className="rounded-3xl border border-border/50 bg-background/80 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Profile</div>
              <div className="text-sm font-medium text-foreground mt-2">{profile.full_name}</div>
              <div className="text-xs text-muted-foreground mt-1">Role: {profile.role}</div>
            </div>
            <div className="rounded-3xl border border-border/50 bg-background/80 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Alerts</div>
              <div className="text-sm font-medium text-foreground mt-2">Email alerts: {emailAlertsEnabled ? "On" : "Off"}</div>
              <div className="text-xs text-muted-foreground mt-1">Threshold: {thresholdAlert}%</div>
            </div>
            <div className="rounded-3xl border border-border/50 bg-background/80 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Storage</div>
              <div className="text-sm font-medium text-foreground mt-2">Retention: {retentionPolicy} days</div>
              <div className="text-xs text-muted-foreground mt-1">Auto Archive: {autoArchive ? "Enabled" : "Disabled"}</div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (activeSection === "Notifications") {
      return (
        <Card className="border-border/30 shadow-sm">
          <CardHeader className="px-5 py-4">
            <h2 className="text-base font-semibold text-foreground">Notifications</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Control alert channels and thresholds.</p>
          </CardHeader>
          <CardContent className="space-y-5 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-border/50 bg-background/80 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Email Alerts</h3>
                    <p className="text-xs text-muted-foreground mt-1">Send messages to your inbox.</p>
                  </div>
                  <Switch checked={emailAlertsEnabled} onCheckedChange={setEmailAlertsEnabled} />
                </div>
              </div>
              <div className="rounded-3xl border border-border/50 bg-background/80 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
                    <p className="text-xs text-muted-foreground mt-1">Receive system alerts.</p>
                  </div>
                  <Switch checked={notificationsEnabled} onCheckedChange={setNotificationsEnabled} />
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-border/50 bg-background/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Threshold Alerts</h3>
                  <p className="text-xs text-muted-foreground mt-1">Trigger alert when usage exceeds threshold.</p>
                </div>
                <span className="text-sm font-medium text-foreground">{thresholdAlert}%</span>
              </div>
              <input type="range" min={65} max={100} step={1} value={thresholdAlert} onChange={(e) => setThresholdAlert(Number(e.target.value))} className="w-full" />
            </div>
            <div className="rounded-3xl border border-border/50 bg-background/80 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Test Notification</h3>
                  <p className="text-xs text-muted-foreground mt-1">Confirm system is working.</p>
                </div>
                <button onClick={handleSendTestNotification} className="rounded-xl border border-border/50 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/30 transition-colors">Send Test</button>
              </div>
              {testNotificationMessage && <p className="text-sm text-foreground mt-3">{testNotificationMessage}</p>}
            </div>
          </CardContent>
        </Card>
      );
    }

    if (activeSection === "Security") {
      return (
        <Card className="border-border/30 shadow-sm">
          <CardHeader className="px-5 py-4">
            <h2 className="text-base font-semibold text-foreground">Security</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Account security and authentication settings.</p>
          </CardHeader>
          <CardContent className="space-y-6 p-5">
            <div className="rounded-3xl border border-border/50 bg-background/80 p-4 space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-border/30">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Account Status</h3>
                  <p className="text-xs text-muted-foreground">Account email: {profile.email}</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">User Role</span>
                  <Badge className="bg-primary/10 text-primary border-primary/20">{profile.role}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Account Type</span>
                  <span className="text-sm font-medium text-foreground">{profile.org_id ? "Organization" : "Individual"}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (activeSection === "Appearance") {
      return (
        <Card className="border-border/30 shadow-sm">
          <CardHeader className="px-5 py-4">
            <h2 className="text-base font-semibold text-foreground">Appearance</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Choose a theme for your experience.</p>
          </CardHeader>
          <CardContent className="space-y-5 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { id: "light", label: "Light", description: "Bright system default." },
                { id: "dark", label: "Dark", description: "Modern low-light experience." },
                { id: "solar", label: "Solar", description: "Warm amber accent palette." },
                { id: "corporate", label: "Corporate", description: "Professional slate styling." },
                { id: "ocean", label: "Ocean", description: "Cool blue interface." },
              ].map((option) => (
                <button key={option.id} onClick={() => handleThemeChange(option.id as ThemeName)} className={`rounded-3xl border p-4 text-left transition-all ${selectedTheme === option.id ? "border-primary bg-primary/10" : "border-border/50 bg-background/80 hover:border-primary hover:bg-muted/80"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">{option.label}</div>
                      <p className="text-xs text-muted-foreground mt-1">{option.description}</p>
                    </div>
                    {selectedTheme === option.id && <Badge className="bg-primary/10 text-primary border-primary/20">Active</Badge>}
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      );
    }

    if (activeSection === "Data & Storage") {
      return (
        <Card className="border-border/30 shadow-sm">
          <CardHeader className="px-5 py-4">
            <h2 className="text-base font-semibold text-foreground">Data & Storage</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Manage data retention and export.</p>
          </CardHeader>
          <CardContent className="space-y-5 p-5">
            <div className="rounded-3xl border border-border/50 bg-background/80 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Data Retention</h3>
                  <p className="text-xs text-muted-foreground mt-1">Delete old records after specified days.</p>
                </div>
                <span className="text-sm font-medium text-foreground">{retentionPolicy} days</span>
              </div>
              <select value={retentionPolicy} onChange={(e) => setRetentionPolicy(e.target.value)} className="w-full h-11 rounded-xl border border-border/50 bg-background/60 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="365">365 days</option>
                <option value="never">Never delete</option>
              </select>
            </div>
            <div className="rounded-3xl border border-border/50 bg-background/80 p-4 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Auto Archive</h3>
                  <p className="text-xs text-muted-foreground mt-1">Automatically archive completed records.</p>
                </div>
                <Switch checked={autoArchive} onCheckedChange={setAutoArchive} />
              </div>
            </div>
            <div className="rounded-3xl border border-border/50 bg-background/80 p-4">
              <button onClick={handleExportData} className="w-full h-11 rounded-xl bg-primary text-white text-sm font-medium hover:opacity-95 transition">
                ⬇ Export Profile Data
              </button>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (activeSection === "About") {
      return (
        <Card className="border-border/30 shadow-sm">
          <CardHeader className="px-5 py-4">
            <h2 className="text-base font-semibold text-foreground">About</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Application information.</p>
          </CardHeader>
          <CardContent className="space-y-5 p-5">
            <div className="rounded-3xl border border-border/50 bg-background/80 p-4 space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Industrial Management Tracking System</h3>
                <p className="text-xs text-muted-foreground mt-1">v1.0.0</p>
              </div>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>• Fully responsive design</p>
                <p>• Real-time data synchronization</p>
                <p>• Enterprise-grade security</p>
                <p>• Built with React & TypeScript</p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Profile Header */}
      <Card className="border-border/30 shadow-sm overflow-hidden">
        <div className="px-5 py-4 flex items-center gap-4" style={{ background: "linear-gradient(135deg, #1e3a8a, #0c4a6e)" }}>
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
            <User className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h1 className="text-white font-semibold text-lg">{profile.full_name}</h1>
            <p className="text-white/60 text-sm">{profile.email}</p>
          </div>
          {profileSaved && <Badge className="bg-green-500/20 text-green-400 border-green-500/30">✓ Saved</Badge>}
        </div>

        <CardContent className="p-5">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-2">Full Name</label>
              {editingProfile ? (
                <div className="flex gap-2">
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Your name"
                    className="flex-1 h-11 px-4 rounded-xl border border-border/50 bg-background/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button
                    onClick={handleSaveProfile}
                    className="h-11 px-4 rounded-xl bg-primary text-white text-sm font-medium hover:opacity-95 transition"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="h-11 px-4 rounded-xl border border-border/50 text-foreground text-sm font-medium hover:bg-muted/30 transition"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-background/60">
                  <span className="text-foreground">{profile.full_name}</span>
                  <button
                    onClick={() => {
                      setEditName(profile.full_name);
                      setEditingProfile(true);
                    }}
                    className="text-xs font-medium text-primary hover:opacity-75 transition"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Sections Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {SETTINGS_SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.label;
          return (
            <button
              key={section.label}
              onClick={() => setActiveSection(isActive ? null : section.label)}
              className={`rounded-2xl border p-4 text-left transition-all ${
                isActive
                  ? "border-primary bg-primary/10"
                  : "border-border/50 bg-background/80 hover:border-primary hover:bg-muted/80"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isActive ? "bg-primary/20" : "bg-muted/30"}`}>
                    <Icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{section.label}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{section.desc}</p>
                  </div>
                </div>
                <ChevronRight className={`w-5 h-5 text-muted-foreground transition-transform ${isActive ? "rotate-90" : ""}`} />
              </div>
            </button>
          );
        })}
      </div>

      {/* Section Content */}
      {renderSectionContent()}
    </div>
  );
}
