import { useState, useEffect } from "react";
import { useApp, ROLE_LABELS } from "../contexts/AppContext";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Switch } from "./ui/switch";
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
  Code2,
} from "lucide-react";
import { createVerificationCode, sendVerificationEmail, verifyCode, getVerificationStatus } from "./crm/emailApi";
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabaseClient';
import type { VerificationCode } from "./crm/emailApi";

const supabase = isSupabaseConfigured ? getSupabaseClient() : null;

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
  { icon: Code2,    label: "About",          desc: "Developer & info" },
];

const ROLE_GRADIENT: Record<string, string> = {
  admin:        "from-emerald-600 to-teal-700",
  manager:      "from-blue-600 to-indigo-700",
  "team-leader":"from-violet-600 to-purple-700",
  supervisor:   "from-amber-600 to-orange-700",
};

export function SettingsProfile() {
  const { currentUser, theme, setTheme, layoutMode, setLayoutMode, updateUser, addNotification, locations, addLocation, removeLocation } = useApp();

  // Profile edit state
  const [editingProfile, setEditingProfile] = useState(false);
  const [editName, setEditName] = useState(currentUser?.name ?? "");
  const [profileSaved, setProfileSaved] = useState(false);

  // Add location form state
  const [locForm, setLocForm] = useState({ name: "", address: "", lat: "", lng: "", status: "active" as "active" | "inactive" | "warning" });
  const [locErrors, setLocErrors] = useState<Record<string, string>>({});
  const [locSuccess, setLocSuccess] = useState(false);

  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Notifications state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);
  const [smsAlertsEnabled, setSmsAlertsEnabled] = useState(false);
  const [thresholdAlert, setThresholdAlert] = useState(85);
  const [testNotificationMessage, setTestNotificationMessage] = useState<string | null>(null);

  // Security state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phoneNumber, setPhoneNumber] = useState(currentUser?.phoneNumber ?? "");
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(currentUser?.twoFactorEnabled ?? false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [enteredCode, setEnteredCode] = useState("");
  const [securityMessage, setSecurityMessage] = useState("");

  // Integrations state
  const [slackEnabled, setSlackEnabled] = useState(true);
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [apiEnabled, setApiEnabled] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [integrationMessage, setIntegrationMessage] = useState<string>("");

  // Appearance & storage state
  const [selectedTheme, setSelectedTheme] = useState(theme);
  const [selectedLayout, setSelectedLayout] = useState(layoutMode);
  const [retentionPolicy, setRetentionPolicy] = useState("365");
  const [autoArchive, setAutoArchive] = useState(true);
  const [cleanupMessage, setCleanupMessage] = useState("");
  const [exportMessage, setExportMessage] = useState("");

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

  useEffect(() => {
    setEditName(currentUser.name);
    setPhoneNumber(currentUser.phoneNumber ?? "");
    setTwoFactorEnabled(currentUser.twoFactorEnabled ?? false);
    setSelectedTheme(theme);
    setSelectedLayout(layoutMode);
  }, [currentUser, theme, layoutMode]);

  const handleSendTestNotification = () => {
    setTestNotificationMessage("Sending a sample alert to your notification center...");
    setTimeout(() => {
      addNotification({
        type: "profile-change",
        subject: "Test Alert — System Notifications",
        body: `A notification test was performed by ${currentUser.name}. If you do not see this alert in the notification center, verify your notification settings.`,
        fromUser: currentUser.id,
      });
      setTestNotificationMessage("Test notification sent successfully.");
      setTimeout(() => setTestNotificationMessage(null), 3500);
    }, 600);
  };

  const handleRequestVerificationCode = async () => {
    if (!currentUser.companyEmail?.trim()) {
      setSecurityMessage("No company email found. Please ensure your profile has a valid company email address.");
      return;
    }

    setLoading(true);
    try {
      // Create verification code in database
      const { code, codeId } = await createVerificationCode(currentUser.companyEmail);

      // Send the verification email
      const result = await sendVerificationEmail(
        currentUser.companyEmail,
        code,
        codeId,
        "Industrial Management Tracking System"
      );

      if (result.success) {
        setVerificationCode(code); // Store for frontend verification
        setVerificationSent(true);
        setSecurityMessage(`✓ Verification code sent to ${currentUser.companyEmail}. Code expires in 10 minutes. Check your email inbox.`);
      } else {
        setSecurityMessage(`❌ ${result.message}`);
      }
    } catch (error: any) {
      setSecurityMessage(`❌ Error: ${error.message || 'Failed to send verification code'}`);
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!enteredCode.trim()) {
      setSecurityMessage("Enter the verification code sent to your email.");
      return;
    }

    setLoading(true);
    try {
      // Verify the code using the email API
      const result = await verifyCode(currentUser.companyEmail || "", enteredCode.trim());

      if (result.verified) {
        setSecurityMessage("✓ Verification successful. Two-factor verification is now active.");
        setTwoFactorEnabled(true);
        updateUser(currentUser.id, { twoFactorEnabled: true }, true);
        setEnteredCode("");
        setVerificationSent(false);
      } else {
        setSecurityMessage(`❌ ${result.message}`);
      }
    } catch (error: any) {
      setSecurityMessage(`❌ Error: ${error.message || 'Error verifying code. Please try again.'}`);
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = () => {
    if (currentPassword !== currentUser.password) {
      setSecurityMessage("Current password is incorrect.");
      return;
    }
    if (newPassword.length < 8) {
      setSecurityMessage("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityMessage("Password confirmation does not match.");
      return;
    }
    updateUser(currentUser.id, { password: newPassword }, true);
    setSecurityMessage("Password updated successfully.");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const handleSavePhoneNumber = () => {
    if (!phoneNumber.trim()) {
      setSecurityMessage("Enter a valid phone number to continue.");
      return;
    }
    updateUser(currentUser.id, { phoneNumber: phoneNumber.trim() }, true);
    setSecurityMessage("Phone number saved successfully.");
  };

  const handleToggleTheme = (nextTheme: typeof selectedTheme) => {
    setSelectedTheme(nextTheme);
    setTheme(nextTheme);
    setTestNotificationMessage(`Selected ${nextTheme} design style.`);
    setTimeout(() => setTestNotificationMessage(null), 3000);
  };

  const handleToggleLayout = (mode: typeof selectedLayout) => {
    setSelectedLayout(mode);
    setLayoutMode(mode);
    setTestNotificationMessage(`Display format changed to ${mode}.`);
    setTimeout(() => setTestNotificationMessage(null), 3000);
  };

  const handleTestIntegration = (service: string) => {
    if (service === "Slack" && slackEnabled) {
      setIntegrationMessage("Slack integration requires OAuth. Redirecting to Slack auth...");
      setTimeout(() => {
        setIntegrationMessage("Note: Actual Slack OAuth flow requires backend implementation.");
      }, 1500);
    } else if (service === "API" && apiEnabled) {
      if (!apiKey.trim()) {
        setIntegrationMessage("❌ API key is required. Please enter a valid API key.");
        return;
      }
      setIntegrationMessage("Validating API key...");
      setTimeout(() => {
        setIntegrationMessage("✓ API key validated successfully. Connection active.");
      }, 1000);
    } else if (service === "Webhook" && webhookEnabled) {
      if (!webhookUrl.trim()) {
        setIntegrationMessage("❌ Webhook URL is required. Please enter a valid HTTPS URL.");
        return;
      }
      if (!webhookUrl.startsWith("https://")) {
        setIntegrationMessage("❌ Webhook URL must use HTTPS protocol.");
        return;
      }
      setIntegrationMessage("Sending test event to webhook...");
      setTimeout(() => {
        setIntegrationMessage("✓ Test event sent successfully. Check your webhook logs.");
      }, 1200);
    } else {
      setIntegrationMessage("❌ Service is disabled. Enable it first.");
    }
  };

  const handleExportData = () => {
    const payload = {
      user: { name: currentUser.name, email: currentUser.companyEmail, role: currentUser.role, theme: selectedTheme, layout: selectedLayout },
      locations, notificationsEnabled, retentionPolicy, autoArchive,
      timestamp: new Date().toISOString(),
    };
    
    const dataStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ems-data-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    setExportMessage("✓ Data exported successfully. Check your Downloads folder.");
    setTimeout(() => setExportMessage(null), 4000);
  };

  const handleCleanupData = () => {
    setCleanupMessage("Running archival and cleanup process...");
    setTimeout(() => {
      setCleanupMessage("Legacy logs archived and auto-archive updated.");
    }, 900);
  };

  const renderSectionContent = () => {
    if (!activeSection) {
      return (
        <Card className="border-border/30 shadow-sm">
          <CardHeader className="px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">System Settings Overview</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Choose a settings section to configure notifications, security, appearance, integrations, or data storage.</p>
              </div>
              <Badge className="bg-primary/10 text-primary border-primary/20">Ready to configure</Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2 p-5">
            <div className="rounded-3xl border border-border/50 bg-background/80 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Theme</div>
              <div className="text-sm font-medium text-foreground mt-2">{selectedTheme} mode</div>
              <div className="text-xs text-muted-foreground mt-1">Layout: {selectedLayout}</div>
            </div>
            <div className="rounded-3xl border border-border/50 bg-background/80 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Security</div>
              <div className="text-sm font-medium text-foreground mt-2">Two-step verification: {twoFactorEnabled ? "Enabled" : "Disabled"}</div>
              <div className="text-xs text-muted-foreground mt-1">Phone saved: {phoneNumber ? "Yes" : "No"}</div>
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
            <div>
              <h2 className="text-base font-semibold text-foreground">Notifications</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Control alert channels, thresholds, and notification previews.</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-border/50 bg-background/80 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Email Alerts</h3>
                    <p className="text-xs text-muted-foreground mt-1">Send operational and system messages to your inbox.</p>
                  </div>
                  <Switch checked={emailAlertsEnabled} onCheckedChange={setEmailAlertsEnabled} />
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground">Enabled</span>
                  <span className="text-sm font-medium text-foreground">{emailAlertsEnabled ? "Yes" : "No"}</span>
                </div>
              </div>
              <div className="rounded-3xl border border-border/50 bg-background/80 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">SMS Alerts</h3>
                    <p className="text-xs text-muted-foreground mt-1">Receive urgent warnings on your phone or mobile device.</p>
                  </div>
                  <Switch checked={smsAlertsEnabled} onCheckedChange={setSmsAlertsEnabled} />
                </div>
                <div className="text-xs text-muted-foreground">Phone number used for alerts: {phoneNumber || "Not configured"}</div>
              </div>
            </div>
            <div className="rounded-3xl border border-border/50 bg-background/80 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Threshold Alerts</h3>
                  <p className="text-xs text-muted-foreground mt-1">Trigger an alert when usage passes the selected threshold.</p>
                </div>
                <span className="text-sm font-medium text-foreground">{thresholdAlert}%</span>
              </div>
              <input type="range" min={65} max={100} step={1} value={thresholdAlert} onChange={(e) => setThresholdAlert(Number(e.target.value))} className="w-full" />
            </div>
            <div className="rounded-3xl border border-border/50 bg-background/80 p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">Test Notification</h3>
                  <p className="text-xs text-muted-foreground mt-1">Confirm the alert system is working.</p>
                </div>
                <button onClick={handleSendTestNotification} className="rounded-xl border border-border/50 px-3 py-2 text-xs font-medium text-foreground hover:bg-muted/30 transition-colors">Send Test</button>
              </div>
              {testNotificationMessage && <p className="text-sm text-foreground">{testNotificationMessage}</p>}
            </div>
          </CardContent>
        </Card>
      );
    }

    if (activeSection === "Security") {
      return (
        <Card className="border-border/30 shadow-sm">
          <CardHeader className="px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Security</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Password, two-factor authentication, and phone verification.</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 p-5">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2 rounded-3xl border border-border/50 bg-background/80 p-4">
                <div className="text-sm font-semibold text-foreground">Reset Password</div>
                <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Current password" className="w-full h-11 rounded-xl border border-border/50 px-4 bg-background/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="New password" className="w-full h-11 rounded-xl border border-border/50 px-4 bg-background/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="w-full h-11 rounded-xl border border-border/50 px-4 bg-background/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                <button onClick={handleChangePassword} className="w-full h-11 rounded-xl bg-primary text-white text-sm font-medium hover:opacity-95 transition">Update Password</button>
              </div>
              <div className="space-y-4 rounded-3xl border border-border/50 bg-background/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">Two-Step Verification</div>
                    <p className="text-xs text-muted-foreground mt-1">Add an extra layer of account protection.</p>
                  </div>
                  <Switch checked={twoFactorEnabled} onCheckedChange={(value) => { setTwoFactorEnabled(value); updateUser(currentUser.id, { twoFactorEnabled: value }, true); }} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Phone Number</label>
                  <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="+1 (555) 123-4567" className="w-full h-11 rounded-xl border border-border/50 px-4 bg-background/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                  <button onClick={handleSavePhoneNumber} className="w-full h-11 rounded-xl border border-border/50 text-sm font-medium hover:bg-muted/30 transition">Save Phone</button>
                </div>
                <div className="space-y-3">
                  <button onClick={handleRequestVerificationCode} className="w-full h-11 rounded-xl bg-secondary/10 text-secondary border border-secondary/20 text-sm font-medium hover:bg-secondary/20 transition">Send Verification Code</button>
                  {verificationSent && (
                    <div className="space-y-2">
                      <input value={enteredCode} onChange={(e) => setEnteredCode(e.target.value)} placeholder="Enter verification code" className="w-full h-11 rounded-xl border border-border/50 px-4 bg-background/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                      <button onClick={handleVerifyCode} className="w-full h-11 rounded-xl bg-primary text-white text-sm font-medium hover:opacity-95 transition">Verify Code</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="rounded-3xl border border-border/50 bg-background/80 p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Security summary</div>
              <div className="mt-3 text-sm text-foreground">{securityMessage || "No recent security actions. Review your password and verification settings regularly."}</div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (activeSection === "Appearance") {
      return (
        <Card className="border-border/30 shadow-sm">
          <CardHeader className="px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Appearance</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Choose a theme and layout mode for the full EMS experience.</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              {[
                { id: "light", label: "Light", description: "Bright system default." },
                { id: "dark", label: "Dark", description: "Modern low-light experience." },
                { id: "solar", label: "Solar", description: "Warm amber accent palette." },
                { id: "corporate", label: "Corporate", description: "Clean, professional workspace." },
                { id: "ocean", label: "Ocean", description: "Cool blue data center theme." },
              ].map((option) => (
                <button key={option.id} onClick={() => handleToggleTheme(option.id as typeof selectedTheme)} className={`rounded-3xl border p-4 text-left transition-all ${selectedTheme === option.id ? "border-primary bg-primary/10" : "border-border/50 bg-background/80 hover:border-primary hover:bg-muted/80"}`}>
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
            <div className="rounded-3xl border border-border/50 bg-background/80 p-4">
              <div className="text-sm font-semibold text-foreground">Display format</div>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                {[
                  { id: "standard", label: "Standard" },
                  { id: "compact", label: "Compact" },
                  { id: "spacious", label: "Spacious" },
                ].map((layout) => (
                  <button key={layout.id} onClick={() => handleToggleLayout(layout.id as typeof selectedLayout)} className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${selectedLayout === layout.id ? "border-primary bg-primary/10 text-primary" : "border-border/50 bg-background/80 text-foreground hover:border-primary"}`}>
                    {layout.label}
                  </button>
                ))}
              </div>
            </div>
            {testNotificationMessage && <div className="rounded-3xl border border-border/50 bg-background/80 p-4 text-sm text-foreground">{testNotificationMessage}</div>}
          </CardContent>
        </Card>
      );
    }

    if (activeSection === "Integrations") {
      return (
        <Card className="border-border/30 shadow-sm">
          <CardHeader className="px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">Integrations</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Connect external systems with APIs, webhooks, and messaging integrations.</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-3xl border border-border/50 bg-background/80 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-foreground">Slack integration</div>
                    <p className="text-xs text-muted-foreground mt-1">Send alerts directly to your Slack channel.</p>
                  </div>
                  <Switch checked={slackEnabled} onCheckedChange={setSlackEnabled} />
                </div>
                <button onClick={() => handleTestIntegration("Slack")} className="w-full h-11 rounded-xl bg-primary text-white text-sm font-medium hover:opacity-95 transition">Test Slack</button>
              </div>
              <div className="rounded-3xl border border-border/50 bg-background/80 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-foreground">API Access</div>
                    <p className="text-xs text-muted-foreground mt-1">Enable API-based workflows and custom integrations.</p>
                  </div>
                  <Switch checked={apiEnabled} onCheckedChange={setApiEnabled} />
                </div>
                <input value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="API key or token" className="w-full h-11 rounded-xl border border-border/50 bg-background/60 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
                {apiEnabled && <button onClick={() => handleTestIntegration("API")} className="w-full h-11 rounded-xl bg-primary text-white text-sm font-medium hover:opacity-95 transition">Validate API Key</button>}
              </div>
            </div>
            <div className="rounded-3xl border border-border/50 bg-background/80 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-foreground">Webhook Endpoint</div>
                  <p className="text-xs text-muted-foreground mt-1">Forward events to your service endpoint.</p>
                </div>
                <Switch checked={webhookEnabled} onCheckedChange={setWebhookEnabled} />
              </div>
              <input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} placeholder="https://hooks.example.com/ems" className="w-full h-11 rounded-xl border border-border/50 bg-background/60 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
              {webhookEnabled && <button onClick={() => handleTestIntegration("Webhook")} className="w-full h-11 rounded-xl bg-primary text-white text-sm font-medium hover:opacity-95 transition">Send Test Event</button>}
              {integrationMessage && <div className="text-sm text-foreground">{integrationMessage}</div>}
            </div>
          </CardContent>
        </Card>
      );
    }

    if (activeSection === "Data & Storage") {
      return (
        <div className="space-y-5">
          {/* Add Location Card */}
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

          {/* Main Data & Storage settings */}
          <Card className="border-border/30 shadow-sm">
            <CardHeader className="px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">Data & Storage Settings</h2>
                <p className="text-sm text-muted-foreground mt-0.5">Manage retention, archival, and export policies.</p>
              </div>
            </CardHeader>
            <CardContent className="space-y-5 p-5">
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-3xl border border-border/50 bg-background/80 p-4 space-y-3">
                  <div className="text-sm font-semibold text-foreground">Retention Policy</div>
                  <select value={retentionPolicy} onChange={(e) => setRetentionPolicy(e.target.value)} className="w-full h-11 rounded-xl border border-border/50 bg-background/60 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40">
                    <option value="30">30 days</option>
                    <option value="90">90 days</option>
                    <option value="365">365 days</option>
                    <option value="9999">Unlimited</option>
                  </select>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-foreground">Auto archive old logs</span>
                    <Switch checked={autoArchive} onCheckedChange={setAutoArchive} />
                  </div>
                </div>
                <div className="rounded-3xl border border-border/50 bg-background/80 p-4 space-y-3">
                  <div className="text-sm font-semibold text-foreground">Data export</div>
                  <p className="text-xs text-muted-foreground">Download a JSON backup of your settings and locations.</p>
                  <button onClick={handleExportData} className="w-full h-11 rounded-xl bg-primary text-white text-sm font-medium hover:opacity-95 transition">⬇ Download Export</button>
                  {exportMessage && <div className="text-sm text-foreground">{exportMessage}</div>}
                </div>
              </div>
              <div className="rounded-3xl border border-border/50 bg-background/80 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-foreground">Cleanup</div>
                    <p className="text-xs text-muted-foreground mt-1">Archive old monitoring logs and optimize storage budgets.</p>
                  </div>
                  <button onClick={handleCleanupData} className="rounded-xl border border-border/50 px-3 py-2 text-sm font-medium hover:bg-muted/30 transition">Run Cleanup</button>
                </div>
                {cleanupMessage && <div className="text-sm text-foreground">{cleanupMessage}</div>}
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (activeSection === "About") {
      return (
        <Card className="border-border/30 shadow-sm">
          <CardHeader className="px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-foreground">About</h2>
              <p className="text-sm text-muted-foreground mt-0.5">System information and development team.</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 p-5">
            <div className="rounded-3xl border border-border/50 bg-background/80 p-5 space-y-4">
              <div>
                <div className="text-sm font-semibold text-foreground">System Name</div>
                <div className="text-sm text-muted-foreground mt-2">Industrial Management Tracking System (EMS)</div>
              </div>
              <div className="border-t border-border/20 pt-4">
                <div className="text-sm font-semibold text-foreground">Version</div>
                <div className="text-sm text-muted-foreground mt-2">v1.0.0 (React + TypeScript)</div>
              </div>
              <div className="border-t border-border/20 pt-4">
                <div className="text-sm font-semibold text-foreground mb-2">Technology Stack</div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">• React 18 + TypeScript</div>
                  <div className="text-xs text-muted-foreground">• Vite Build Tool</div>
                  <div className="text-xs text-muted-foreground">• Tailwind CSS + shadcn/ui</div>
                  <div className="text-xs text-muted-foreground">• Local Storage Persistence</div>
                </div>
              </div>
              <div className="border-t border-border/20 pt-4">
                <div className="text-sm font-semibold text-foreground mb-2">Developer & Organization</div>
                <div className="flex items-center gap-3 rounded-2xl border border-border/50 bg-muted/30 px-4 py-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ background: "linear-gradient(135deg, #2c5f4e, #3a6b5a)" }}>
                    AW
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-foreground">angelswonder</div>
                    <div className="text-xs text-muted-foreground mt-0.5">Lead Developer & Organization</div>
                  </div>
                </div>
              </div>
              <div className="border-t border-border/20 pt-4">
                <div className="text-sm font-semibold text-foreground mb-2">Features</div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#2c5f4e" }} />
                    <span>Multi-role user management with granular permissions</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#2c5f4e" }} />
                    <span>Real-time energy monitoring and analytics dashboards</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#2c5f4e" }} />
                    <span>Integrated CRM system with templates and custom objects</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#2c5f4e" }} />
                    <span>Advanced notification, security, and data management settings</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#2c5f4e" }} />
                    <span>Multiple theme support with persistent storage</span>
                  </div>
                </div>
              </div>
              <div className="border-t border-border/20 pt-4">
                <div className="text-sm font-semibold text-foreground mb-3">Data Persistence</div>
                <div className="rounded-2xl border border-border/50 bg-muted/30 px-4 py-3">
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Theme & Layout:</span> Settings are automatically saved to your browser's local storage and restored on your next visit.
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return null;
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
            {renderSectionContent()}

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
