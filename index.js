// --- Load environment variables FIRST ---
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the directory name
console.log("PORT:", process.env.PORT);
console.log("All ENV:", process.env);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables manually (Windows and Unix compatible)

// --- Now import everything else ---
import express from "express";
import cors from "cors";
import path from "path";
import cookieParser from 'cookie-parser';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import mongoose from 'mongoose';
import authRoutes from './routes/auth.js';
import passport from './config/passport.js';

const app = express();

// Debug middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CORS configuration
app.use(cors({
  origin(origin, callback) {
    const allowedOrigins = [
      process.env.FRONTEND_URL || 'http://localhost:5173',
      'http://localhost:5173'
    ];
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'token', 'multipart/form-data', 'Accept', 'x-requested-with', 'Cookie', 'x-debug-request', 'X-Debug-Request'],
  exposedHeaders: ['Set-Cookie'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    ttl: 24 * 60 * 60 // 1 day
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// Initialize Passport and restore authentication state from session
app.use(passport.initialize());
app.use(passport.session());

const port = 5001;

app.get("/", (req, res) => {
  res.send("Server is working");
});

// Serve static files from the uploads directory
const uploadsPath = path.join(__dirname, 'uploads');
console.log('Uploads directory path:', uploadsPath); // Debug log

app.use("/uploads", express.static(uploadsPath, {
  setHeaders: (res, path) => {
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Cache-Control', 'public, max-age=31536000');
  }
}));

// Debug route to check if files exist
app.get("/uploads/check/:filename", (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsPath, filename);
  const exists = require('fs').existsSync(filePath);
  res.json({
    exists,
    path: filePath,
    filename
  });
});

// importing routes
import userRoutes from "./routes/user.js";
import courseRoutes from "./routes/course.js";
import adminRoutes from "./routes/admin.js";
import workshopRoutes from "./routes/workshop.js";

// using routes
app.use("/api/auth", authRoutes);
console.log('Registered auth routes:', authRoutes.stack.map(r => r.route ? r.route.path : 'unknown'));

app.use("/api", userRoutes);
console.log('Registered user routes:', userRoutes.stack.map(r => r.route ? r.route.path : 'unknown'));

app.use("/api", courseRoutes);
console.log('Registered course routes:', courseRoutes.stack.map(r => r.route ? r.route.path : 'unknown'));

app.use("/api/admin", adminRoutes);
console.log('Registered admin routes:', adminRoutes.stack.map(r => r.route ? `/admin${r.route.path}` : 'unknown'));

app.use("/api", workshopRoutes);
console.log('Registered workshop routes:', workshopRoutes.stack.map(r => r.route ? r.route.path : 'unknown'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler for /uploads
app.use('/uploads', (req, res) => {
  res.status(404).json({ 
    error: 'File not found',
    path: req.path,
    uploadsPath
  });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    // Start server only after DB connection
    const PORT = process.env.PORT || 5001;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log('Environment:', process.env.NODE_ENV || 'development');
      console.log('Frontend URL:', process.env.FRONTEND_URL);
      console.log('Backend URL:', process.env.BACKEND_URL);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  // Don't exit the process in production
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Add session debug logging
app.use((req, res, next) => {
  console.log('Session:', req.session);
  console.log('Session user:', req.session.user);
  next();
});
