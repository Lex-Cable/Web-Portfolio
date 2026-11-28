import nodemailer from 'nodemailer';

export interface ContactEmailResult {
  emailDelivered: boolean;
  acknowledgementSent: boolean;
  mode: 'smtp' | 'stored_only';
  note: string;
}

export async function sendContactEmail(params: {
  senderName: string;
  senderEmail: string;
  subject: string;
  message: string;
}): Promise<ContactEmailResult> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const adminEmail = process.env.ADMIN_EMAIL || 'jaccie.wambui26@gmail.com';
  const fromAddress = process.env.SMTP_FROM || user || adminEmail;

  if (!host || !user || !pass) {
    return {
      emailDelivered: false,
      acknowledgementSent: false,
      mode: 'stored_only',
      note: 'Message saved in private Admin Inbox. Configure SMTP_HOST, SMTP_USER, and SMTP_PASS to enable automatic email forwarding.',
    };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"Portfolio Contact" <${fromAddress}>`,
    to: adminEmail,
    replyTo: params.senderEmail,
    subject: `[Portfolio Inquiry] ${params.subject}`,
    text: `From: ${params.senderName} <${params.senderEmail}>\nSubject: ${params.subject}\n\n${params.message}`,
  });

  let acknowledgementSent = false;
  try {
    await transporter.sendMail({
      from: `"Jacinta Wambui Waweru" <${fromAddress}>`,
      to: params.senderEmail,
      subject: `Thank you for your message — ${params.subject}`,
      text: `Hello ${params.senderName},\n\nThank you for reaching out via my portfolio. I have received your message regarding "${params.subject}" and will respond as soon as possible.\n\nBest regards,\nJacinta Wambui Waweru\nFull-Stack Developer`,
    });
    acknowledgementSent = true;
  } catch {
    acknowledgementSent = false;
  }

  return {
    emailDelivered: true,
    acknowledgementSent,
    mode: 'smtp',
    note: 'Message forwarded to Jacinta Wambui Waweru.',
  };
}


export async function sendContactReply(params: {
  senderName: string;
  senderEmail: string;
  subject: string;
  reply: string;
}): Promise<void> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const adminEmail = process.env.ADMIN_EMAIL || 'jaccie.wambui26@gmail.com';
  const fromAddress = process.env.SMTP_FROM || user || adminEmail;

  if (!host || !user || !pass) {
    throw new Error('Email replies are not available yet. Configure SMTP_HOST, SMTP_USER, and SMTP_PASS on the server.');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: `"Jacinta Wambui Waweru" <${fromAddress}>`,
    to: params.senderEmail,
    replyTo: adminEmail,
    subject: params.subject.startsWith('Re:') ? params.subject : `Re: ${params.subject}`,
    text: `Hello ${params.senderName},\n\n${params.reply.trim()}\n\nBest regards,\nJacinta Wambui Waweru\nFull-Stack Developer`,
  });
}
