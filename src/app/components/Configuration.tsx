import { useState } from "react";
import {
  useApp,
  User,
  UserRole,
  SectionId,
  ROLE_LABELS,
  ALL_SECTIONS,
  mkInitials,
} from "../contexts/AppContext";
import { useAuth } from "../contexts/AuthContext";
import { InviteMember } from "./team/InviteMember";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Settings2,
  Users,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Eye,
  EyeOff,
  ChevronDown,
  Check,
  Shield,
  UserPlus,
  Lock,
  Mail,
} from "lucide-react";

const ROLE_OPTIONS: { value: UserRole; label: string; color: string }[] = [
  { value: "manager",     label: "Manager",          color: "bg-blue-100 text-blue-700 border-blue-200" },
  { value: "team-leader", label: "Team Leader",       color: "bg-violet-100 text-violet-700 border-violet-200" },
  { value: "supervisor",  label: "Project Supervisor",color: "bg-amber-100 text-amber-700 border-amber-200" },
];

const ROLE_GRADIENT: Record<string, string> = {
  admin:        "from-emerald-600 to-teal-700",
  manager:      "from-blue-600 to-indigo-700",
  "team-leader":"from-violet-600 to-purple-700",
  supervisor:   "from-amber-600 to-orange-700",
};

function RoleBadge({ role }: { role: UserRole }) {
  const colors: Record<UserRole, string> = {
    admin:        "bg-emerald-50 text-emerald-700 border-emerald-200",
    manager:      "bg-blue-50 text-blue-700 border-blue-200",
    "team-leader":"bg-violet-50 text-violet-700 border-violet-200",
    supervisor:   "bg-amber-50 text-amber-700 border-amber-200",
  };
  return (
    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${colors[role]}`}>
      {ROLE_LABELS[role]}
    </span>
  );
}

/* ─── Edit User Modal ─────────────────────────────────────────────── */
function EditUserModal({
  user,
  onClose,
  onSave,
}: {
  user: User;
  onClose: () => void;
  onSave: (userId: string, updates: Partial<User>, oldUser: User) => void;
}) {
  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [companyEmail, setCompanyEmail] = useState(user.companyEmail);
  const [password, setPassword] = useState(user.password);
  const [showPw, setShowPw] = useState(false);
  const [permissions, setPermissions] = useState<SectionId[]>([...user.permissions]);

  const isAdmin = user.role === "admin";

  const togglePerm = (id: SectionId) => {
    if (isAdmin) return;
    setPermissions((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  };

  const handleSave = () => {
    onSave(user.id, { name, username, companyEmail, password, permissions, initials: mkInitials(name) }, user);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-border/30 mx-4 max-h-[90vh] flex flex-col">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/20 bg-card/80 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${ROLE_GRADIENT[user.role]} flex items-center justify-center`}>
              <span className="text-white text-sm font-bold">{mkInitials(name)}</span>
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-base">Edit User</h3>
              <p className="text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Full Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 px-4 rounded-xl border border-border/50 bg-background/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>

          {/* Login email */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Login Email (Username)</label>
            <input
              type="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full h-10 px-4 rounded-xl border border-border/50 bg-background/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>

          {/* Company email */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Company Email</label>
            <input
              type="email"
              value={companyEmail}
              onChange={(e) => setCompanyEmail(e.target.value)}
              className="w-full h-10 px-4 rounded-xl border border-border/50 bg-background/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-muted-foreground" />
              Password
            </label>
            <div className="relative">
              <input
                type={showPw ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 pl-4 pr-11 rounded-xl border border-border/50 bg-background/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Permissions */}
          {!isAdmin && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                Section Permissions
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_SECTIONS.filter((s) => s.id !== "configuration").map((sec) => {
                  const active = permissions.includes(sec.id);
                  return (
                    <button
                      key={sec.id}
                      onClick={() => togglePerm(sec.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all ${
                        active
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "bg-background/60 border-border/40 text-muted-foreground hover:border-border"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border ${active ? "bg-primary border-primary" : "border-border/60"}`}>
                        {active && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      {sec.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">Configuration is exclusively for System Administrators.</p>
            </div>
          )}
          {isAdmin && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700">
              System Administrators have full access to all sections and permissions cannot be restricted.
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border/20 flex justify-end gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-border/50 text-sm text-muted-foreground hover:bg-muted/40 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-white text-sm font-medium flex items-center gap-1.5 hover:opacity-90 active:scale-[0.98] transition-all"
            style={{ background: "linear-gradient(135deg, #2c5f4e, #3a6b5a)" }}
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Add User Modal ──────────────────────────────────────────────── */
function AddUserModal({ onClose }: { onClose: () => void }) {
  const { addUser } = useApp();
  const [form, setForm] = useState({
    name: "",
    username: "",
    companyEmail: "",
    password: "",
    role: "manager" as UserRole,
    permissions: ["dashboard", "settings", "messaging"] as SectionId[],
  });
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Required";
    if (!form.username.trim()) e.username = "Required";
    if (!form.password.trim()) e.password = "Required";
    return e;
  };

  const togglePerm = (id: SectionId) => {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.includes(id)
        ? f.permissions.filter((x) => x !== id)
        : [...f.permissions, id],
    }));
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    addUser({
      name: form.name.trim(),
      username: form.username.trim(),
      companyEmail: form.companyEmail.trim() || form.username.trim(),
      password: form.password.trim(),
      role: form.role,
      permissions: form.permissions,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-card w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-border/30 mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/20 bg-card/80">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-foreground">Add New User</h3>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <label className="text-sm font-medium text-foreground">Full Name *</label>
              <input
                value={form.name}
                onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); setErrors((x) => ({ ...x, name: "" })); }}
                placeholder="e.g. John Doe"
                className={`w-full h-10 px-4 rounded-xl border bg-background/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 ${errors.name ? "border-destructive/60" : "border-border/50"}`}
              />
              {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
            </div>

            <div className="col-span-2 space-y-1.5">
              <label className="text-sm font-medium text-foreground">Login Email *</label>
              <input
                type="email"
                value={form.username}
                onChange={(e) => { setForm((f) => ({ ...f, username: e.target.value })); setErrors((x) => ({ ...x, username: "" })); }}
                placeholder="user@energymanagement.com"
                className={`w-full h-10 px-4 rounded-xl border bg-background/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 ${errors.username ? "border-destructive/60" : "border-border/50"}`}
              />
              {errors.username && <p className="text-xs text-destructive">{errors.username}</p>}
            </div>

            <div className="col-span-2 space-y-1.5">
              <label className="text-sm font-medium text-foreground">Password *</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => { setForm((f) => ({ ...f, password: e.target.value })); setErrors((x) => ({ ...x, password: "" })); }}
                  placeholder="••••••••"
                  className={`w-full h-10 pl-4 pr-11 rounded-xl border bg-background/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 ${errors.password ? "border-destructive/60" : "border-border/50"}`}
                />
                <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            <div className="col-span-2 space-y-1.5">
              <label className="text-sm font-medium text-foreground">Role</label>
              <div className="flex gap-2 flex-wrap">
                {ROLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setForm((f) => ({ ...f, role: opt.value }))}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                      form.role === opt.value ? opt.color + " shadow-sm" : "border-border/40 text-muted-foreground hover:border-border"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="col-span-2 space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-muted-foreground" />
                Permissions
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {ALL_SECTIONS.filter((s) => s.id !== "configuration").map((sec) => {
                  const active = form.permissions.includes(sec.id);
                  return (
                    <button
                      key={sec.id}
                      onClick={() => togglePerm(sec.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all ${
                        active ? "bg-primary/10 border-primary/30 text-primary" : "bg-background/60 border-border/40 text-muted-foreground hover:border-border"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border ${active ? "bg-primary border-primary" : "border-border/60"}`}>
                        {active && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      {sec.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border/20 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-border/50 text-sm text-muted-foreground hover:bg-muted/40 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-5 py-2 rounded-xl text-white text-sm font-medium flex items-center gap-1.5 hover:opacity-90 active:scale-[0.98] transition-all"
            style={{ background: "linear-gradient(135deg, #2c5f4e, #3a6b5a)" }}
          >
            <UserPlus className="w-4 h-4" />
            Create User
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Configuration page ─────────────────────────────────────── */
export function Configuration() {
  const { users, updateUser, removeUser, addNotification } = useApp();
  const { profile } = useAuth();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInvitePanel, setShowInvitePanel] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const canInvite = profile && ['owner', 'admin'].includes(profile.role);

  const handleSave = (userId: string, updates: Partial<User>, oldUser: User) => {
    updateUser(userId, updates, false);
    if (updates.name && updates.name !== oldUser.name) {
      addNotification({
        type: "profile-change",
        subject: `Profile Updated by Admin — ${updates.name}`,
        body: `System Administrator updated user profile.\n\nUser: ${oldUser.name} → ${updates.name}\nLogin: ${updates.username ?? oldUser.username}\nPassword: ${updates.password ?? oldUser.password}\nPermissions: ${updates.permissions ? updates.permissions.map((p) => ALL_SECTIONS.find((s) => s.id === p)?.label ?? p).join(", ") : "unchanged"}`,
        fromUser: "admin",
      });
    }
    setSaved(userId);
    setTimeout(() => setSaved(null), 2000);
  };

  const handleDelete = (userId: string) => {
    removeUser(userId);
    setConfirmDelete(null);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8faf9" }}>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <Settings2 className="w-6 h-6 text-primary" />
              Configuration
            </h1>
            <p className="text-muted-foreground mt-0.5">Manage users, roles, and system access permissions</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-medium hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
              style={{ background: "linear-gradient(135deg, #2c5f4e, #3a6b5a)" }}
            >
              <UserPlus className="w-4 h-4" />
              Add User
            </button>
            <button
              onClick={() => setShowInvitePanel((prev) => !prev)}
              disabled={!canInvite}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border/50 text-sm font-medium text-foreground bg-background/80 hover:bg-background transition-all shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Mail className="w-4 h-4" />
              {showInvitePanel ? 'Hide Invite' : 'Invite User'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total Users",  value: users.length,                                  color: "text-primary",    bg: "bg-primary/10" },
            { label: "Admins",       value: users.filter((u) => u.role === "admin").length,  color: "text-emerald-600",bg: "bg-emerald-50" },
            { label: "Managers",     value: users.filter((u) => u.role !== "admin").length, color: "text-blue-600",   bg: "bg-blue-50" },
            { label: "Total Sections",value: 7,                                             color: "text-violet-600", bg: "bg-violet-50" },
          ].map((s) => (
            <Card key={s.label} className="border-border/30 shadow-sm bg-card/80">
              <CardContent className="p-4">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{s.label}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {showInvitePanel && (
          <div className="mt-6">
            <InviteMember />
          </div>
        )}

        {/* User table */}
        <Card className="border-border/30 shadow-sm overflow-hidden">
          <CardHeader className="px-5 py-4 border-b border-border/20 bg-card/60">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium text-foreground">User Accounts</span>
              <Badge className="ml-auto bg-muted text-muted-foreground border-border/30">{users.length} users</Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {users.map((user, i) => {
              const isExpanded = expandedUser === user.id;
              return (
                <div key={user.id} className={`border-b border-border/20 last:border-0 ${isExpanded ? "bg-muted/20" : ""}`}>
                  {/* Row */}
                  <div className="flex items-center gap-4 px-5 py-4">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${ROLE_GRADIENT[user.role]} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      <span className="text-white text-sm font-bold">{user.initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground text-sm">{user.name}</span>
                        {saved === user.id && <span className="text-xs text-green-600 flex items-center gap-1"><Check className="w-3 h-3" />Saved</span>}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{user.companyEmail}</div>
                    </div>
                    <RoleBadge role={user.role} />
                    <div className="hidden md:flex items-center gap-1 flex-wrap max-w-xs">
                      {user.permissions.slice(0, 3).map((p) => (
                        <span key={p} className="text-[10px] bg-muted/60 text-muted-foreground px-1.5 py-0.5 rounded-md border border-border/20">
                          {ALL_SECTIONS.find((s) => s.id === p)?.label}
                        </span>
                      ))}
                      {user.permissions.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{user.permissions.length - 3}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                        className="w-8 h-8 rounded-xl bg-muted/60 hover:bg-muted flex items-center justify-center transition-colors"
                      >
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                      </button>
                      <button
                        onClick={() => setEditingUser(user)}
                        className="w-8 h-8 rounded-xl bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-primary" />
                      </button>
                      {user.role !== "admin" && (
                        <button
                          onClick={() => setConfirmDelete(user.id)}
                          className="w-8 h-8 rounded-xl bg-destructive/5 hover:bg-destructive/10 flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-destructive/70 hover:text-destructive" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded permissions */}
                  {isExpanded && (
                    <div className="px-5 pb-5">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Section Access</p>
                      <div className="flex flex-wrap gap-2">
                        {ALL_SECTIONS.map((sec) => {
                          const has = user.permissions.includes(sec.id);
                          return (
                            <span
                              key={sec.id}
                              className={`text-xs px-2.5 py-1 rounded-lg border ${
                                has
                                  ? "bg-primary/10 border-primary/30 text-primary"
                                  : "bg-muted/30 border-border/20 text-muted-foreground/60 line-through"
                              }`}
                            >
                              {sec.label}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Edit modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={handleSave}
        />
      )}

      {/* Add modal */}
      {showAddModal && <AddUserModal onClose={() => setShowAddModal(false)} />}

      {/* Delete confirm */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
        >
          <div className="bg-card rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-border/30">
            <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-destructive" />
            </div>
            <h3 className="font-semibold text-foreground text-center mb-1">Remove User?</h3>
            <p className="text-sm text-muted-foreground text-center mb-5">
              This will permanently delete the user account. This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2 rounded-xl border border-border/50 text-sm text-muted-foreground hover:bg-muted/40 transition-colors">
                Cancel
              </button>
              <button onClick={() => handleDelete(confirmDelete)} className="flex-1 py-2 rounded-xl bg-destructive text-white text-sm font-medium hover:bg-destructive/90 transition-colors">
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
