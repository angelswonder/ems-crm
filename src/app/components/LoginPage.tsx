import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Zap, Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";

export function LoginPage() {
  const { signInWithPassword } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithPassword(username.trim(), password);
    } catch (error: any) {
      setError(error.message || "Invalid email or password. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "linear-gradient(135deg, #0f2a20 0%, #1e4d3d 35%, #2c5f4e 65%, #1a3a2f 100%)" }}
    >
      {/* Decorative blobs */}
      {[
        { top: "-120px", right: "-120px", size: "500px", opacity: 0.08 },
        { bottom: "-100px", left: "-100px", size: "420px", opacity: 0.10 },
        { top: "40%", right: "15%", size: "200px", opacity: 0.05 },
      ].map((b, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: b.size,
            height: b.size,
            borderRadius: "50%",
            background: `rgba(123, 220, 147, ${b.opacity})`,
            filter: "blur(50px)",
            top: b.top,
            right: b.right,
            bottom: b.bottom,
            left: b.left,
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Grid lines decoration */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(123,220,147,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(123,220,147,0.04) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          pointerEvents: "none",
        }}
      />

      <div className="w-full max-w-md mx-4 relative z-10">
        {/* Card */}
        <div
          className="bg-white rounded-3xl shadow-2xl overflow-hidden"
          style={{ boxShadow: "0 25px 80px rgba(0,0,0,0.35)" }}
        >
          {/* Card header */}
          <div
            className="px-8 py-8 text-center relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #2c5f4e 0%, #1e4d3d 60%, #0f2a20 100%)" }}
          >
            {/* Inner glow */}
            <div
              style={{
                position: "absolute",
                top: "-30px",
                left: "50%",
                transform: "translateX(-50%)",
                width: "200px",
                height: "120px",
                background: "radial-gradient(ellipse, rgba(123,220,147,0.18) 0%, transparent 70%)",
                pointerEvents: "none",
              }}
            />
            <div className="w-16 h-16 mx-auto mb-4 bg-white/10 rounded-2xl flex items-center justify-center relative">
              <Zap className="w-8 h-8" style={{ color: "#7bdc93" }} />
              <div
                className="absolute inset-0 rounded-2xl"
                style={{ boxShadow: "0 0 20px rgba(123,220,147,0.3)", border: "1px solid rgba(123,220,147,0.2)" }}
              />
            </div>
            <h1 className="text-white text-2xl font-bold tracking-tight">EMS Control</h1>
            <p className="mt-1" style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px" }}>
              Energy Management System
            </p>
            <div
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs"
              style={{ background: "rgba(123,220,147,0.15)", color: "#7bdc93", border: "1px solid rgba(123,220,147,0.25)" }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: "#7bdc93" }}
              />
              System Online
            </div>
          </div>

          {/* Form */}
          <div className="px-8 py-7">
            <h2 className="text-foreground text-xl font-semibold">Sign In</h2>
            <p className="text-muted-foreground text-sm mt-0.5 mb-6">
              Enter your credentials to access the EMS dashboard
            </p>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 text-red-600 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    type="email"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="you@energymanagement.com"
                    required
                    className="w-full h-11 pl-10 pr-4 rounded-xl border border-border/50 bg-background/60 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40 transition-all"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full h-11 pl-10 pr-11 rounded-xl border border-border/50 bg-background/60 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#22c55e]/40 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl font-medium text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-60 mt-2"
                style={{ background: "linear-gradient(135deg, #2c5f4e, #3a6b5a)", boxShadow: "0 4px 14px rgba(44,95,78,0.4)" }}
              >
                {loading && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>

            <div className="mt-5 text-sm text-muted-foreground">
              Access is restricted to authorized EMS users only. Please contact your administrator if you need a new account.
            </div>
          </div>
        </div>

        <p className="text-center mt-4 text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
          © 2026 EMS Control · Energy Management System
        </p>
      </div>
    </div>
  );
}
