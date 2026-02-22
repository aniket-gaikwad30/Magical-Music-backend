import express from "express";
import dotenv from "dotenv";
import { clerkMiddleware } from "@clerk/express";
import fileUpload from "express-fileupload";
import path from "path";
import cors from "cors";
import fs from "fs";
import { createServer } from "http";
import cron from "node-cron";

import { initializeSocket } from "./lib/socket.js";
import { connectDB } from "./lib/db.js";

import userRoutes from "./routes/user.route.js";
import adminRoutes from "./routes/admin.route.js";
import authRoutes from "./routes/auth.route.js";
import songRoutes from "./routes/song.route.js";
import albumRoutes from "./routes/album.route.js";
import statRoutes from "./routes/stat.route.js";

dotenv.config();

const __dirname = path.resolve();
const app = express();

// ✅ Local = 5050
// ✅ Railway = Auto PORT
const PORT = process.env.PORT || 5050;

const httpServer = createServer(app);
initializeSocket(httpServer);

// ============================
// CORS
// ============================

app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

app.use(express.json());

// Clerk Middleware
app.use(clerkMiddleware());

// ============================
// FILE UPLOAD
// ============================

app.use(
  fileUpload({
    useTempFiles: true,
    tempFileDir: path.join(__dirname, "tmp"),
    createParentPath: true,
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  })
);

// ============================
// ROOT ROUTE
// ============================

app.get("/", (req, res) => {
  res.send("Magical Music Backend Running 🚀");
});

// ============================
// CRON CLEAN TMP
// ============================

const tempDir = path.join(process.cwd(), "tmp");

cron.schedule("0 * * * *", () => {
  if (fs.existsSync(tempDir)) {
    fs.readdir(tempDir, (err, files) => {
      if (err) return console.log("Cron error:", err);

      files.forEach((file) => {
        fs.unlink(path.join(tempDir, file), () => {});
      });
    });
  }
});

// ============================
// ROUTES
// ============================

app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/songs", songRoutes);
app.use("/api/albums", albumRoutes);
app.use("/api/stats", statRoutes);

// ============================
// ERROR HANDLER
// ============================

app.use((err, req, res, next) => {
  console.error(err);

  res.status(500).json({
    message:
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : err.message,
  });
});

// ============================
// START SERVER
// ============================

async function startServer() {
  try {
    // connect DB FIRST
    await connectDB();
    console.log("Database Connected ✅");

    // ✅ VERY IMPORTANT (Railway Fix)
    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log("Server running on port " + PORT);
    });

  } catch (error) {
    console.log("Database Failed ❌", error);
    process.exit(1);
  }
}

startServer();