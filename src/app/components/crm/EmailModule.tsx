import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Mail, Clock, CheckCircle2, XCircle, Eye, Trash2, RotateCcw } from 'lucide-react';
import { getEmailLogs, getVerificationCodeHistory, clearExpiredCodes, resetEmailSystem } from './emailApi';
import type { EmailLog, VerificationCode } from './emailApi';

export function EmailModule(): React.ReactElement {
  const [emailLogs, setEmailLogs] = useState<EmailLog[]>([]);
  const [verificationHistory, setVerificationHistory] = useState<VerificationCode[]>([]);
  const [activeTab, setActiveTab] = useState<'logs' | 'history'>('logs');
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);
  const [cleanupMessage, setCleanupMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  function loadData() {
    setEmailLogs(getEmailLogs());
    setVerificationHistory(getVerificationCodeHistory());
  }

  function handleClearExpired() {
    const cleared = clearExpiredCodes();
    setCleanupMessage(`Cleared ${cleared} expired verification code(s)`);
    loadData();
    setTimeout(() => setCleanupMessage(''), 3000);
  }

  function handleResetSystem() {
    if (window.confirm('Are you sure you want to reset the entire email system? This will delete all logs and verification codes.')) {
      resetEmailSystem();
      loadData();
      setCleanupMessage('Email system reset successfully');
      setTimeout(() => setCleanupMessage(''), 3000);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-blue-500/20 text-blue-700 dark:text-blue-300';
      case 'delivered':
        return 'bg-green-500/20 text-green-700 dark:text-green-300';
      case 'failed':
        return 'bg-red-500/20 text-red-700 dark:text-red-300';
      default:
        return 'bg-gray-500/20 text-gray-700 dark:text-gray-300';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const isExpired = (expiresAt: number) => Date.now() > expiresAt;
  const isVerified = (verified: boolean) => verified;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Mail className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Email Management</h1>
            <p className="text-sm text-muted-foreground">2FA verification code tracking and email logs</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border/50">
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-3 font-medium text-sm transition-colors ${
            activeTab === 'logs'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Email Logs ({emailLogs.length})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-3 font-medium text-sm transition-colors ${
            activeTab === 'history'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Verification Codes ({verificationHistory.length})
        </button>
      </div>

      {/* Email Logs Tab */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <Card className="border-border/30">
            <CardHeader className="px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">Sent Emails</h2>
                <p className="text-sm text-muted-foreground mt-1">Track all verification emails sent through the system</p>
              </div>
              <button
                onClick={handleClearExpired}
                className="text-xs px-3 py-1.5 rounded-lg border border-border/50 hover:bg-muted/30 transition"
              >
                Clean Expired
              </button>
            </CardHeader>
            <CardContent className="p-0">
              {emailLogs.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Mail className="w-12 h-12 mx-auto opacity-20 mb-3" />
                  <p>No emails sent yet</p>
                </div>
              ) : (
                <div className="divide-y divide-border/30">
                  {emailLogs.map((log) => (
                    <div key={log.id} className="p-4 hover:bg-muted/30 transition cursor-pointer" onClick={() => setSelectedLog(log)}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-foreground">{log.email}</span>
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${getStatusColor(log.status)}`}>
                            {log.status}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">{formatDate(log.sentAt)}</span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{log.subject}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Selected Log Details */}
          {selectedLog && (
            <Card className="border-border/30 bg-muted/50">
              <CardHeader className="px-5 py-4 flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Email Details</h3>
                <button onClick={() => setSelectedLog(null)} className="text-xs text-muted-foreground hover:text-foreground">
                  ✕ Close
                </button>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Recipient</p>
                  <p className="text-sm font-medium text-foreground">{selectedLog.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Subject</p>
                  <p className="text-sm font-medium text-foreground">{selectedLog.subject}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Body</p>
                  <pre className="text-xs bg-background/50 p-3 rounded-lg overflow-auto whitespace-pre-wrap text-foreground">{selectedLog.body}</pre>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <p className={`text-sm font-medium px-2 py-1 rounded w-fit ${getStatusColor(selectedLog.status)}`}>{selectedLog.status}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Sent At</p>
                  <p className="text-sm font-medium text-foreground">{formatDate(selectedLog.sentAt)}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Verification Codes Tab */}
      {activeTab === 'history' && (
        <Card className="border-border/30">
          <CardHeader className="px-5 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-foreground">Verification Codes</h2>
              <p className="text-sm text-muted-foreground mt-1">History of all verification codes generated and their status</p>
            </div>
            <button
              onClick={handleResetSystem}
              className="text-xs px-3 py-1.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition"
            >
              Reset All
            </button>
          </CardHeader>
          <CardContent className="p-0">
            {verificationHistory.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Mail className="w-12 h-12 mx-auto opacity-20 mb-3" />
                <p>No verification codes generated yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border/30">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-foreground">Email</th>
                      <th className="px-4 py-3 text-left font-medium text-foreground">Code</th>
                      <th className="px-4 py-3 text-left font-medium text-foreground">Status</th>
                      <th className="px-4 py-3 text-left font-medium text-foreground">Created</th>
                      <th className="px-4 py-3 text-left font-medium text-foreground">Expires</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {verificationHistory.map((vc) => (
                      <tr key={vc.id} className="hover:bg-muted/30 transition">
                        <td className="px-4 py-3 text-foreground font-medium">{vc.email}</td>
                        <td className="px-4 py-3 text-foreground font-mono">{vc.code}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {isVerified(vc.verified) ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 text-green-500" />
                                <span className="text-green-600 dark:text-green-400 font-medium">Verified</span>
                              </>
                            ) : isExpired(vc.expiresAt) ? (
                              <>
                                <XCircle className="w-4 h-4 text-red-500" />
                                <span className="text-red-600 dark:text-red-400 font-medium">Expired</span>
                              </>
                            ) : (
                              <>
                                <Clock className="w-4 h-4 text-yellow-500" />
                                <span className="text-yellow-600 dark:text-yellow-400 font-medium">Pending</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(vc.createdAt)}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(vc.expiresAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cleanup Message */}
      {cleanupMessage && (
        <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-700 dark:text-green-300">
          ✓ {cleanupMessage}
        </div>
      )}
    </div>
  );
}
