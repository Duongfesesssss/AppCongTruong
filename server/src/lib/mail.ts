import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

import { config } from "./config";
import { logger } from "./logger";

let transporter: Transporter | null = null;

/**
 * Initialize email transporter with Gmail SMTP configuration
 */
export const initMailTransporter = () => {
  if (!config.mail.enabled) {
    logger.info("Email service is disabled (MAIL_ENABLED=false)");
    return;
  }

  if (!config.mail.user || !config.mail.password) {
    logger.warn("Email service is enabled but credentials are missing. Email sending will be skipped.");
    return;
  }

  try {
    transporter = nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.secure,
      // port 587 với secure=false dùng STARTTLS, cần requireTLS để Gmail chấp nhận
      requireTLS: !config.mail.secure && config.mail.port === 587,
      auth: {
        user: config.mail.user,
        pass: config.mail.password.replace(/\s+/g, "") // App Password có thể có spaces
      }
    });

    logger.info(`Email service initialized with ${config.mail.host}`);
  } catch (error) {
    logger.error({ error }, "Failed to initialize email transporter");
  }
};

/**
 * Check if email service is available
 */
export const isMailEnabled = (): boolean => {
  return config.mail.enabled && transporter !== null;
};

/**
 * Send an email
 */
export const sendEmail = async (params: {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
}): Promise<boolean> => {
  if (!isMailEnabled()) {
    logger.debug("Email service is not enabled, skipping email send");
    return false;
  }

  try {
    const recipients = Array.isArray(params.to) ? params.to.join(", ") : params.to;

    await transporter!.sendMail({
      from: `"${config.mail.fromName}" <${config.mail.fromEmail}>`,
      to: recipients,
      subject: params.subject,
      text: params.text,
      html: params.html || params.text.replace(/\n/g, "<br>")
    });

    logger.info({ to: recipients, subject: params.subject }, "Email sent successfully");
    return true;
  } catch (error) {
    logger.error({ error, to: params.to, subject: params.subject }, "Failed to send email");
    return false;
  }
};

/**
 * Send mention notification email
 */
export const sendMentionEmail = async (params: {
  recipientEmail: string;
  recipientName: string;
  actorName: string;
  message: string;
  scope: string;
  projectName?: string;
  deepLinkUrl?: string;
}): Promise<boolean> => {
  const scopeLabel = params.scope === "project" ? `trong project "${params.projectName || "Unknown"}"` : "trong chat toàn cục";
  const subject = `[AppCongTruong] ${params.actorName} đã nhắc đến bạn ${scopeLabel}`;

  const text = `
Xin chào ${params.recipientName},

${params.actorName} đã nhắc đến bạn ${scopeLabel}:

"${params.message}"

${params.deepLinkUrl ? `Xem chi tiết: ${params.deepLinkUrl}` : ""}

---
Tin nhắn này được gửi từ hệ thống AppCongTruong.
  `.trim();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #334155;">AppCongTruong</h2>
      <p>Xin chào <strong>${params.recipientName}</strong>,</p>
      <p><strong>${params.actorName}</strong> đã nhắc đến bạn ${scopeLabel}:</p>
      <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0; color: #475569;">"${params.message}"</p>
      </div>
      ${params.deepLinkUrl ? `<p><a href="${params.deepLinkUrl}" style="color: #2563eb; text-decoration: none;">Xem chi tiết →</a></p>` : ""}
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
      <p style="color: #94a3b8; font-size: 12px;">Tin nhắn này được gửi từ hệ thống AppCongTruong.</p>
    </div>
  `;

  return sendEmail({
    to: params.recipientEmail,
    subject,
    text,
    html
  });
};

/**
 * Send task status update notification email
 */
export const sendTaskStatusEmail = async (params: {
  recipientEmail: string;
  recipientName: string;
  actorName: string;
  taskCode: string;
  taskName?: string;
  oldStatus: string;
  newStatus: string;
  projectName?: string;
  deepLinkUrl?: string;
}): Promise<boolean> => {
  const taskLabel = params.taskName ? `${params.taskCode} (${params.taskName})` : params.taskCode;
  const subject = `[AppCongTruong] Cập nhật trạng thái Pin/Task: ${taskLabel}`;

  const statusMap: Record<string, string> = {
    pending: "Chờ xử lý",
    in_progress: "Đang xử lý",
    completed: "Hoàn thành",
    blocked: "Bị chặn"
  };

  const oldStatusLabel = statusMap[params.oldStatus] || params.oldStatus;
  const newStatusLabel = statusMap[params.newStatus] || params.newStatus;

  const text = `
Xin chào ${params.recipientName},

${params.actorName} đã cập nhật trạng thái của Pin/Task ${taskLabel}${params.projectName ? ` trong project "${params.projectName}"` : ""}:

Trạng thái cũ: ${oldStatusLabel}
Trạng thái mới: ${newStatusLabel}

${params.deepLinkUrl ? `Xem chi tiết: ${params.deepLinkUrl}` : ""}

---
Tin nhắn này được gửi từ hệ thống AppCongTruong.
  `.trim();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #334155;">AppCongTruong</h2>
      <p>Xin chào <strong>${params.recipientName}</strong>,</p>
      <p><strong>${params.actorName}</strong> đã cập nhật trạng thái của Pin/Task <strong>${taskLabel}</strong>${params.projectName ? ` trong project "${params.projectName}"` : ""}:</p>
      <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0 0 10px 0;"><strong>Trạng thái cũ:</strong> <span style="color: #64748b;">${oldStatusLabel}</span></p>
        <p style="margin: 0;"><strong>Trạng thái mới:</strong> <span style="color: #2563eb;">${newStatusLabel}</span></p>
      </div>
      ${params.deepLinkUrl ? `<p><a href="${params.deepLinkUrl}" style="color: #2563eb; text-decoration: none;">Xem chi tiết →</a></p>` : ""}
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
      <p style="color: #94a3b8; font-size: 12px;">Tin nhắn này được gửi từ hệ thống AppCongTruong.</p>
    </div>
  `;

  return sendEmail({
    to: params.recipientEmail,
    subject,
    text,
    html
  });
};
