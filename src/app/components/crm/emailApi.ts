// Email API Database for 2FA Verification
// Manages verification code generation, storage, and email tracking

export interface VerificationCode {
  id: string;
  email: string;
  code: string;
  createdAt: number;
  expiresAt: number;
  verified: boolean;
  verifiedAt?: number;
  attempts: number;
}

export interface EmailLog {
  id: string;
  email: string;
  subject: string;
  body: string;
  sentAt: number;
  status: 'sent' | 'failed' | 'delivered';
  codeId?: string;
}

const EMAIL_STORAGE_KEY = 'email_verification_system';
const VERIFICATION_CODE_EXPIRY = 10 * 60 * 1000; // 10 minutes

interface EmailDatabase {
  verificationCodes: VerificationCode[];
  emailLogs: EmailLog[];
}

function getEmailDatabase(): EmailDatabase {
  const stored = localStorage.getItem(EMAIL_STORAGE_KEY);
  return stored ? JSON.parse(stored) : { verificationCodes: [], emailLogs: [] };
}

function saveEmailDatabase(db: EmailDatabase): void {
  localStorage.setItem(EMAIL_STORAGE_KEY, JSON.stringify(db));
}

function generateVerificationCode(): string {
  return Math.random().toString().slice(2, 8).padEnd(6, '0');
}

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function createVerificationCode(email: string): { code: string; codeId: string } {
  const db = getEmailDatabase();
  const code = generateVerificationCode();
  const now = Date.now();

  const verificationCode: VerificationCode = {
    id: generateId(),
    email,
    code,
    createdAt: now,
    expiresAt: now + VERIFICATION_CODE_EXPIRY,
    verified: false,
    attempts: 0,
  };

  db.verificationCodes.push(verificationCode);
  saveEmailDatabase(db);

  return { code, codeId: verificationCode.id };
}

export function sendVerificationEmail(
  email: string,
  code: string,
  codeId: string,
  companyName: string = 'Industrial Management Tracking System'
): { success: boolean; message: string; logId: string } {
  const db = getEmailDatabase();
  const logId = generateId();

  const subject = `${companyName} - Two-Factor Authentication Code`;
  const body = `
Your Two-Factor Authentication code is: ${code}

This code will expire in 10 minutes.

If you did not request this code, please ignore this email.

---
Industrial Management Tracking System
Secure Authentication System
  `.trim();

  const emailLog: EmailLog = {
    id: logId,
    email,
    subject,
    body,
    sentAt: Date.now(),
    status: 'sent',
    codeId,
  };

  db.emailLogs.push(emailLog);
  saveEmailDatabase(db);

  return {
    success: true,
    message: `Verification code sent to ${email}`,
    logId,
  };
}

export function verifyCode(email: string, code: string): { verified: boolean; message: string } {
  const db = getEmailDatabase();

  const verificationCode = db.verificationCodes.find(
    (vc) => vc.email === email && vc.code === code && !vc.verified
  );

  if (!verificationCode) {
    return { verified: false, message: 'Invalid or expired code' };
  }

  if (Date.now() > verificationCode.expiresAt) {
    return { verified: false, message: 'Code has expired. Request a new one.' };
  }

  verificationCode.verified = true;
  verificationCode.verifiedAt = Date.now();
  saveEmailDatabase(db);

  return { verified: true, message: 'Code verified successfully' };
}

export function getVerificationStatus(email: string): VerificationCode | null {
  const db = getEmailDatabase();
  const active = db.verificationCodes.find(
    (vc) => vc.email === email && !vc.verified && Date.now() <= vc.expiresAt
  );
  return active || null;
}

export function getEmailLogs(email?: string): EmailLog[] {
  const db = getEmailDatabase();
  if (email) {
    return db.emailLogs.filter((log) => log.email === email);
  }
  return db.emailLogs;
}

export function getVerificationCodeHistory(email?: string): VerificationCode[] {
  const db = getEmailDatabase();
  if (email) {
    return db.verificationCodes.filter((vc) => vc.email === email);
  }
  return db.verificationCodes;
}

export function clearExpiredCodes(): number {
  const db = getEmailDatabase();
  const now = Date.now();
  const initialLength = db.verificationCodes.length;

  db.verificationCodes = db.verificationCodes.filter((vc) => vc.expiresAt > now || vc.verified);

  saveEmailDatabase(db);
  return initialLength - db.verificationCodes.length;
}

export function resetEmailSystem(): void {
  localStorage.removeItem(EMAIL_STORAGE_KEY);
}
