import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import type SMTPPool from "nodemailer/lib/smtp-pool";

interface EmailConfig {
    host: string;
    port: number;
    secure: boolean;
    auth: {
        user: string;
        pass: string;
    };
}

class EmailService {
    private transporter: Transporter | null = null;
    private isConfigured: boolean = false;

    constructor() {
        this.initialize();
    }

    private initialize() {
        const emailUser = process.env.EMAIL_USER;
        const emailPassword = process.env.EMAIL_PASSWORD;
        const emailHost = process.env.EMAIL_HOST || "smtp.gmail.com";
        const emailPort = parseInt(process.env.EMAIL_PORT || "587");

        if (!emailUser || !emailPassword) {
            console.warn("⚠ Email service not configured");
            console.warn("  Required: EMAIL_USER and EMAIL_PASSWORD environment variables");
            return;
        }

        const config: EmailConfig = {
            host: emailHost,
            port: emailPort,
            secure: emailPort === 465, // true for 465, false for other ports
            auth: {
                user: emailUser,
                pass: emailPassword,
            },
        };

        const transportConfig: SMTPPool.Options = {
            ...config,
            // Add connection pooling and timeout settings
            pool: true,
            maxConnections: 5,
            maxMessages: 100,
            connectionTimeout: 5000, // 5 seconds
            greetingTimeout: 5000,
            socketTimeout: 10000, // 10 seconds
        };

        this.transporter = nodemailer.createTransport(transportConfig);
        this.isConfigured = true;

        // Verify connection (don't block initialization)
        this.transporter.verify((error) => {
            if (error) {
                console.error("✗ Email service verification failed:", error.message);
                console.error("  Check your EMAIL_USER, EMAIL_PASSWORD, and SMTP settings");
                this.isConfigured = false;
            } else {
                console.log("✓ Email service verified successfully");
            }
        });
    }

    isReady(): boolean {
        return this.isConfigured && this.transporter !== null;
    }

    async sendEmail(options: {
        to: string;
        subject: string;
        text?: string;
        html?: string;
        attachments?: Array<{
            filename: string;
            content: Buffer;
            contentType: string;
        }>;
    }): Promise<void> {
        if (!this.isReady()) {
            throw new Error("Email service is not configured. Please set EMAIL_USER and EMAIL_PASSWORD environment variables.");
        }

        const mailOptions = {
            from: `"${process.env.EMAIL_FROM_NAME || "VyaparX"}" <${process.env.EMAIL_USER}>`,
            to: options.to,
            subject: options.subject,
            text: options.text,
            html: options.html,
            attachments: options.attachments,
        };

        await this.transporter!.sendMail(mailOptions);
    }

