import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface ConfirmationData {
  to: string;
  name: string;
  gross: number;
  credits: number;
  method: string;
  transactionId: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter | null = null;

  constructor() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.logger.log(`SMTP configurado em ${host}:${port}`);
    } else {
      this.logger.warn('SMTP não configurado — e-mails serão registrados em log');
    }
  }

  async sendPaymentConfirmation(data: ConfirmationData): Promise<void> {
    const subject = `Pagamento aprovado — ${data.credits} créditos adicionados`;
    const dashboardUrl =
      (process.env.FRONTEND_URL || 'https://ametista.braviaglobal.com.br') + '/dashboard';
    const html = renderConfirmationHtml({ ...data, dashboardUrl });
    const text =
      `Olá ${data.name},\n\n` +
      `Recebemos seu pagamento de R$ ${data.gross.toFixed(2)} (${data.method.toUpperCase()}). ` +
      `Foram adicionados ${data.credits} créditos à sua conta.\n\n` +
      `Acesse seu painel: ${dashboardUrl}\n\n` +
      `Transação: ${data.transactionId}\n\n` +
      `Equipe Ametista Tarot`;

    if (!this.transporter) {
      this.logger.log(
        `[email-mock] to=${data.to} subject="${subject}" credits=${data.credits} gross=${data.gross} txn=${data.transactionId}`,
      );
      return;
    }

    try {
      const from =
        process.env.SMTP_FROM ||
        `Ametista Tarot <${process.env.SMTP_USER}>`;
      await this.transporter.sendMail({
        from,
        to: data.to,
        subject,
        text,
        html,
      });
      this.logger.log(`Confirmation e-mail sent to ${data.to} (${data.transactionId})`);
    } catch (err: any) {
      this.logger.error(
        `Failed to send confirmation e-mail to ${data.to}: ${err?.message}`,
      );
    }
  }
}

function renderConfirmationHtml(data: ConfirmationData & { dashboardUrl: string }) {
  const safe = (s: string) =>
    String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]!));
  return `
<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#0f0a1f;padding:32px;color:#e5dff5">
  <div style="max-width:560px;margin:0 auto;background:#1a1233;border:1px solid #2d1f55;border-radius:16px;padding:32px">
    <div style="text-align:center;font-size:32px">🌙</div>
    <h1 style="text-align:center;color:#fff;font-weight:600;margin:8px 0 24px">Pagamento aprovado</h1>
    <p>Olá <strong>${safe(data.name)}</strong>,</p>
    <p>Recebemos seu pagamento e os créditos já estão disponíveis na sua conta.</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#221545;border-radius:12px;overflow:hidden">
      <tr><td style="padding:12px 16px;color:#a99cd6">Valor</td><td style="padding:12px 16px;text-align:right;color:#fff">R$ ${data.gross.toFixed(2)}</td></tr>
      <tr><td style="padding:12px 16px;color:#a99cd6;border-top:1px solid #2d1f55">Créditos</td><td style="padding:12px 16px;text-align:right;color:#f5d36a;font-weight:600;border-top:1px solid #2d1f55">+${data.credits}</td></tr>
      <tr><td style="padding:12px 16px;color:#a99cd6;border-top:1px solid #2d1f55">Forma</td><td style="padding:12px 16px;text-align:right;color:#fff;border-top:1px solid #2d1f55">${safe(data.method.toUpperCase())}</td></tr>
      <tr><td style="padding:12px 16px;color:#a99cd6;border-top:1px solid #2d1f55">Transação</td><td style="padding:12px 16px;text-align:right;color:#a99cd6;font-size:12px;border-top:1px solid #2d1f55">${safe(data.transactionId)}</td></tr>
    </table>
    <div style="text-align:center;margin:28px 0">
      <a href="${safe(data.dashboardUrl)}" style="display:inline-block;background:linear-gradient(90deg,#6e3aff,#9d5cff);color:#fff;text-decoration:none;padding:12px 28px;border-radius:12px;font-weight:600">Ir para o painel</a>
    </div>
    <p style="color:#a99cd6;font-size:12px;text-align:center;margin-top:24px">Ametista Tarot · Conexões que iluminam.</p>
  </div>
</body></html>`;
}
