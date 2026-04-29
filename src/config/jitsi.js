const crypto = require("crypto");
const jwt    = require("jsonwebtoken");

// ── Env vars ──────────────────────────────────────────────────────────────────
const JITSI_DOMAIN      = process.env.JITSI_DOMAIN      || "8x8.vc";
const JITSI_APP_ID      = process.env.JITSI_APP_ID      || "";
const JITSI_KEY_ID      = process.env.JITSI_KEY_ID      || "";
const JITSI_PRIVATE_KEY = (process.env.JITSI_PRIVATE_KEY || "").replace(/\\n/g, "\n");

// ── Startup validation log ────────────────────────────────────────────────────
console.log("=== JITSI CONFIG ===");
console.log("DOMAIN:      ", JITSI_DOMAIN);
console.log("APP_ID:      ", JITSI_APP_ID      || "❌ MISSING");
console.log("KEY_ID:      ", JITSI_KEY_ID      || "❌ MISSING");
console.log("PRIVATE_KEY: ", JITSI_PRIVATE_KEY
  ? `✅ SET (${JITSI_PRIVATE_KEY.length} chars, starts: ${JITSI_PRIVATE_KEY.slice(0, 27)})`
  : "❌ MISSING"
);
console.log("====================");

if (!JITSI_APP_ID || !JITSI_KEY_ID || !JITSI_PRIVATE_KEY) {
  console.error(
    "🚨 Jitsi env vars incomplete — JWT will NOT be generated. " +
    "Set JITSI_APP_ID, JITSI_KEY_ID, JITSI_PRIVATE_KEY in your environment."
  );
}

// ── Room helpers ──────────────────────────────────────────────────────────────

/**
 * Generates a unique, hard-to-guess Jitsi room name.
 * Format: myfit-{bookingId}-{8-byte randomHex}
 */
function generateRoomId(bookingId) {
  const rand = crypto.randomBytes(8).toString("hex");
  return `myfit-${bookingId}-${rand}`;
}

/**
 * Base JaaS room URL (no JWT).
 * Pattern: https://8x8.vc/{appId}/{roomId}
 */
function getRoomUrl(roomId) {
  if (!JITSI_APP_ID) {
    console.error("getRoomUrl: JITSI_APP_ID is empty — URL will be malformed");
  }
  return `https://${JITSI_DOMAIN}/${JITSI_APP_ID}/${roomId}`;
}

// ── JWT generation ────────────────────────────────────────────────────────────

/**
 * Generate a JaaS JWT token for a participant.
 * isModerator: true  → creator (starts call, mutes others)
 * isModerator: false → user   (participant only, no waiting screen)
 */
function generateToken({ name, email, avatarUrl = "", isModerator = false, roomId }) {
  if (!JITSI_APP_ID || !JITSI_PRIVATE_KEY || !JITSI_KEY_ID) {
    console.error("generateToken: Missing env vars — cannot sign JWT");
    return null;
  }

  // Private key must start with the PEM header
  if (!JITSI_PRIVATE_KEY.includes("-----BEGIN")) {
    console.error(
      "generateToken: JITSI_PRIVATE_KEY does not look like a valid PEM key. " +
      "Ensure \\n in your env value are real newlines (use .replace(/\\\\n/g, '\\n'))."
    );
    return null;
  }

  const now = Math.floor(Date.now() / 1000);

  const payload = {
    aud:  "jitsi",
    iss:  "chat",
    iat:  now,
    exp:  now + 60 * 60 * 4,   // 4-hour session
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
    const token = jwt.sign(payload, JITSI_PRIVATE_KEY, {
      algorithm: "RS256",
      header:    { alg: "RS256", kid: JITSI_KEY_ID, typ: "JWT" },
    });
    console.log(`✅ JWT signed — room: ${roomId}, moderator: ${isModerator}`);
    return token;
  } catch (err) {
    console.error("generateToken: jwt.sign failed —", err.message);
    return null;
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * Returns the full JaaS meeting URL with JWT embedded.
 * If JWT generation fails, returns the bare URL (will hit waiting screen).
 *
 * Creator → moderator JWT  → starts call instantly, no waiting screen
 * User    → participant JWT → joins directly, no login required
 */
function getMeetingUrl({ roomId, name, email, avatarUrl = "", isModerator = false }) {
  const base  = getRoomUrl(roomId);
  const token = generateToken({ name, email, avatarUrl, isModerator, roomId });

  if (!token) {
    console.error(
      "getMeetingUrl: Token is null — returning bare URL. " +
      "User will see 'waiting for moderator' screen. Fix env vars."
    );
    return base;   // fallback — still usable but no JWT auth
  }

  return `${base}?jwt=${token}`;
}

module.exports = { generateRoomId, getRoomUrl, getMeetingUrl, JITSI_DOMAIN };