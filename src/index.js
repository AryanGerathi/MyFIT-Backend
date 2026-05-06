require("dotenv").config();
const express   = require("express");
const cors      = require("cors");
const rateLimit = require("express-rate-limit");
const connectDB = require("./config/db");
const { verifyMailer } = require("./config/mailer");

const app = express();

app.set("trust proxy", 1);

connectDB();
verifyMailer();

const allowedOrigins = new Set([
  process.env.CLIENT_URL,
  "https://myfittt.com",
  "https://www.myfittt.com",
  "http://localhost:8080",
  "http://localhost:5173",
  "http://localhost:3000",
].filter(Boolean));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.has(origin)) return callback(null, true);
    const err = new Error(`CORS blocked: ${origin}`);
    err.status = 403;
    err.isCors = true;
    callback(err);
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: "Too many requests. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",    authLimiter, require("./routes/auth"));
app.use("/api/upload",               require("./routes/upload"));
app.use("/api/creator",              require("./routes/creator"));
app.use("/api/admin",                require("./routes/admin"));
app.use("/api/payment",              require("./routes/payment"));
app.use("/api/chat",                 require("./routes/chat"));
app.use("/api/reviews",              require("./routes/reviews"));
app.use("/api/help",                 require("./routes/help"));  // ✅ only here

// ── Health check ──────────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    success:     true,
    message:     "MyFit API is running 🚀",
    environment: process.env.NODE_ENV,
    timestamp:   new Date().toISOString(),
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
  if (err.isCors)
    return res.status(403).json({ success: false, message: err.message });
  console.error("Unhandled error:", err.stack);
  if (err.message?.includes("Only JPEG") || err.message?.includes("File too large"))
    return res.status(400).json({ success: false, message: err.message });
  res.status(500).json({ success: false, message: "Something went wrong." });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📦 Environment : ${process.env.NODE_ENV}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health\n`);
});