    async sendInvoiceEmail(options: {
        to: string;
        invoiceNumber: string;
        businessName: string;
        amount: string;
        pdfBuffer: Buffer;
    }): Promise<void> {
        const { to, invoiceNumber, businessName, amount, pdfBuffer } = options;

        const subject = `Invoice ${invoiceNumber} from ${businessName}`;
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .header {
                        background-color: #4F46E5;
                        color: white;
                        padding: 20px;
                        text-align: center;
                        border-radius: 5px 5px 0 0;
                    }
                    .content {
                        background-color: #f9fafb;
                        padding: 30px;
                        border: 1px solid #e5e7eb;
                        border-top: none;
                    }
                    .invoice-details {
                        background-color: white;
                        padding: 20px;
                        border-radius: 5px;
                        margin: 20px 0;
                    }
                    .detail-row {
                        display: flex;
                        justify-content: space-between;
                        padding: 10px 0;
                        border-bottom: 1px solid #e5e7eb;
                    }
                    .detail-row:last-child {
                        border-bottom: none;
                        font-weight: bold;
                        font-size: 1.1em;
                    }
                    .footer {
                        text-align: center;
                        padding: 20px;
                        color: #6b7280;
                        font-size: 0.9em;
                    }
                    .button {
                        display: inline-block;
                        padding: 12px 24px;
                        background-color: #4F46E5;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        margin: 20px 0;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Invoice from ${businessName}</h1>
                    </div>
                    <div class="content">
                        <p>Dear Customer,</p>
                        <p>Please find attached your invoice from <strong>${businessName}</strong>.</p>
                        
                        <div class="invoice-details">
                            <div class="detail-row">
                                <span>Invoice Number:</span>
                                <span><strong>${invoiceNumber}</strong></span>
                            </div>
                            <div class="detail-row">
                                <span>Amount:</span>
                                <span><strong>${amount}</strong></span>
                            </div>
                        </div>
                        
                        <p>The invoice is attached as a PDF file. Please review it and contact us if you have any questions.</p>
                        
                        <p>Thank you for your business!</p>
                        
                        <p>Best regards,<br>${businessName}</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated email. Please do not reply to this message.</p>
                        <p>&copy; ${new Date().getFullYear()} ${businessName}. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const text = `
Invoice from ${businessName}

Dear Customer,

Please find attached your invoice from ${businessName}.

Invoice Number: ${invoiceNumber}
Amount: ${amount}

The invoice is attached as a PDF file. Please review it and contact us if you have any questions.

Thank you for your business!

Best regards,
${businessName}

---
This is an automated email. Please do not reply to this message.
        `;

        await this.sendEmail({
            to,
            subject,
            text,
            html,
            attachments: [
                {
                    filename: `${invoiceNumber}.pdf`,
                    content: pdfBuffer,
                    contentType: "application/pdf",
                },
            ],
        });
    }

    async sendPasswordResetEmail(options: {
        to: string;
        name: string;
        resetToken: string;
        resetUrl: string;
    }): Promise<void> {
        const { to, name, resetToken, resetUrl } = options;

        const subject = "Reset Your Password - VyaparX";
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .header {
                        background-color: #4F46E5;
                        color: white;
                        padding: 20px;
                        text-align: center;
                        border-radius: 5px 5px 0 0;
                    }
                    .content {
                        background-color: #f9fafb;
                        padding: 30px;
                        border: 1px solid #e5e7eb;
                        border-top: none;
                    }
                    .button {
                        display: inline-block;
                        padding: 12px 24px;
                        background-color: #4F46E5;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        margin: 20px 0;
                        text-align: center;
                    }
                    .token-box {
                        background-color: #f3f4f6;
                        padding: 15px;
                        border-radius: 5px;
                        font-family: monospace;
                        font-size: 14px;
                        word-break: break-all;
                        margin: 20px 0;
                    }
                    .warning {
                        background-color: #fef3c7;
                        border-left: 4px solid #f59e0b;
                        padding: 15px;
                        margin: 20px 0;
                    }
                    .footer {
                        text-align: center;
                        padding: 20px;
                        color: #6b7280;
                        font-size: 0.9em;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🔐 Password Reset Request</h1>
                    </div>
                    <div class="content">
                        <p>Hi ${name},</p>
                        <p>We received a request to reset your password for your VyaparX account.</p>
                        
                        <p>Click the button below to reset your password:</p>
                        
                        <div style="text-align: center;">
                            <a href="${resetUrl}" class="button">Reset Password</a>
                        </div>
                        
                        <p>Or copy and paste this link into your browser:</p>
                        <div class="token-box">${resetUrl}</div>
                        
                        <div class="warning">
                            <strong>⚠️ Security Notice:</strong>
                            <ul style="margin: 10px 0;">
                                <li>This link will expire in 1 hour</li>
                                <li>If you didn't request this, please ignore this email</li>
                                <li>Never share this link with anyone</li>
                            </ul>
                        </div>
                        
                        <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
                        
                        <p>Best regards,<br>The VyaparX Team</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated email. Please do not reply to this message.</p>
                        <p>&copy; ${new Date().getFullYear()} VyaparX. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const text = `
Password Reset Request - VyaparX

Hi ${name},

We received a request to reset your password for your VyaparX account.

Click the link below to reset your password:
${resetUrl}

Security Notice:
- This link will expire in 1 hour
- If you didn't request this, please ignore this email
- Never share this link with anyone

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

Best regards,
The VyaparX Team

---
This is an automated email. Please do not reply to this message.
        `;

        await this.sendEmail({
            to,
            subject,
            text,
            html,
        });
    }

    async sendVerificationEmail(options: {
        to: string;
        name: string;
        verificationToken: string;
        verificationUrl: string;
    }): Promise<void> {
        const { to, name, verificationUrl } = options;

        const subject = "Verify Your Email - VyaparX";
        
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .header {
                        background-color: #4F46E5;
                        color: white;
                        padding: 20px;
                        text-align: center;
                        border-radius: 5px 5px 0 0;
                    }
                    .content {
                        background-color: #f9fafb;
                        padding: 30px;
                        border: 1px solid #e5e7eb;
                        border-top: none;
                    }
                    .button {
                        display: inline-block;
                        padding: 12px 24px;
                        background-color: #4F46E5;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        margin: 20px 0;
                        text-align: center;
                    }
                    .token-box {
                        background-color: #f3f4f6;
                        padding: 15px;
                        border-radius: 5px;
                        font-family: monospace;
                        font-size: 14px;
                        word-break: break-all;
                        margin: 20px 0;
                    }
                    .info {
                        background-color: #dbeafe;
                        border-left: 4px solid #3b82f6;
                        padding: 15px;
                        margin: 20px 0;
                    }
                    .footer {
                        text-align: center;
                        padding: 20px;
                        color: #6b7280;
                        font-size: 0.9em;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>✉️ Verify Your Email</h1>
                    </div>
                    <div class="content">
                        <p>Hi ${name},</p>
                        <p>Welcome to VyaparX! We're excited to have you on board.</p>
                        
                        <p>To complete your registration and start using VyaparX, please verify your email address by clicking the button below:</p>
                        
                        <div style="text-align: center;">
                            <a href="${verificationUrl}" class="button">Verify Email Address</a>
                        </div>
                        
                        <p>Or copy and paste this link into your browser:</p>
                        <div class="token-box">${verificationUrl}</div>
                        
                        <div class="info">
                            <strong>ℹ️ Important:</strong>
                            <ul style="margin: 10px 0;">
                                <li>This link will expire in 24 hours</li>
                                <li>You need to verify your email to access all features</li>
                                <li>If you didn't create an account, please ignore this email</li>
                            </ul>
                        </div>
                        
                        <p>Once verified, you'll be able to:</p>
                        <ul>
                            <li>Create and manage invoices</li>
                            <li>Track inventory and stock</li>
                            <li>Manage customers and suppliers</li>
                            <li>Generate financial reports</li>
                        </ul>
                        
                        <p>If you have any questions, feel free to reach out to our support team.</p>
                        
                        <p>Best regards,<br>The VyaparX Team</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated email. Please do not reply to this message.</p>
                        <p>&copy; ${new Date().getFullYear()} VyaparX. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const text = `
Verify Your Email - VyaparX

Hi ${name},

Welcome to VyaparX! We're excited to have you on board.

To complete your registration and start using VyaparX, please verify your email address by clicking the link below:

${verificationUrl}

Important:
- This link will expire in 24 hours
- You need to verify your email to access all features
- If you didn't create an account, please ignore this email

Once verified, you'll be able to:
- Create and manage invoices
- Track inventory and stock
- Manage customers and suppliers
- Generate financial reports

If you have any questions, feel free to reach out to our support team.

Best regards,
The VyaparX Team

---
This is an automated email. Please do not reply to this message.
        `;

        await this.sendEmail({
            to,
            subject,
            text,
            html,
        });
    }

    async sendBusinessInviteEmail(options: {
        to: string;
        invitedEmail: string;
        businessName: string;
        inviterName: string;
        role: string;
        inviteUrl: string;
    }): Promise<void> {
        const { to, invitedEmail, businessName, inviterName, role, inviteUrl } = options;
        const subject = `Join ${businessName} on VyaparX`;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                    }
                    .container {
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .header {
                        background-color: #4F46E5;
                        color: white;
                        padding: 20px;
                        text-align: center;
                        border-radius: 5px 5px 0 0;
                    }
                    .content {
                        background-color: #f9fafb;
                        padding: 30px;
                        border: 1px solid #e5e7eb;
                        border-top: none;
                    }
                    .button {
                        display: inline-block;
                        padding: 12px 24px;
                        background-color: #4F46E5;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        margin: 20px 0;
                        text-align: center;
                    }
                    .token-box {
                        background-color: #f3f4f6;
                        padding: 15px;
                        border-radius: 5px;
                        font-family: monospace;
                        font-size: 14px;
                        word-break: break-all;
                        margin: 20px 0;
                    }
                    .footer {
                        text-align: center;
                        padding: 20px;
                        color: #6b7280;
                        font-size: 0.9em;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Business Invite</h1>
                    </div>
                    <div class="content">
                        <p>Hi ${invitedEmail},</p>
                        <p><strong>${inviterName}</strong> invited you to join <strong>${businessName}</strong> on VyaparX.</p>
                        <p>Your access role will be <strong>${role}</strong>.</p>
                        <div style="text-align: center;">
                            <a href="${inviteUrl}" class="button">Review And Accept Invite</a>
                        </div>
                        <p>Or copy and paste this link into your browser:</p>
                        <div class="token-box">${inviteUrl}</div>
                        <p>If you do not have an account yet, sign up with <strong>${invitedEmail}</strong> first, then return to this invite link.</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated email. Please do not reply to this message.</p>
                        <p>&copy; ${new Date().getFullYear()} VyaparX. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const text = `
Join ${businessName} on VyaparX

${inviterName} invited you to join ${businessName} on VyaparX.
Your access role will be ${role}.

Open this link to review and accept the invite:
${inviteUrl}

If you do not have an account yet, sign up with ${invitedEmail} first, then return to this invite link.

---
This is an automated email. Please do not reply to this message.
        `;

        await this.sendEmail({
            to,
            subject,
            text,
            html,
        });
    }
}

export const emailService = new EmailService();
