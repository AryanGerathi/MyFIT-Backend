// src/config/whatsapp.js
const axios = require("axios");

const PHONE_NUMBER_ID = process.env.WA_PHONE_NUMBER_ID;
const ACCESS_TOKEN    = process.env.WA_ACCESS_TOKEN;
const API_URL         = `https://graph.facebook.com/v19.0/${PHONE_NUMBER_ID}/messages`;

const sendMessage = async (to, body) => {
  await axios.post(
    API_URL,
    { messaging_product: "whatsapp", to, type: "text", text: { body } },
    { headers: { Authorization: `Bearer ${ACCESS_TOKEN}`, "Content-Type": "application/json" } }
  );
};

// Sent to USER after booking
const sendBookingConfirmation = async (toPhone, { creatorName, date, time, sessionType, amount }) => {
  const body =
    `✅ *Booking Confirmed!*\n\n` +
    `👤 Trainer: ${creatorName}\n` +
    `📅 Date: ${date}\n` +
    `🕐 Time: ${time}\n` +
    `🏋️ Type: ${sessionType}\n` +
    `💰 Amount: ₹${amount}\n\n` +
    `We'll send your session link before it starts. See you there! 💪`;

  await sendMessage(toPhone, body);
};

// Sent to CREATOR when they get a new booking
const sendCreatorAlert = async (toPhone, { clientName, date, time, sessionType, amount }) => {
  const body =
    `🎉 *New Booking Received!*\n\n` +
    `👤 Client: ${clientName}\n` +
    `📅 Date: ${date}\n` +
    `🕐 Time: ${time}\n` +
    `🏋️ Type: ${sessionType}\n` +
    `💰 Amount: ₹${amount}\n\n` +
    `Log in to MyFittt to view the session details. 🚀`;

  await sendMessage(toPhone, body);
};

module.exports = { sendBookingConfirmation, sendCreatorAlert };