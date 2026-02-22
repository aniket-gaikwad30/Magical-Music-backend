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

// Railway auto PORT
const PORT = process.env.PORT || 5050;

const httpServer = createServer(app);

// ============================
// SOCKET INIT
// ============================

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

// ============================
// CLERK SAFE LOAD
// ============================

if (process.env.CLERK_SECRET_KEY) {
  app.use(clerkMiddleware());
}

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
// HEALTH CHECK (VERY IMPORTANT)
// ============================

app.get("/", (req, res) => {
  res.status(200).send("Magical Music Backend Running 🚀");
});

app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// ============================
// CRON TMP CLEAN
// ============================

const tempDir = path.join(process.cwd(), "tmp");

cron.schedule("0 * * * *", () => {
  if (fs.existsSync(tempDir)) {
    fs.readdir(tempDir, (err, files) => {
      if (err) {
        console.log("Cron error:", err);
        return;
      }

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

    // Connect DB first
    await connectDB();

    console.log("Database Connected ✅");

    // Railway Safe Listen
    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (error) {

    console.log("Database Failed ❌", error);

    process.exit(1);
  }
}

startServer();