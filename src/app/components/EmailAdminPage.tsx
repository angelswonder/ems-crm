import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import { Shield, Mail, Users, Key, AlertCircle, CheckCircle2 } from 'lucide-react';
import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabaseClient';

const supabase = isSupabaseConfigured ? getSupabaseClient() : null;

interface AdminUser {
  id: string;
  email: string;
  role: string;
  two_factor_enabled: boolean;
  email_verified: boolean;
  created_at: string;
}

interface EmailLog {
  id: string;
  to_email: string;
  subject: string;
  status: string;
  provider: string;
  sent_at: string;
  verification_code?: string;
}

export function EmailAdminPage(): React.ReactElement {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'emails' | 'verification'>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setIsLoggedIn(!!session);
    if (session) {
      loadData();
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) throw error;

      setIsLoggedIn(true);
      loadData();
    } catch (error: any) {
      setLoginError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsLoggedIn(false);
    setUsers([]);
    setEmailLogs([]);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Load users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (usersError) throw usersError;
      setUsers(usersData || []);

      // Load email logs
      const { data: logsData, error: logsError } = await supabase
        .from('email_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(50);

      if (logsError) throw logsError;
      setEmailLogs(logsData || []);
    } catch (error: any) {
      setMessage(`Error loading data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const sendTestEmail = async () => {
    setLoading(true);
    setMessage('');

    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: 'test@example.com',
          subject: 'Test Email from Industrial EMS',
          html: '<h1>Test Email</h1><p>This is a test email from the Industrial EMS system.</p>',
        },
      });

      if (error) throw error;

      setMessage(data.message || 'Test email sent successfully');
      loadData(); // Refresh logs
    } catch (error: any) {
      setMessage(`Failed to send test email: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const cleanupExpiredCodes = async () => {
    setLoading(true);
    setMessage('');

    try {
      const { data, error } = await supabase.rpc('cleanup_expired_codes');

      if (error) throw error;

      setMessage(`Cleaned up ${data} expired verification codes`);
      loadData();
    } catch (error: any) {
      setMessage(`Failed to cleanup: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Email API Admin</h1>
            <p className="text-sm text-muted-foreground">Login to manage email system</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@industrial-ems.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                />
              </div>
              {loginError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{loginError}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Email API Administration</h1>
              <p className="text-sm text-muted-foreground">Manage users, emails, and verification codes</p>
            </div>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Logout
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <Button onClick={sendTestEmail} disabled={loading}>
            Send Test Email
          </Button>
          <Button variant="outline" onClick={cleanupExpiredCodes} disabled={loading}>
            Cleanup Expired Codes
          </Button>
          <Button variant="outline" onClick={loadData} disabled={loading}>
            Refresh Data
          </Button>
        </div>

        {/* Message */}
        {message && (
          <Alert className="mb-6">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border/50 mb-6">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-3 font-medium text-sm transition-colors ${
              activeTab === 'users'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('emails')}
            className={`px-4 py-3 font-medium text-sm transition-colors ${
              activeTab === 'emails'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Email Logs ({emailLogs.length})
          </button>
        </div>

        {/* Content */}
        {activeTab === 'users' && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-foreground">User Management</h2>
              <p className="text-sm text-muted-foreground">All registered users and their verification status</p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No users found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border/30">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-foreground">Email</th>
                        <th className="px-4 py-3 text-left font-medium text-foreground">Role</th>
                        <th className="px-4 py-3 text-left font-medium text-foreground">2FA</th>
                        <th className="px-4 py-3 text-left font-medium text-foreground">Verified</th>
                        <th className="px-4 py-3 text-left font-medium text-foreground">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-muted/30 transition">
                          <td className="px-4 py-3 text-foreground font-medium">{user.email}</td>
                          <td className="px-4 py-3 text-foreground capitalize">{user.role}</td>
                          <td className="px-4 py-3">
                            {user.two_factor_enabled ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-gray-400" />
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {user.email_verified ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500" />
                            ) : (
                              <AlertCircle className="w-4 h-4 text-red-400" />
                            )}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'emails' && (
          <Card>
            <CardHeader>
              <h2 className="text-lg font-semibold text-foreground">Email Logs</h2>
              <p className="text-sm text-muted-foreground">History of all emails sent through the system</p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading...</div>
              ) : emailLogs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No emails sent yet</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 border-b border-border/30">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium text-foreground">To</th>
                        <th className="px-4 py-3 text-left font-medium text-foreground">Subject</th>
                        <th className="px-4 py-3 text-left font-medium text-foreground">Status</th>
                        <th className="px-4 py-3 text-left font-medium text-foreground">Provider</th>
                        <th className="px-4 py-3 text-left font-medium text-foreground">Code</th>
                        <th className="px-4 py-3 text-left font-medium text-foreground">Sent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {emailLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-muted/30 transition">
                          <td className="px-4 py-3 text-foreground font-medium">{log.to_email}</td>
                          <td className="px-4 py-3 text-foreground truncate max-w-xs">{log.subject}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              log.status === 'sent' ? 'bg-blue-500/20 text-blue-700 dark:text-blue-300' :
                              log.status === 'delivered' ? 'bg-green-500/20 text-green-700 dark:text-green-300' :
                              'bg-red-500/20 text-red-700 dark:text-red-300'
                            }`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-foreground capitalize">{log.provider}</td>
                          <td className="px-4 py-3 text-foreground font-mono">
                            {log.verification_code || '-'}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {new Date(log.sent_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}