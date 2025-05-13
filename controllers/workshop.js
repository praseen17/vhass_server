// Removed import of instance (Razorpay) from "../index.js"
// import { instance } from "../index.js";
// Removed import of Payment (used for Razorpay and not used in PhonePe flow yet)
// import { Payment } from "../models/Payment.js";
import TryCatch from "../middlewares/TryCatch.js";
import { Workshop } from "../models/Workshop.js";
import { User } from "../models/User.js";
import fs from "fs";
import PhonePe from "phonepe-kit";

// PhonePe payment integration
const phonepe = new PhonePe(
  process.env.PHONEPE_MERCHANT_ID,
  process.env.PHONEPE_MERCHANT_USER_ID,
  process.env.PHONEPE_API_KEY,
  process.env.PHONEPE_API_KEY_INDEX,
  process.env.PHONEPE_HOST_URL
);

export const getAllWorkshops = TryCatch(async (req, res) => {
  const workshops = await Workshop.find();
  res.json({
    workshops,
  });
});

export const getSingleWorkshop = TryCatch(async (req, res) => {
  const workshop = await Workshop.findById(req.params.id);
  res.json({
    workshop,
  });
});

export const getMyWorkshops = TryCatch(async (req, res) => {
  const workshops = await Workshop.find({ _id: req.user.workshopSubscription });
  res.json({
    workshops,
  });
});

export const createWorkshop = TryCatch(async (req, res) => {
  try {
    console.log('Full request body:', req.body);
    console.log('Full request files:', req.files);
    console.log('Full request file:', req.file);

    const { title, description, createdBy, duration, price, category, date, time, location, syllabus, whoShouldAttend, prerequisites } = req.body;
    
    // Validate required fields
    const requiredFields = ['title', 'description', 'createdBy', 'duration', 'price', 'category', 'date', 'time', 'location'];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({
          message: `Missing required field: ${field}`
        });
      }
    }

    // Handle file upload
    const image = req.file || req.files?.file;
    if (!image) {
      console.error("No file uploaded");
      return res.status(400).json({
        message: "Please upload an image file"
      });
    }

    // Parse array fields
    const parseSafeArray = (field) => {
      try {
        return Array.isArray(req.body[field]) ? req.body[field] : 
               (typeof req.body[field] === 'string' ? JSON.parse(req.body[field]) : [])
      } catch {
        return [];
      }
    };

    console.log("File details:", {
      filename: image.filename,
      path: image.path,
      mimetype: image.mimetype,
      size: image.size
    });

    // Validate required fields
    if (!title || !description || !createdBy || !duration || !price || !category || !date || !time || !location) {
      console.error("Missing required fields");
      return res.status(400).json({
        message: "All fields are required"
      });
    }

    const workshop = await Workshop.create({
      title,
      description,
      createdBy,
      image: image.path,
      duration,
      price,
      category,
      date,
      time,
      location,
      syllabus: syllabus || [],
      whoShouldAttend: whoShouldAttend || [],
      prerequisites: prerequisites || [],
    });

    console.log("Workshop created successfully:", workshop);

    res.status(201).json({
      message: "Workshop Created Successfully",
      workshop
    });
  } catch (error) {
    console.error("Error creating workshop:", error);
    
    // If workshop creation fails, delete the uploaded file
    if (req.file && req.file.path) {
      try {
        await fs.promises.unlink(req.file.path);
        console.log("Deleted uploaded file after error");
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }

    // Send detailed error message
    res.status(500).json({
      message: "Failed to create workshop",
      error: error.message,
      details: error.stack
    });
  }
});

export const deleteWorkshop = TryCatch(async (req, res) => {
  const workshop = await Workshop.findById(req.params.id);
  if (!workshop) return res.status(404).json({ message: "Workshop not found" });

  await workshop.deleteOne();

  res.json({
    message: "Workshop Deleted Successfully",
  });
});

export const phonepeCheckout = TryCatch(async (req, res) => {
  const user = await User.findById(req.user._id);
  const workshop = await Workshop.findById(req.params.id);
  if (user.workshopSubscription.includes(workshop._id)) {
    return res.status(400).json({ message: "You already have this workshop" });
  }
  const transactionId = `WORKSHOP_${workshop._id}_${Date.now()}`;
  const transactionData = {
    amount: workshop.price * 100,
    transactionId,
    callbackUrl: `${process.env.BACKEND_URL}/api/workshop/phonepe/status/${transactionId}`,
    redirectUrl: `${process.env.FRONTEND_URL}/payment-success/${workshop._id}`,
    redirectMode: "REDIRECT",
    mobileNumber: user.phone || "",
    paymentInstrumentType: "PAY_PAGE",
  };
  console.log("phonepeCheckout (workshop) – transaction data:", transactionData);
  try {
    const paymentUrl = await phonepe.generatePaymentUrl(transactionData);
    console.log("phonepeCheckout (workshop) – paymentUrl:", paymentUrl);
    res.json({ paymentUrl, transactionId });
  } catch (error) {
    console.error("phonepeCheckout (workshop) – error:", error);
    res.status(500).json({ message: error.message, details: error });
  }
});

export const phonepeStatus = TryCatch(async (req, res) => {
  const transactionId = req.params.transactionId;
  console.log("phonepeStatus (workshop) – transactionId:", transactionId);
  // (Placeholder – in production, use phonepe-kit or PhonePe API to check status)
  res.json({ status: "pending", transactionId });
}); 