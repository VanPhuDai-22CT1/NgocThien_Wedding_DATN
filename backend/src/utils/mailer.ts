const nodemailer = require('nodemailer');

type SendOtpMailResult = {
  sent: boolean;
  reason?: string;
};

function getSmtpPort() {
  const port = Number(process.env.SMTP_PORT || 587);
  return Number.isFinite(port) ? port : 587;
}

function hasSmtpConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

export async function sendPasswordResetOtp(email: string, otp: string): Promise<SendOtpMailResult> {
  if (!hasSmtpConfig()) {
    return { sent: false, reason: 'SMTP_NOT_CONFIGURED' };
  }

  const port = getSmtpPort();
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.FROM_EMAIL || process.env.SMTP_USER,
    to: email,
    subject: 'Ma OTP dat lai mat khau - Ngoc Thien Wedding',
    text: [
      'Xin chao,',
      '',
      `Ma OTP dat lai mat khau cua ban la: ${otp}`,
      'Ma co hieu luc trong 10 phut.',
      '',
      'Neu ban khong yeu cau dat lai mat khau, vui long bo qua email nay.',
      '',
      'Ngoc Thien Wedding',
    ].join('\n'),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #222;">
        <h2 style="margin: 0 0 12px;">Ngoc Thien Wedding</h2>
        <p>Ma OTP dat lai mat khau cua ban la:</p>
        <div style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 16px 0;">${otp}</div>
        <p>Ma co hieu luc trong <strong>10 phut</strong>.</p>
        <p>Neu ban khong yeu cau dat lai mat khau, vui long bo qua email nay.</p>
      </div>
    `,
  });

  return { sent: true };
}
