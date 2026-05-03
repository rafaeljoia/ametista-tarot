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

interface ConsultantOnlineData {
  to: string;
  userName: string;
  consultantName: string;
  consultantId: string;
}

interface GenericData {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
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

  private fromAddress(): string {
    return (
      process.env.SMTP_FROM ||
      `Ametista Tarot <${process.env.SMTP_USER || 'no-reply@ametista.local'}>`
    );
  }

  private async sendRaw(opts: { to: string; subject: string; text: string; html?: string }): Promise<void> {
    if (!this.transporter) {
      this.logger.log(
        `[email-mock] to=${opts.to} subject="${opts.subject}"`,
      );
      return;
    }
    try {
      await this.transporter.sendMail({
        from: this.fromAddress(),
        to: opts.to,
        subject: opts.subject,
        text: opts.text,
        html: opts.html,
      });
      this.logger.log(`E-mail enviado para ${opts.to}: ${opts.subject}`);
    } catch (err: any) {
      this.logger.error(`Falha ao enviar e-mail para ${opts.to}: ${err?.message}`);
    }
  }

  async send(data: GenericData): Promise<void> {
    return this.sendRaw(data);
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

    return this.sendRaw({ to: data.to, subject, text, html });
  }

  async sendPasswordReset(data: { to: string; name: string; link: string; ttlMinutes: number }): Promise<void> {
    const subject = 'Redefinição de senha — Ametista Tarot';
    const text =
      `Olá ${data.name},\n\n` +
      `Recebemos uma solicitação de redefinição de senha para sua conta.\n\n` +
      `Para criar uma nova senha, acesse o link abaixo (válido por ${data.ttlMinutes} minutos):\n` +
      `${data.link}\n\n` +
      `Se você não solicitou essa alteração, ignore este e-mail — sua senha continuará a mesma.\n\n` +
      `Equipe Ametista Tarot`;
    const html = renderResetHtml(data);
    return this.sendRaw({ to: data.to, subject, text, html });
  }

  async sendBlessingOrderToConsultant(data: {
    to: string;
    consultantName: string;
    clientName: string;
    clientEmail: string;
    priceCredits: number;
    orderId: string;
  }): Promise<void> {
    const subject = `Novo pedido de banhos/orações — ${data.clientName}`;
    const text =
      `Olá ${data.consultantName},\n\n` +
      `O(a) cliente ${data.clientName} (${data.clientEmail}) solicitou indicação de banhos e orações ` +
      `após o atendimento (R$ ${Number(data.priceCredits).toFixed(2)} já debitados do saldo).\n\n` +
      `Por favor, prepare a indicação e envie diretamente para o e-mail do cliente.\n\n` +
      `Pedido: ${data.orderId}\n\n` +
      `Equipe Ametista Tarot`;
    const html = renderBlessingOrderHtml(data);
    return this.sendRaw({ to: data.to, subject, text, html });
  }

  async sendOfferingDeliveredToClient(data: {
    to: string;
    clientName: string;
    consultantName: string;
    kindLabel: string;
    deliveryText: string;
  }): Promise<void> {
    const subject = `Sua ${data.kindLabel} chegou — ${data.consultantName}`;
    const text =
      `Olá ${data.clientName},\n\n` +
      `${data.consultantName} acabou de te enviar a ${data.kindLabel} solicitada:\n\n` +
      `${data.deliveryText}\n\n` +
      `Você também pode ver esta mensagem na sua área "Minhas oferendas" da plataforma.\n\n` +
      `Equipe Ametista Tarot`;
    const html = renderOfferingDeliveredHtml(data);
    return this.sendRaw({ to: data.to, subject, text, html });
  }

  async sendConsultantOnlineNotification(data: ConsultantOnlineData): Promise<void> {
    const base = process.env.FRONTEND_URL || 'https://ametista.braviaglobal.com.br';
    const link = `${base}/consultor/${data.consultantId}`;
    const subject = `${data.consultantName} está online agora`;
    const text =
      `Olá ${data.userName},\n\n` +
      `${data.consultantName} acabou de ficar disponível para atendimento.\n` +
      `Aproveite e inicie sua consulta agora: ${link}\n\n` +
      `Equipe Ametista Tarot`;
    const html = renderConsultantOnlineHtml({ ...data, link });
    return this.sendRaw({ to: data.to, subject, text, html });
  }
}

