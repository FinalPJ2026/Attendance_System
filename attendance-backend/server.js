
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

// ================= MONGODB CONNECTION =================

const MONGODB_URI =
  process.env.MONGODB_URI ||
  (process.env.NODE_ENV !== "production"
    ? "mongodb://127.0.0.1:27017/attendanceDB"
    : "");

let dbPromise = null;

async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is missing in Vercel Environment Variables.");
  }

  if (!dbPromise) {
    dbPromise = mongoose
      .connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 10000,
      })
      .then(() => {
        console.log("MongoDB connected successfully!");
      })
      .catch((err) => {
        dbPromise = null;
        throw err;
      });
  }

  await dbPromise;
}

// ================= DATABASE SCHEMAS =================

const studentSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    course: { type: String, default: "" },
    year: { type: String, default: "" },
  },
  { timestamps: true }
);

const attendanceSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, trim: true },
    name: { type: String, default: "" },
    date: { type: String, required: true },
    status: {
      type: String,
      enum: ["Present", "Absent", "Late"],
      default: "Present",
    },
  },
  { timestamps: true }
);

const Student =
  mongoose.models.Student ||
  mongoose.model("Student", studentSchema);

const Attendance =
  mongoose.models.Attendance ||
  mongoose.model("Attendance", attendanceSchema);

function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ================= TEST ROUTE =================

app.get("/", (req, res) => {
  res.json({
    message: "Class Attendance System API is running!",
  });
});

// Connect to the database before handling API requests.
app.use("/api", async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    res.status(503).json({
      message: "Database connection failed. Check MONGODB_URI in Vercel.",
    });
  }
});

// ================= STUDENTS =================

