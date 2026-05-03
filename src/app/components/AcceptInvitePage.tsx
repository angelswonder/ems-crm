import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useApp } from "../contexts/AppContext";
import { getSupabaseClient, isSupabaseConfigured } from "../lib/supabaseClient";
import { Button } from "./ui/button";
import { AlertCircle, CheckCircle2, Loader2, Mail, LogIn, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const supabase = isSupabaseConfigured ? getSupabaseClient() : null;

interface InviteDetails {
  id: string;
  org_id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
  org_name?: string;
}

export const AcceptInvitePage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useApp();
  const token = searchParams.get("token");

  const [invite, setInvite] = useState<InviteDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("No invitation token provided.");
      setLoading(false);
      return;
    }

    const fetchInvite = async () => {
      setError(null);
      setLoading(true);

      if (!supabase) {
        setError("Supabase is not configured to load invitation details.");
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("accept-invite", {
          body: { action: "lookup", token },
        });

        if (error) {
          throw error;
        }

        if (!data?.invitation) {
          throw new Error("Invitation not found.");
        }

        setInvite(data.invitation as InviteDetails);
      } catch (err: any) {
        console.error("Invitation lookup error:", err);
        setError(err?.message || "Unable to load invitation. The token may be invalid or expired.");
      } finally {
        setLoading(false);
      }
    };

    fetchInvite();
  }, [token]);

  const isSignedInAsInviteEmail = Boolean(user && invite && user.email?.toLowerCase() === invite.email.toLowerCase());

  const handleAcceptInvitation = async () => {
    if (!invite || !token) return;
    if (!supabase) {
      toast.error("Supabase is unavailable.");
      return;
    }

    const sessionResult = await supabase.auth.getSession();
    const accessToken = sessionResult.data.session?.access_token;
    if (!accessToken) {
      toast.error("Please log in with the invited email to accept this invitation.");
      return;
    }

    setAccepting(true);
    try {
      const { data, error } = await supabase.functions.invoke("accept-invite", {
        body: { action: "accept", token, access_token: accessToken },
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        setAccepted(true);
        toast.success("Invitation accepted. Redirecting to your workspace...");
        setTimeout(() => {
          navigate("/app");
        }, 1800);
      } else {
        throw new Error(data?.message || "Unable to accept invitation.");
      }
    } catch (err: any) {
      console.error("Accept invitation error:", err);
      toast.error(err?.message || "Unable to accept invitation.");
    } finally {
      setAccepting(false);
    }
  };

  const handleGoHome = () => navigate("/");
  const handleSignIn = () => navigate("/auth/individual-login");

  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-900"}`}>
      <div className="max-w-3xl mx-auto px-4 py-12">
        <div className="mb-8 flex items-center gap-3">
          <Button variant="ghost" onClick={handleGoHome} className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Home
          </Button>
        </div>

        <div className="rounded-3xl border border-border/50 bg-background/80 p-8 shadow-xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-3xl bg-primary/10 flex items-center justify-center text-primary">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold">Accept Your Invitation</h1>
              <p className="text-sm text-muted-foreground mt-1">Join the organization using the email address that received this invitation.</p>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-sm text-muted-foreground">Checking the invite token...</p>
            </div>
          ) : error ? (
            <div className="space-y-4">
              <div className="rounded-3xl border border-destructive/20 bg-destructive/10 p-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                  <span className="font-semibold text-destructive">Invitation error</span>
                </div>
                <p className="text-sm text-destructive/80 mt-3">{error}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button onClick={handleGoHome}>Back to home</Button>
                <Button variant="secondary" onClick={handleSignIn}>Sign in / Sign up</Button>
              </div>
            </div>
          ) : invite ? (
            <div className="space-y-6">
              <div className="rounded-3xl border border-border/50 bg-background/80 p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Invitation details</p>
                    <h2 className="text-xl font-semibold text-foreground mt-2">{invite.org_name || "Your Organization"}</h2>
                  </div>
                  <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                    {invite.role}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-900/70 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Invited email</p>
                    <p className="mt-2 text-sm font-medium">{invite.email}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-900/70 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Expires</p>
                    <p className="mt-2 text-sm font-medium">{new Date(invite.expires_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {accepted ? (
                <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-6">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    <div>
                      <p className="font-semibold text-foreground">Invitation accepted</p>
                      <p className="text-sm text-muted-foreground mt-1">You will be redirected to your workspace shortly.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {isSignedInAsInviteEmail ? (
                    <div className="rounded-3xl border border-primary/20 bg-primary/5 p-6">
                      <p className="text-sm text-foreground">You are signed in as the invited email. Click below to accept the invitation and join the organization.</p>
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-yellow-300/20 bg-yellow-300/10 p-6">
                      <p className="text-sm text-foreground">To accept this invitation, sign in with the invited email address.</p>
                      {user ? (
                        <p className="text-xs text-muted-foreground mt-2">Signed in as <strong>{user.email}</strong>. Use the invited address <strong>{invite.email}</strong>.</p>
                      ) : (
                        <p className="text-xs text-muted-foreground mt-2">If you do not have an account yet, choose Sign up and then return to this page.</p>
                      )}
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button
                      onClick={handleAcceptInvitation}
                      disabled={!isSignedInAsInviteEmail || invite.status !== "pending" || accepting}
                    >
                      {accepting ? <Loader2 className="animate-spin w-4 h-4" /> : "Accept Invitation"}
                    </Button>
                    <Button variant="secondary" onClick={handleSignIn}>
                      <LogIn className="w-4 h-4" />
                      Sign in / Sign up
                    </Button>
                  </div>
                </div>
              )}

              <div className="rounded-3xl border border-border/50 bg-background/80 p-6 text-sm text-muted-foreground">
                <p className="font-semibold text-foreground mb-2">How it works</p>
                <ol className="list-decimal list-inside space-y-2">
                  <li>Sign in with the email address that received this invitation.</li>
                  <li>Return to this invitation page and click Accept Invitation.</li>
                  <li>You will gain access to the organization workspace.</li>
                </ol>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
