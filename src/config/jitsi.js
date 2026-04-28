const crypto = require("crypto");

const JITSI_DOMAIN = process.env.JITSI_DOMAIN || "meet.jit.si";

/**
 * Generates a unique, hard-to-guess Jitsi room name.
 * Format: myfit-{bookingId}-{8-byte randomHex}
 */
function generateRoomId(bookingId) {
  const rand = crypto.randomBytes(8).toString("hex");
  return `myfit-${bookingId}-${rand}`;
}

/**
 * Returns the full Jitsi meeting URL for a given room ID.
 */
function getRoomUrl(roomId) {
  return `https://${JITSI_DOMAIN}/${roomId}`;
}

module.exports = { generateRoomId, getRoomUrl, JITSI_DOMAIN };