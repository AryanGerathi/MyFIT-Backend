const crypto = require("crypto");
const jwt    = require("jsonwebtoken");

const JITSI_DOMAIN      = process.env.JITSI_DOMAIN      || "8x8.vc";
const JITSI_APP_ID      = process.env.JITSI_APP_ID      || "";
const JITSI_KEY_ID      = process.env.JITSI_KEY_ID      || "";
const JITSI_PRIVATE_KEY = (process.env.JITSI_PRIVATE_KEY || "").replace(/\\n/g, "\n");

/**
 * Generates a unique, hard-to-guess Jitsi room name.
 * Format: myfit-{bookingId}-{8-byte randomHex}
 */
function generateRoomId(bookingId) {
  const rand = crypto.randomBytes(8).toString("hex");
  return `myfit-${bookingId}-${rand}`;
}

/**
 * Base room URL (without JWT).
 */
function getRoomUrl(roomId) {
  return `https://${JITSI_DOMAIN}/${JITSI_APP_ID}/${roomId}`;
}

/**
 * Generate a JaaS JWT token for a participant.
 * isModerator: true  → creator (can start/end call, mute others)
 * isModerator: false → user   (participant only)
 */
function generateToken({ name, email, avatarUrl = "", isModerator = false, roomId }) {
  if (!JITSI_APP_ID || !JITSI_PRIVATE_KEY || !JITSI_KEY_ID) {
    console.warn("⚠️  Jitsi JWT env vars missing — token not generated");
    return null;
  }

  const now = Math.floor(Date.now() / 1000);

  const payload = {
    aud:  "jitsi",
    iss:  "chat",
    iat:  now,
    exp:  now + (60 * 60 * 4),  // 4-hour session
    nbf:  now - 10,
    sub:  JITSI_APP_ID,
    room: roomId,
    context: {
      user: {
        id:        email,
        name,
        email,
        avatar:    avatarUrl,
        moderator: isModerator,
      },
      features: {
        livestreaming:   false,
        recording:       false,
        transcription:   false,
        "outbound-call": false,
      },
    },
  };

  try {
    return jwt.sign(payload, JITSI_PRIVATE_KEY, {
      algorithm: "RS256",
      header:    { alg: "RS256", kid: JITSI_KEY_ID, typ: "JWT" },
    });
  } catch (err) {
    console.error("JWT sign error:", err.message);
    return null;
  }
}

/**
 * Returns the full meeting URL with JWT embedded.
 * Creator  → moderator token  (can start/manage the call)
 * User     → participant token (joins directly, no waiting screen)
 */
function getMeetingUrl({ roomId, name, email, avatarUrl = "", isModerator = false }) {
  const token = generateToken({ name, email, avatarUrl, isModerator, roomId });
  const base  = getRoomUrl(roomId);
  return token ? `${base}?jwt=${token}` : base;
}

module.exports = { generateRoomId, getRoomUrl, getMeetingUrl, JITSI_DOMAIN };