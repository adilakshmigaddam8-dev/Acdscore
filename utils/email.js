const nodemailer = require('nodemailer');
const logger = require('./logger');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  try {
    const info = await transporter.sendMail({
      from: `"AcadScore" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    logger.info(`Email sent to ${to}: ${info.messageId}`);
    return true;
  } catch (error) {
    logger.error(`Email send failed to ${to}: ${error.message}`);
    throw new Error('Failed to send email');
  }
};

const sendOTPEmail = async (email, name, otp) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', sans-serif; background: #f0f4ff; margin: 0; padding: 0; }
        .container { max-width: 520px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(26,86,219,.12); }
        .header { background: linear-gradient(135deg, #1a56db, #4f46e5); padding: 32px; text-align: center; }
        .header h1 { color: #fff; margin: 0; font-size: 24px; letter-spacing: -0.5px; }
        .body { padding: 32px; }
        .otp-box { background: #f0f4ff; border: 2px dashed #1a56db; border-radius: 12px; padding: 24px; text-align: center; margin: 24px 0; }
        .otp-code { font-size: 40px; font-weight: 700; letter-spacing: 8px; color: #1a56db; }
        .footer { background: #f8faff; padding: 20px 32px; text-align: center; font-size: 12px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>🎓 AcadScore</h1></div>
        <div class="body">
          <h2 style="color:#0f172a; margin-top:0;">Password Reset OTP</h2>
          <p style="color:#475569;">Hi <strong>${name}</strong>, use the OTP below to reset your password. It expires in <strong>10 minutes</strong>.</p>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
          </div>
          <p style="color:#94a3b8; font-size:13px;">If you didn't request this, please ignore this email.</p>
        </div>
        <div class="footer">© ${new Date().getFullYear()} AcadScore. All rights reserved.</div>
      </div>
    </body>
    </html>
  `;
  return sendEmail({ to: email, subject: 'AcadScore – Password Reset OTP', html });
};

const sendWelcomeEmail = async (email, name) => {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: 'Segoe UI', sans-serif; background: #f0f4ff; margin: 0; padding: 0; }
        .container { max-width: 520px; margin: 40px auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(26,86,219,.12); }
        .header { background: linear-gradient(135deg, #1a56db, #4f46e5); padding: 32px; text-align: center; }
        .header h1 { color: #fff; margin: 0; font-size: 24px; }
        .body { padding: 32px; }
        .footer { background: #f8faff; padding: 20px 32px; text-align: center; font-size: 12px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header"><h1>🎓 Welcome to AcadScore!</h1></div>
        <div class="body">
          <h2 style="color:#0f172a; margin-top:0;">Hi ${name} 👋</h2>
          <p style="color:#475569;">Your account has been created successfully. You can now calculate CGPA, SGPA, track attendance, and use financial calculators.</p>
          <p style="color:#475569;">Happy calculating! 🎉</p>
        </div>
        <div class="footer">© ${new Date().getFullYear()} AcadScore. All rights reserved.</div>
      </div>
    </body>
    </html>
  `;
  return sendEmail({ to: email, subject: 'Welcome to AcadScore! 🎓', html });
};

module.exports = { sendEmail, sendOTPEmail, sendWelcomeEmail };
