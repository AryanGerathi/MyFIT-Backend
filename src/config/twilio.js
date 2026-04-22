const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

/**
 * Send OTP via SMS using Twilio
 * @param {string} to  - Full number with country code e.g. "+919876543210"
 * @param {string} otp - The 6-digit OTP
 */
const sendOTP = async (to, otp) => {
  const message = await client.messages.create({
    body: `Your MyFit OTP is: ${otp}. Valid for ${process.env.OTP_EXPIRES_MINUTES || 10} minutes. Do not share this with anyone.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to,
  });
  console.log(`📱 OTP sent to ${to} | SID: ${message.sid}`);
  return message.sid;
};

module.exports = { sendOTP };