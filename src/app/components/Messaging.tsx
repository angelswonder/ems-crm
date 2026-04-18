import { useState, useEffect, useRef } from "react";
import { useApp, ROLE_LABELS } from "../contexts/AppContext";
import { MessageSquare, Send, Users, Hash } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function formatDateLabel(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString();
}

const ROLE_COLORS: Record<string, string> = {
  admin: "from-emerald-600 to-teal-700",
  manager: "from-blue-600 to-indigo-700",
  "team-leader": "from-violet-600 to-purple-700",
  supervisor: "from-amber-600 to-orange-700",
  system: "from-gray-500 to-gray-600",
};

export function Messaging() {
  const { currentUser, users, messages, sendMessage } = useApp();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    setInput("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const teamMembers = users.filter((u) => u.permissions.includes("messaging"));

  let lastDate = "";

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f8faf9" }}>
      <div className="p-6 pb-0 flex-1 flex flex-col min-h-0" style={{ maxHeight: "100vh" }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-5 flex-shrink-0">
          <div>
            <h1 className="text-2xl font-semibold text-foreground flex items-center gap-2">
              <MessageSquare className="w-6 h-6 text-primary" />
              Team Chat
            </h1>
            <p className="text-muted-foreground mt-0.5">
              Real-time communication across your EMS team
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white rounded-xl px-3 py-2 shadow-sm border border-border/30">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{teamMembers.length} online</span>
            </div>
          </div>
        </div>

        <div className="flex gap-4 flex-1 min-h-0 pb-6">
          {/* Chat panel */}
          <Card className="flex-1 flex flex-col border-border/30 shadow-sm overflow-hidden min-h-0">
            {/* Channel bar */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/20 bg-card/60 flex-shrink-0">
              <Hash className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">general</span>
              <Badge className="ml-auto bg-primary/10 text-primary border-primary/20 text-xs">
                {messages.filter((m) => m.senderId !== "system").length} messages
              </Badge>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1 min-h-0">
              {messages.map((msg) => {
                const isMe = msg.senderId === currentUser?.id;
                const isSystem = msg.senderId === "system";
                const dateLabel = formatDateLabel(msg.timestamp);
                const showDateDivider = dateLabel !== lastDate;
                lastDate = dateLabel;
                const senderUser = users.find((u) => u.id === msg.senderId);
                const colorClass = ROLE_COLORS[senderUser?.role ?? "system"] ?? ROLE_COLORS.system;

                return (
                  <div key={msg.id}>
                    {showDateDivider && (
                      <div className="flex items-center gap-3 my-5">
                        <div className="flex-1 h-px bg-border/30" />
                        <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full whitespace-nowrap">
                          {dateLabel}
                        </span>
                        <div className="flex-1 h-px bg-border/30" />
                      </div>
                    )}

                    {isSystem ? (
                      <div className="flex justify-center my-3">
                        <div className="bg-muted/50 text-muted-foreground text-xs px-4 py-2 rounded-full border border-border/20">
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <div className={`flex items-end gap-2.5 py-1 ${isMe ? "flex-row-reverse" : ""}`}>
                        {/* Avatar */}
                        <div
                          className={`w-8 h-8 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center flex-shrink-0 shadow-sm`}
                        >
                          <span className="text-white text-xs font-semibold">{msg.senderInitials}</span>
                        </div>

                        <div className={`flex flex-col gap-0.5 max-w-[65%] ${isMe ? "items-end" : "items-start"}`}>
                          {!isMe && (
                            <div className="flex items-center gap-1.5 ml-1">
                              <span className="text-xs font-medium text-foreground">{msg.senderName}</span>
                              {senderUser && (
                                <span className="text-[10px] text-muted-foreground">
                                  {ROLE_LABELS[senderUser.role]}
                                </span>
                              )}
                            </div>
                          )}
                          <div
                            className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                              isMe
                                ? "text-white rounded-br-sm"
                                : "bg-white border border-border/30 text-foreground rounded-bl-sm shadow-sm"
                            }`}
                            style={isMe ? { background: "linear-gradient(135deg, #2c5f4e, #3a6b5a)" } : {}}
                          >
                            {msg.content}
                          </div>
                          <span className="text-[10px] text-muted-foreground px-1">
                            {formatTime(msg.timestamp)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border/20 bg-card/50 flex-shrink-0">
              <div className="flex gap-2 items-center">
                <div
                  className="w-8 h-8 rounded-full bg-gradient-to-br flex items-center justify-center flex-shrink-0 text-white text-xs font-semibold"
                  style={{ background: "linear-gradient(135deg, #2c5f4e, #3a6b5a)" }}
                >
                  {currentUser?.initials}
                </div>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message as ${currentUser?.name}… (Enter to send)`}
                  className="flex-1 h-10 px-4 rounded-xl border border-border/50 bg-background/80 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="w-10 h-10 rounded-xl text-white flex items-center justify-center hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #2c5f4e, #3a6b5a)" }}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </Card>

          {/* Members sidebar */}
          <Card className="w-52 border-border/30 shadow-sm flex-shrink-0 hidden lg:flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-border/20 bg-card/60 flex-shrink-0">
              <span className="text-sm font-medium text-foreground">Members ({teamMembers.length})</span>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {teamMembers.map((u) => (
                <div key={u.id} className="flex items-center gap-2.5 px-2 py-2.5 rounded-xl hover:bg-muted/40 transition-colors">
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${ROLE_COLORS[u.role] ?? ROLE_COLORS.system} flex items-center justify-center flex-shrink-0 shadow-sm relative`}>
                    <span className="text-white text-xs font-semibold">{u.initials}</span>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground truncate">
                      {u.name}
                      {u.id === currentUser?.id && (
                        <span className="ml-1 text-[10px] text-muted-foreground">(you)</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">{ROLE_LABELS[u.role]}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
