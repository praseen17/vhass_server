// Removed import of instance (Razorpay) from "../index.js"
// import { instance } from "../index.js";
import TryCatch from "../middlewares/TryCatch.js";
import { Courses } from "../models/Courses.js";
import { Lecture } from "../models/Lecture.js";
import { User } from "../models/User.js";
import { Progress } from "../models/Progress.js";
import PhonePe from "phonepe-kit";

// PhonePe payment integration
const phonepe = new PhonePe(
  process.env.PHONEPE_MERCHANT_ID,
  process.env.PHONEPE_MERCHANT_USER_ID,
  process.env.PHONEPE_API_KEY,
  process.env.PHONEPE_API_KEY_INDEX,
  process.env.PHONEPE_HOST_URL
);

export const getAllCourses = TryCatch(async (req, res) => {
  const courses = await Courses.find();
  res.json({
    courses,
  });
});

export const getSingleCourse = TryCatch(async (req, res) => {
  const course = await Courses.findById(req.params.id);

  res.json({
    course,
  });
});

export const fetchLectures = TryCatch(async (req, res) => {
  const lectures = await Lecture.find({ course: req.params.id });

  const user = await User.findById(req.user._id);

  if (user.role === "admin") {
    return res.json({ lectures });
  }

  if (!user.subscription.includes(req.params.id))
    return res.status(400).json({
      message: "You have not subscribed to this course",
    });

  res.json({ lectures });
});

export const fetchLecture = TryCatch(async (req, res) => {
  const lecture = await Lecture.findById(req.params.id);

  const user = await User.findById(req.user._id);

  if (user.role === "admin") {
    return res.json({ lecture });
  }

  if (!user.subscription.includes(lecture.course))
    return res.status(400).json({
      message: "You have not subscribed to this course",
    });

  res.json({ lecture });
});

export const getMyCourses = TryCatch(async (req, res) => {
  const courses = await Courses.find({ _id: req.user.subscription });

  res.json({
    courses,
  });
});

export const addProgress = TryCatch(async (req, res) => {
  const progress = await Progress.findOne({
    user: req.user._id,
    course: req.query.course,
  });

  const { lectureId } = req.query;

  if (progress.completedLectures.includes(lectureId)) {
    return res.json({
      message: "Progress recorded",
    });
  }

  progress.completedLectures.push(lectureId);

  await progress.save();

  res.status(201).json({
    message: "new Progress added",
  });
});

export const getYourProgress = TryCatch(async (req, res) => {
  const progress = await Progress.find({
    user: req.user._id,
    course: req.query.course,
  });

  if (!progress) return res.status(404).json({ message: "null" });

  const allLectures = (await Lecture.find({ course: req.query.course })).length;

  const completedLectures = progress[0].completedLectures.length;

  const courseProgressPercentage = (completedLectures * 100) / allLectures;

  res.json({
    courseProgressPercentage,
    completedLectures,
    allLectures,
    progress,
  });
});

export const phonepeCheckout = TryCatch(async (req, res) => {
  const user = await User.findById(req.user._id);
  const course = await Courses.findById(req.params.id);
  if (user.subscription.includes(course._id)) {
    return res.status(400).json({ message: "You already have this course" });
  }
  const transactionId = `COURSE_${course._id}_${Date.now()}`;
  const transactionData = {
    amount: course.price * 100,
    transactionId,
    callbackUrl: `${process.env.BACKEND_URL}/api/course/phonepe/status/${transactionId}`,
    redirectUrl: `${process.env.FRONTEND_URL}/payment-success/${course._id}`,
    redirectMode: "REDIRECT",
    mobileNumber: user.phone || "",
    paymentInstrumentType: "PAY_PAGE",
  };
  console.log("phonepeCheckout (course) – transaction data:", transactionData);
  try {
    const paymentUrl = await phonepe.generatePaymentUrl(transactionData);
    console.log("phonepeCheckout (course) – paymentUrl:", paymentUrl);
    res.json({ paymentUrl, transactionId });
  } catch (error) {
    console.error("phonepeCheckout (course) – error:", error);
    res.status(500).json({ message: error.message, details: error });
  }
});

export const phonepeStatus = TryCatch(async (req, res) => {
  const transactionId = req.params.transactionId;
  console.log("phonepeStatus (course) – transactionId:", transactionId);
  // (Placeholder – in production, use phonepe-kit or PhonePe API to check status)
  res.json({ status: "pending", transactionId });
});