function safeHtml(s: string) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]!));
}

function renderConfirmationHtml(data: ConfirmationData & { dashboardUrl: string }) {
  return `
<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#0f0a1f;padding:32px;color:#e5dff5">
  <div style="max-width:560px;margin:0 auto;background:#1a1233;border:1px solid #2d1f55;border-radius:16px;padding:32px">
    <h1 style="text-align:center;color:#fff;font-weight:600;margin:8px 0 24px">Pagamento aprovado</h1>
    <p>Olá <strong>${safeHtml(data.name)}</strong>,</p>
    <p>Recebemos seu pagamento e os créditos já estão disponíveis na sua conta.</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#221545;border-radius:12px;overflow:hidden">
      <tr><td style="padding:12px 16px;color:#a99cd6">Valor</td><td style="padding:12px 16px;text-align:right;color:#fff">R$ ${data.gross.toFixed(2)}</td></tr>
      <tr><td style="padding:12px 16px;color:#a99cd6;border-top:1px solid #2d1f55">Créditos</td><td style="padding:12px 16px;text-align:right;color:#f5d36a;font-weight:600;border-top:1px solid #2d1f55">+${data.credits}</td></tr>
      <tr><td style="padding:12px 16px;color:#a99cd6;border-top:1px solid #2d1f55">Forma</td><td style="padding:12px 16px;text-align:right;color:#fff;border-top:1px solid #2d1f55">${safeHtml(data.method.toUpperCase())}</td></tr>
      <tr><td style="padding:12px 16px;color:#a99cd6;border-top:1px solid #2d1f55">Transação</td><td style="padding:12px 16px;text-align:right;color:#a99cd6;font-size:12px;border-top:1px solid #2d1f55">${safeHtml(data.transactionId)}</td></tr>
    </table>
    <div style="text-align:center;margin:28px 0">
      <a href="${safeHtml(data.dashboardUrl)}" style="display:inline-block;background:linear-gradient(90deg,#6e3aff,#9d5cff);color:#fff;text-decoration:none;padding:12px 28px;border-radius:12px;font-weight:600">Ir para o painel</a>
    </div>
    <p style="color:#a99cd6;font-size:12px;text-align:center;margin-top:24px">Ametista Tarot · Conexões que iluminam.</p>
  </div>
</body></html>`;
}

function renderResetHtml(data: { name: string; link: string; ttlMinutes: number }) {
  return `
<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#0f0a1f;padding:32px;color:#e5dff5">
  <div style="max-width:560px;margin:0 auto;background:#1a1233;border:1px solid #2d1f55;border-radius:16px;padding:32px">
    <h1 style="text-align:center;color:#fff;font-weight:600;margin:8px 0 16px">Redefinir sua senha</h1>
    <p>Olá <strong>${safeHtml(data.name)}</strong>,</p>
    <p>Recebemos um pedido para redefinir a senha da sua conta na Ametista Tarot.</p>
    <p>Clique no botão abaixo para escolher uma nova senha. O link é válido por <strong>${data.ttlMinutes} minutos</strong>.</p>
    <div style="text-align:center;margin:28px 0">
      <a href="${safeHtml(data.link)}" style="display:inline-block;background:linear-gradient(90deg,#6e3aff,#9d5cff);color:#fff;text-decoration:none;padding:12px 28px;border-radius:12px;font-weight:600">Redefinir senha</a>
    </div>
    <p style="color:#a99cd6;font-size:12px;line-height:1.5">Se você não solicitou a redefinição, ignore este e-mail — sua senha continuará a mesma.</p>
    <p style="color:#a99cd6;font-size:12px;text-align:center;margin-top:24px">Ametista Tarot · Conexões que iluminam.</p>
  </div>
</body></html>`;
}

