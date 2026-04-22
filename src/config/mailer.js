const nodemailer = require("nodemailer");

// ── Create reusable transporter ───────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// ── Verify connection on startup ──────────────────────────────────────────────
const verifyMailer = async () => {
  try {
    await transporter.verify();
    console.log("✅ Gmail mailer ready");
  } catch (error) {
    console.error("❌ Gmail mailer error:", error.message);
    console.error("   Check GMAIL_USER and GMAIL_APP_PASSWORD in .env");
  }
};

// ── HTML Email Template ───────────────────────────────────────────────────────
const otpEmailHTML = (otp, purpose, expiresMinutes) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1E3A5F,#2563EB);padding:32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">
                My<span style="color:#F97316;">Fit</span>
              </h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.7);font-size:13px;">
                Your fitness journey starts here
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h2 style="margin:0 0 8px;color:#0f172a;font-size:20px;font-weight:600;">
                ${purpose === "signup" ? "Verify your email" : "Login verification"}
              </h2>
              <p style="margin:0 0 28px;color:#64748b;font-size:15px;line-height:1.6;">
                ${purpose === "signup"
                  ? "Thanks for signing up! Use the OTP below to verify your email address."
                  : "Use the OTP below to complete your login. Never share this with anyone."}
              </p>

              <!-- OTP Box -->
              <div style="background:#f8fafc;border:2px dashed #e2e8f0;border-radius:12px;padding:28px;text-align:center;margin-bottom:28px;">
                <p style="margin:0 0 8px;color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:2px;font-weight:600;">
                  Your OTP
                </p>
                <p style="margin:0;font-size:42px;font-weight:700;letter-spacing:12px;color:#1e40af;font-family:'Courier New',monospace;">
                  ${otp}
                </p>
                <p style="margin:12px 0 0;color:#94a3b8;font-size:13px;">
                  Expires in <strong style="color:#ef4444;">${expiresMinutes} minutes</strong>
                </p>
              </div>

              <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6;">
                If you didn't request this OTP, you can safely ignore this email. Someone may have entered your email by mistake.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
                © ${new Date().getFullYear()} MyFit. All rights reserved.<br/>
                This is an automated email — please do not reply.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

// ── Send OTP Email ────────────────────────────────────────────────────────────
const sendOTPEmail = async (toEmail, otp, purpose) => {
  const expiresMinutes = parseInt(process.env.OTP_EXPIRES_MINUTES) || 10;
  const subject = purpose === "signup"
    ? "MyFit — Verify your email"
    : "MyFit — Your login OTP";

  const info = await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME || "MyFit"}" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject,
    html: otpEmailHTML(otp, purpose, expiresMinutes),
    // Plain text fallback
    text: `Your MyFit OTP is: ${otp}\nIt expires in ${expiresMinutes} minutes.\nDo not share this with anyone.`,
  });

  console.log(`📧 OTP email sent to ${toEmail} | MessageId: ${info.messageId}`);
  return info.messageId;
};

module.exports = { sendOTPEmail, verifyMailer };