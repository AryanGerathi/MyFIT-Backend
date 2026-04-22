require("dotenv").config();
const express   = require("express");
const cors      = require("cors");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const { verifyMailer } = require("./config/mailer");

const app = express();

// ── Connect to MongoDB ────────────────────────────────────────────────────────
connectDB();

// ── Verify Gmail connection on startup ────────────────────────────────────────
verifyMailer();

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, mobile apps)
    if (!origin) return callback(null, true);
    // Allow any localhost port in development
    if (process.env.NODE_ENV === "development" && origin.startsWith("http://localhost")) {
      return callback(null, true);
    }
    // Allow configured CLIENT_URL in production
    if (origin === process.env.CLIENT_URL) {
      return callback(null, true);
    }
    callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many requests. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth", authLimiter, require("./routes/auth"));

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "MyFit API is running 🚀",
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err.stack);
  res.status(500).json({ success: false, message: "Something went wrong." });
});

// ── Start server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📦 Environment : ${process.env.NODE_ENV}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health\n`);
});