function renderBlessingOrderHtml(data: {
  consultantName: string;
  clientName: string;
  clientEmail: string;
  priceCredits: number;
  orderId: string;
}) {
  return `
<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#0f0a1f;padding:32px;color:#e5dff5">
  <div style="max-width:560px;margin:0 auto;background:#1a1233;border:1px solid #2d1f55;border-radius:16px;padding:32px">
    <h1 style="text-align:center;color:#fff;font-weight:600;margin:8px 0 16px">Novo pedido de banhos / orações</h1>
    <p>Olá <strong>${safeHtml(data.consultantName)}</strong>,</p>
    <p>Você recebeu um novo pedido de indicação de banhos e orações.</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0;background:#221545;border-radius:12px;overflow:hidden">
      <tr><td style="padding:12px 16px;color:#a99cd6">Cliente</td><td style="padding:12px 16px;text-align:right;color:#fff">${safeHtml(data.clientName)}</td></tr>
      <tr><td style="padding:12px 16px;color:#a99cd6;border-top:1px solid #2d1f55">E-mail</td><td style="padding:12px 16px;text-align:right;color:#fff;border-top:1px solid #2d1f55"><a href="mailto:${safeHtml(data.clientEmail)}" style="color:#c9b6ff;text-decoration:none">${safeHtml(data.clientEmail)}</a></td></tr>
      <tr><td style="padding:12px 16px;color:#a99cd6;border-top:1px solid #2d1f55">Valor pago</td><td style="padding:12px 16px;text-align:right;color:#f5d36a;font-weight:600;border-top:1px solid #2d1f55">R$ ${Number(data.priceCredits).toFixed(2)}</td></tr>
      <tr><td style="padding:12px 16px;color:#a99cd6;border-top:1px solid #2d1f55">Pedido</td><td style="padding:12px 16px;text-align:right;color:#a99cd6;font-size:12px;border-top:1px solid #2d1f55">${safeHtml(data.orderId)}</td></tr>
    </table>
    <p style="line-height:1.6">Por favor, prepare a indicação e envie diretamente para o e-mail do cliente. Em seguida, marque o pedido como enviado no seu painel.</p>
    <p style="color:#a99cd6;font-size:12px;text-align:center;margin-top:24px">Ametista Tarot · Conexões que iluminam.</p>
  </div>
</body></html>`;
}

function renderOfferingDeliveredHtml(data: {
  clientName: string;
  consultantName: string;
  kindLabel: string;
  deliveryText: string;
}) {
  const paragraphs = data.deliveryText
    .split(/\n{2,}/)
    .map((p) => `<p style="line-height:1.6;margin:0 0 12px 0">${safeHtml(p).replace(/\n/g, '<br/>')}</p>`)
    .join('');
  return `
<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#0f0a1f;padding:32px;color:#e5dff5">
  <div style="max-width:560px;margin:0 auto;background:#1a1233;border:1px solid #2d1f55;border-radius:16px;padding:32px">
    <h1 style="text-align:center;color:#fff;font-weight:600;margin:8px 0 16px">Sua ${safeHtml(data.kindLabel)} chegou</h1>
    <p>Olá <strong>${safeHtml(data.clientName)}</strong>,</p>
    <p><strong>${safeHtml(data.consultantName)}</strong> acabou de te enviar a ${safeHtml(data.kindLabel)} solicitada.</p>
    <div style="background:#221545;border-radius:12px;padding:20px;margin:18px 0;color:#e5dff5">
      ${paragraphs}
    </div>
    <p style="color:#a99cd6;font-size:12px;text-align:center;margin-top:24px">Ametista Tarot · Conexões que iluminam.</p>
  </div>
</body></html>`;
}

function renderConsultantOnlineHtml(data: ConsultantOnlineData & { link: string }) {
  return `
<!doctype html>
<html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#0f0a1f;padding:32px;color:#e5dff5">
  <div style="max-width:560px;margin:0 auto;background:#1a1233;border:1px solid #2d1f55;border-radius:16px;padding:32px">
    <h1 style="text-align:center;color:#fff;font-weight:600;margin:8px 0 16px">${safeHtml(data.consultantName)} está online</h1>
    <p>Olá <strong>${safeHtml(data.userName)}</strong>,</p>
    <p><strong>${safeHtml(data.consultantName)}</strong> acabou de ficar disponível para atendimento. Aproveite e inicie sua consulta agora.</p>
    <div style="text-align:center;margin:28px 0">
      <a href="${safeHtml(data.link)}" style="display:inline-block;background:linear-gradient(90deg,#6e3aff,#9d5cff);color:#fff;text-decoration:none;padding:12px 28px;border-radius:12px;font-weight:600">Iniciar consulta</a>
    </div>
    <p style="color:#a99cd6;font-size:12px;text-align:center;margin-top:24px">Ametista Tarot · Conexões que iluminam.</p>
  </div>
</body></html>`;
}
