import { useState } from "react";
import { useApp, ROLE_LABELS } from "../contexts/AppContext";
import { Card, CardContent, CardHeader } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Mail,
  MailOpen,
  CheckCheck,
  User,
  Bell,
  Shield,
  UserPlus,
  ChevronDown,
  Inbox,
  Filter,
} from "lucide-react";

type FilterType = "all" | "login-details" | "profile-change" | "user-created";

const TYPE_META = {
  "login-details": {
    label: "Login Credentials",
    icon: Shield,
    color: "text-blue-600",
    bg: "bg-blue-50 border-blue-200",
    dot: "bg-blue-500",
  },
  "profile-change": {
    label: "Profile Changed",
    icon: User,
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
    dot: "bg-amber-500",
  },
  "user-created": {
    label: "New User",
    icon: UserPlus,
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-200",
    dot: "bg-emerald-500",
  },
  "permission-change": {
    label: "Permissions",
    icon: Shield,
    color: "text-violet-600",
    bg: "bg-violet-50 border-violet-200",
    dot: "bg-violet-500",
  },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffH = Math.floor(diffMins / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function Reports() {
  const { notifications, markNotificationRead, markAllRead } = useApp();
  const [filter, setFilter] = useState<FilterType>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = filter === "all" ? notifications : notifications.filter((n) => n.type === filter);
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
    markNotificationRead(id);
  };

  const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
    { value: "all",             label: "All Messages" },
    { value: "login-details",   label: "Login Credentials" },
    { value: "user-created",    label: "New Users" },
    { value: "profile-change",  label: "Profile Changes" },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: "#f8faf9" }}>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <Mail className="w-6 h-6 text-primary" />
              Reports & Notifications
            </h1>
            <p className="text-muted-foreground mt-0.5">
              System mails, user credentials, and activity notifications
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-border/50 bg-white text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all shadow-sm"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Messages",   value: notifications.length,                                         icon: Inbox,     color: "text-primary",    bg: "bg-primary/10" },
            { label: "Unread",           value: unreadCount,                                                  icon: Mail,      color: "text-blue-600",   bg: "bg-blue-50" },
            { label: "Login Credentials",value: notifications.filter((n) => n.type === "login-details" || n.type === "user-created").length, icon: Shield, color: "text-emerald-600", bg: "bg-emerald-50" },
          ].map((s) => (
            <Card key={s.label} className="border-border/30 shadow-sm bg-card/80">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div>
                  <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          {FILTER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-all border ${
                filter === opt.value
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-white border-border/30 text-muted-foreground hover:text-foreground hover:border-border shadow-sm"
              }`}
            >
              {opt.label}
              {opt.value === "all" && unreadCount > 0 && (
                <span className="ml-2 w-5 h-5 bg-primary text-white text-xs rounded-full inline-flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Mail list */}
        <Card className="border-border/30 shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <Inbox className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">No messages in this category.</p>
            </div>
          ) : (
            <div>
              {filtered.map((notif, i) => {
                const meta = TYPE_META[notif.type as keyof typeof TYPE_META] ?? TYPE_META["profile-change"];
                const Icon = meta.icon;
                const isExpanded = expandedId === notif.id;

                return (
                  <div
                    key={notif.id}
                    className={`border-b border-border/20 last:border-0 transition-all ${
                      !notif.read ? "bg-blue-50/40" : ""
                    } ${isExpanded ? "bg-muted/20" : "hover:bg-muted/30"}`}
                  >
                    <button
                      onClick={() => handleExpand(notif.id)}
                      className="w-full flex items-center gap-4 px-5 py-4 text-left"
                    >
                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${meta.bg}`}>
                        {notif.read ? (
                          <MailOpen className={`w-4 h-4 ${meta.color}`} />
                        ) : (
                          <Icon className={`w-4 h-4 ${meta.color}`} />
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm truncate ${!notif.read ? "font-semibold text-foreground" : "font-medium text-foreground/80"}`}>
                            {notif.subject}
                          </span>
                          {!notif.read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${meta.bg} ${meta.color}`}>
                            {meta.label}
                          </span>
                          <span className="text-xs text-muted-foreground">{formatDate(notif.timestamp)}</span>
                          <span className="text-xs text-muted-foreground">
                            From: {notif.fromUser === "system" ? "System" : notif.fromUser}
                          </span>
                        </div>
                      </div>

                      <ChevronDown className={`w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </button>

                    {/* Expanded body */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pl-[72px]">
                        <div className="bg-white border border-border/30 rounded-xl p-4 shadow-sm">
                          <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">
                            {notif.body}
                          </pre>
                          <div className="mt-3 pt-3 border-t border-border/20 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">
                              Received: {new Date(notif.timestamp).toLocaleString()}
                            </span>
                            {notif.type === "login-details" || notif.type === "user-created" ? (
                              <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full">
                                Confidential — Do not share
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
