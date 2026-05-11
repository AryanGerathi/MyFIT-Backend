// src/config/whatsapp.js
const axios = require("axios");

const PHONE_NUMBER_ID = process.env.WA_PHONE_NUMBER_ID;
const ACCESS_TOKEN    = process.env.WA_ACCESS_TOKEN;

const sendBookingConfirmation = async (toPhone, booking) => {
  const { creatorName, date, time, sessionType, amount } = booking;

  const body =
    `✅ *Booking Confirmed!*\n\n` +
    `👤 Creator: ${creatorName}\n` +
    `📅 Date: ${date}\n` +
    `🕐 Time: ${time}\n` +
    `🏋️ Type: ${sessionType}\n` +
    `💰 Amount: ₹${amount}\n\n` +
    `We'll send you the session link before it starts. See you there! 💪`;

  await axios.post(
    `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to: toPhone,
      type: "text",
      text: { body },
    },
    {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
};

module.exports = { sendBookingConfirmation };