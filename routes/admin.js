import express from "express";
import { isAdmin, isAuth } from "../middlewares/isAuth.js";
import {
  addLectures,
  createCourse,
  deleteCourse,
  deleteLecture,
  getAllStats,
  getAllUser,
  updateRole,
} from "../controllers/admin.js";
import { uploadFiles, handleMulterError } from "../middlewares/multer.js";

const router = express.Router();

// Middleware to log request details
const logRequestDetails = (req, res, next) => {
  console.log('Admin Route - Request Method:', req.method);
  console.log('Admin Route - Request Path:', req.path);
  console.log('Admin Route - Request Headers:', req.headers);
  console.log('Admin Route - Request Body:', req.body);
  console.log('Admin Route - Request Files:', req.files);
  console.log('Admin Route - Request File:', req.file);
  console.log('Admin Route - Session:', req.session);
  console.log('Admin Route - User:', req.user);
  next();
};

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Admin Route - Unhandled Error:', err);
  res.status(500).json({
    message: 'Internal server error',
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

// CORS Preflight handler
router.options('*', (req, res) => {
  const allowedOrigins = [process.env.FRONTEND_URL, 'http://localhost:5173'];
  const origin = req.header('Origin');
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, token, multipart/form-data, Accept, Cookie');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Vary', 'Origin');
  res.sendStatus(204);
});

// Routes that handle file uploads
router.post("/course/new", [
  (req, res, next) => {
    console.log('FULL ROUTE DEBUGGING - Request Details:', {
      baseUrl: req.baseUrl,
      originalUrl: req.originalUrl,
      url: req.url,
      method: req.method,
      path: req.path,
      headers: req.headers,
      body: req.body
    });
    console.log('Incoming Course Creation Request');
    console.log('Full Request Details:', {
      method: req.method,
      originalUrl: req.originalUrl,
      baseUrl: req.baseUrl,
      path: req.path,
      url: req.url
    });
    console.log('Request Method:', req.method);
    console.log('Request URL:', req.url);
    console.log('Request Path:', req.path);
    console.log('Request Headers:', req.headers);
    console.log('Request Body:', req.body);
    console.log('Request Files:', req.files);
    console.log('Request File:', req.file);
    next();
  },
  isAuth, 
  (req, res, next) => {
    console.log('Authentication Passed - User:', req.user);
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    next();
  },
  isAdmin, 
  (req, res, next) => {
    console.log('Admin Check Passed');
    next();
  },
  uploadFiles, 
  handleMulterError, 
  (req, res, next) => {
    console.log('File Upload Middleware Passed');
    console.log('Course Creation Request - Full Details:', {
      body: req.body,
      files: req.files,
      file: req.file,
      user: req.user,
      session: req.session
    });
    next();
  },
  createCourse,
  (err, req, res, next) => {
    console.error('Course Creation Error:', err);
    res.status(500).json({
      message: 'Failed to create course',
      error: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
]);
router.post("/course/:id", 
  logRequestDetails,
  isAuth, 
  isAdmin, 
  uploadFiles, 
  handleMulterError, 
  addLectures,
  errorHandler
);

// Routes that don't handle file uploads
router.delete("/course/:id", isAuth, isAdmin, deleteCourse);
router.delete("/lecture/:id", isAuth, isAdmin, deleteLecture);
router.get("/stats", isAuth, isAdmin, getAllStats);
router.put("/user/:id", isAuth, updateRole);
router.get("/users", isAuth, isAdmin, getAllUser);

// Catch-all error handler
router.use(errorHandler);

// Catch-all 404 handler
router.use((req, res) => {
  console.error('Admin Route - 404 Not Found:', {
    method: req.method,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl,
    path: req.path,
    url: req.url,
    headers: req.headers
  });
  res.status(404).json({
    message: 'Route not found',
    details: {
      method: req.method,
      path: req.path
    }
  });
});

export default router;