// Get all students
app.get("/api/students", async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });
    res.json(students);
  } catch (err) {
    console.error("Get students:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// Search students
app.get("/api/students/search", async (req, res) => {
  try {
    const q = String(req.query.q || "");
    const result = await Student.find({
      $or: [
        { studentId: { $regex: q, $options: "i" } },
        { name: { $regex: q, $options: "i" } },
        { course: { $regex: q, $options: "i" } },
      ],
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add student
app.post("/api/students", async (req, res) => {
  try {
    const { studentId, name, course, year } = req.body;

    if (!studentId || !name) {
      return res.status(400).json({
        message: "Student ID and name are required.",
      });
    }

    const id = String(studentId).trim();
    const exists = await Student.findOne({ studentId: id });

    if (exists) {
      return res.status(409).json({
        message: "This Student ID already exists.",
      });
    }

    const student = await Student.create({
      studentId: id,
      name: String(name).trim(),
      course: course || "",
      year: year || "",
    });

    res.status(201).json(student);
  } catch (err) {
    console.error("Add student:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// Get one student
app.get("/api/students/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid student ID." });
    }

    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    res.json(student);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete student and attendance records
app.delete("/api/students/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid student ID." });
    }

    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    await Attendance.deleteMany({ studentId: student.studentId });
    await Student.findByIdAndDelete(req.params.id);

    res.json({ message: "Student deleted successfully." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================= ATTENDANCE =================

// Get attendance records
app.get("/api/attendance", async (req, res) => {
  try {
    const records = await Attendance.find().sort({
      date: -1,
      createdAt: -1,
    });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Record attendance
app.post("/api/attendance", async (req, res) => {
  try {
    const { studentId, date, status } = req.body;

    if (!studentId || !date || !status) {
      return res.status(400).json({
        message: "Student ID, date, and status are required.",
      });
    }

    if (!["Present", "Absent", "Late"].includes(status)) {
      return res.status(400).json({
        message: "Invalid attendance status.",
      });
    }

    const student = await Student.findOne({
      studentId: String(studentId).trim(),
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found." });
    }

    const record = await Attendance.create({
      studentId: student.studentId,
      name: student.name,
      date: String(date),
      status,
    });

    res.status(201).json(record);
  } catch (err) {
    console.error("Record attendance:", err.message);
    res.status(500).json({ message: err.message });
  }
});

// Edit attendance
app.put("/api/attendance/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid attendance ID.",
      });
    }

    const updates = {};

    if (req.body.status !== undefined) {
      if (!["Present", "Absent", "Late"].includes(req.body.status)) {
        return res.status(400).json({
          message: "Invalid attendance status.",
        });
      }
      updates.status = req.body.status;
    }

    if (req.body.date !== undefined) {
      updates.date = String(req.body.date);
    }

    const record = await Attendance.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!record) {
      return res.status(404).json({
        message: "Attendance record not found.",
      });
    }

    res.json(record);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete attendance record
app.delete("/api/attendance/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        message: "Invalid attendance ID.",
      });
    }

    const record = await Attendance.findByIdAndDelete(req.params.id);

    if (!record) {
      return res.status(404).json({
        message: "Attendance record not found.",
      });
    }

    res.json({ message: "Attendance record deleted." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ================= AI SMART ANALYSIS =================

app.get("/api/ai/analysis", async (req, res) => {
  try {
    const students = await Student.find();
    const records = await Attendance.find();
    const today = getToday();

    const count = (status, list = records) =>
      list.filter((r) => r.status === status).length;

    const absenceMap = {};

    records.filter((r) => r.status === "Absent").forEach((r) => {
      const key = r.studentId;

      if (!absenceMap[key]) {
        absenceMap[key] = {
          studentId: r.studentId,
          name: r.name || r.studentId,
          absences: 0,
        };
      }

      absenceMap[key].absences++;
    });

    const todayRecords = records.filter((r) => r.date === today);
    const present = count("Present");
    const absent = count("Absent");
    const late = count("Late");

    res.json({
      totalStudents: students.length,
      totalRecords: records.length,
      present,
      absent,
      late,
      attendanceRate: records.length
        ? Math.round((present / records.length) * 100)
        : 0,
      today,
      todayRecords,
      todayPresent: count("Present", todayRecords),
      todayAbsent: count("Absent", todayRecords),
      todayLate: count("Late", todayRecords),
      studentsWithMostAbsences: Object.values(absenceMap)
        .sort((a, b) => b.absences - a.absences)
        .slice(0, 5),
      insights: [
        records.length
          ? `There are ${records.length} attendance records in total.`
          : "No attendance records yet. Start recording attendance to see analysis.",
        `Present: ${present}, Absent: ${absent}, Late: ${late}.`,
      ],
    });
  } catch (err) {
    console.error("Analysis error:", err.message);
    res.status(500).json({
      message: "Could not analyze attendance.",
    });
  }
});

// ================= AI CHATBOT =================
// Rule-based chatbot; no API key required.

app.post("/api/ai/chat", async (req, res) => {
  try {
    const question = String(req.body.question || "").toLowerCase().trim();

    if (!question) {
      return res.status(400).json({
        answer: "Please type a question.",
      });
    }

    const students = await Student.find().sort({ name: 1 });
    const records = await Attendance.find();
    const today = getToday();

    const count = (status) =>
      records.filter((r) => r.status === status).length;

    const todayAbsent = records.filter(
      (r) => r.date === today && r.status === "Absent"
    );

    const absentMap = {};

    records.filter((r) => r.status === "Absent").forEach((r) => {
      const key = r.studentId;

      if (!absentMap[key]) {
        absentMap[key] = {
          name: r.name || r.studentId,
          absences: 0,
        };
      }

      absentMap[key].absences++;
    });

    const mostAbsent = Object.values(absentMap).sort(
      (a, b) => b.absences - a.absences
    );

    let answer;

    if (/hello|^hi\b|^hey\b/.test(question)) {
      answer =
        "Hello! I can help you check students and attendance. Ask me about your saved records.";
    } else if (
      question.includes("today") &&
      (question.includes("absent") || question.includes("missing"))
    ) {
      answer = todayAbsent.length
        ? `Students marked Absent today (${today}): ${todayAbsent
            .map((r) => r.name || r.studentId)
            .join(", ")}.`
        : `There are no Absent records for today (${today}).`;
    } else if (
      question.includes("most absent") ||
      question.includes("frequently absent") ||
      question.includes("most absences")
    ) {
      answer = mostAbsent.length
        ? "Students with the most recorded absences: " +
          mostAbsent
            .slice(0, 5)
            .map((s, i) => `${i + 1}. ${s.name} (${s.absences})`)
            .join("; ")
        : "There are no Absent records yet.";
    } else if (
      question.includes("attendance rate") ||
      question.includes("present rate")
    ) {
      const rate = records.length
        ? Math.round((count("Present") / records.length) * 100)
        : 0;

      answer = `The overall Present rate is ${rate}% (${count(
        "Present"
      )} Present records out of ${records.length} records).`;
    } else if (
      question.includes("how many students") ||
      question.includes("total students") ||
      question.includes("number of students")
    ) {
      answer = `There are ${students.length} registered students.`;
    } else if (
      question.includes("list students") ||
      question.includes("show students") ||
      question.includes("student names")
    ) {
      answer = students.length
        ? "Registered students: " +
          students.map((s) => `${s.name} (${s.studentId})`).join(", ")
        : "No students registered yet.";
    } else if (
      question.includes("how many present") ||
      question.includes("total present") ||
      question.includes("present records")
    ) {
      answer = `There are ${count("Present")} Present records.`;
    } else if (
      question.includes("how many absent") ||
      question.includes("total absent") ||
      question.includes("absent records")
    ) {
      answer = `There are ${count("Absent")} Absent records.`;
    } else if (
      question.includes("how many late") ||
      question.includes("total late") ||
      question.includes("late records")
    ) {
      answer = `There are ${count("Late")} Late records.`;
    } else if (
      question.includes("attendance records") ||
      question.includes("total records")
    ) {
      answer = `There are ${records.length} attendance records in total.`;
    } else if (question.includes("help")) {
      answer =
        "Try asking: How many students? How many are Present? Who is absent today? Who has the most absences? What is the attendance rate?";
    } else {
      answer =
        "I can answer questions about saved records. Try asking: How many students? How many are absent? Who is absent today? What is the attendance rate?";
    }

    res.json({ answer });
  } catch (err) {
    console.error("Chatbot error:", err.message);
    res.status(500).json({
      answer: "Sorry, the chatbot could not read the attendance data.",
    });
  }
});

// Unknown API route
app.use("/api", (req, res) => {
  res.status(404).json({
    message: "API route not found.",
  });
});

// ================= START SERVER =================

if (require.main === module) {
  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;
