
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose
  .connect("mongodb://127.0.0.1:27017/attendanceDB")
  .then(() => console.log("MongoDB connected successfully!"))
  .catch((error) => console.log("MongoDB error:", error.message));

// Get today's date in local time (YYYY-MM-DD)
function getTodayDate() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// Student Schema
const studentSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    course: {
      type: String,
      default: "",
    },
    year: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Attendance Schema
const attendanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      default: "",
    },
    date: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["Present", "Absent", "Late"],
      default: "Present",
    },
  },
  { timestamps: true }
);

const Student = mongoose.model("Student", studentSchema);
const Attendance = mongoose.model("Attendance", attendanceSchema);

// Test Route
app.get("/", (req, res) => {
  res.send("Class Attendance System API is running!");
});

// ===============================
// STUDENT ROUTES
// ===============================

// Get all students
app.get("/api/students", async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: "Failed to get students." });
  }
});

// Search students
app.get("/api/students/search", async (req, res) => {
  try {
    const search = String(req.query.q || "").trim();

    const students = await Student.find({
      $or: [
        { studentId: { $regex: search, $options: "i" } },
        { name: { $regex: search, $options: "i" } },
        { course: { $regex: search, $options: "i" } },
      ],
    }).sort({ name: 1 });

    res.json(students);
  } catch (error) {
    res.status(500).json({ message: "Student search failed." });
  }
});

// Add a student
app.post("/api/students", async (req, res) => {
  try {
    const { studentId, name, course, year } = req.body;

    if (!studentId || !name) {
      return res.status(400).json({
        message: "Student ID and name are required.",
      });
    }

    const existingStudent = await Student.findOne({
      studentId: String(studentId).trim(),
    });

    if (existingStudent) {
      return res.status(409).json({
        message: "This Student ID already exists.",
      });
    }

    const student = await Student.create({
      studentId: String(studentId).trim(),
      name: String(name).trim(),
      course: course || "",
      year: year || "",
    });

    res.status(201).json(student);
  } catch (error) {
    console.error("Add student error:", error);
    res.status(500).json({ message: "Failed to add student." });
  }
});

// Get one student by MongoDB ID
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
  } catch (error) {
    res.status(500).json({ message: "Failed to get student." });
  }
});

// Delete student and their attendance records
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

    res.json({
      message: "Student and related attendance records deleted successfully.",
    });
  } catch (error) {
    console.error("Delete student error:", error);
    res.status(500).json({ message: "Failed to delete student." });
  }
});

// ===============================
// ATTENDANCE ROUTES
// ===============================

// Get all attendance records
app.get("/api/attendance", async (req, res) => {
  try {
    const records = await Attendance.find().sort({
      date: -1,
      createdAt: -1,
    });

    res.json(records);
  } catch (error) {
    res.status(500).json({ message: "Failed to get attendance records." });
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
        message: "Status must be Present, Absent, or Late.",
      });
    }

    const student = await Student.findOne({
      studentId: String(studentId).trim(),
    });

    if (!student) {
      return res.status(404).json({
        message: "Student not found. Please add the student first.",
      });
    }

    const record = await Attendance.create({
      studentId: student.studentId,
      name: student.name,
      date: String(date),
      status,
    });

    res.status(201).json(record);
  } catch (error) {
    console.error("Record attendance error:", error);
    res.status(500).json({ message: "Failed to record attendance." });
  }
});

// Edit attendance
app.put("/api/attendance/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid attendance ID." });
    }

    const { status, date } = req.body;

    if (
      status !== undefined &&
      !["Present", "Absent", "Late"].includes(status)
    ) {
      return res.status(400).json({
        message: "Status must be Present, Absent, or Late.",
      });
    }

    const updates = {};

    if (status !== undefined) updates.status = status;
    if (date !== undefined) updates.date = String(date);

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
  } catch (error) {
    console.error("Edit attendance error:", error);
    res.status(500).json({ message: "Failed to update attendance." });
  }
});

// Delete an attendance record
app.delete("/api/attendance/:id", async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid attendance ID." });
    }

    const record = await Attendance.findByIdAndDelete(req.params.id);

    if (!record) {
      return res.status(404).json({
        message: "Attendance record not found.",
      });
    }

    res.json({ message: "Attendance record deleted successfully." });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete attendance record.",
    });
  }
});

// ===============================
// AI SMART ATTENDANCE ANALYSIS
// No API key required
// ===============================

app.get("/api/ai/analysis", async (req, res) => {
  try {
    const students = await Student.find();
    const records = await Attendance.find();

    const totalStudents = students.length;
    const totalRecords = records.length;

    const present = records.filter(
      (record) => record.status === "Present"
    ).length;

    const absent = records.filter(
      (record) => record.status === "Absent"
    ).length;

    const late = records.filter(
      (record) => record.status === "Late"
    ).length;

    const attendanceRate =
      totalRecords > 0
        ? Math.round((present / totalRecords) * 100)
        : 0;

    const today = getTodayDate();

    const todayRecords = records.filter(
      (record) => record.date === today
    );

    const todayPresent = todayRecords.filter(
      (record) => record.status === "Present"
    ).length;

    const todayAbsent = todayRecords.filter(
      (record) => record.status === "Absent"
    ).length;

    const todayLate = todayRecords.filter(
      (record) => record.status === "Late"
    ).length;

    const absenceCounts = {};

    records
      .filter((record) => record.status === "Absent")
      .forEach((record) => {
        const key = record.studentId;

        if (!absenceCounts[key]) {
          absenceCounts[key] = {
            studentId: record.studentId,
            name: record.name || "Unknown Student",
            absences: 0,
          };
        }

        absenceCounts[key].absences += 1;
      });

    const studentsWithMostAbsences = Object.values(absenceCounts)
      .sort((a, b) => b.absences - a.absences)
      .slice(0, 5);

    const insights = [];

    if (totalRecords === 0) {
      insights.push(
        "No attendance records yet. Start recording attendance to see your analysis."
      );
    } else {
      insights.push(
        `The overall Present rate is ${attendanceRate}% based on all attendance records.`
      );

      if (absent > present) {
        insights.push(
          "There are more Absent records than Present records. Review attendance patterns."
        );
      }

      if (late > 0) {
        insights.push(
          `There are ${late} Late records. Consider reminding students to arrive on time.`
        );
      }

      if (studentsWithMostAbsences.length > 0) {
        const topStudent = studentsWithMostAbsences[0];

        insights.push(
          `${topStudent.name} has the most recorded absences (${topStudent.absences}). Consider checking in with this student.`
        );
      }
    }

    res.json({
      totalStudents,
      totalRecords,
      present,
      absent,
      late,
      attendanceRate,
      today,
      todayRecords,
      todayPresent,
      todayAbsent,
      todayLate,
      studentsWithMostAbsences,
      insights,
    });
  } catch (error) {
    console.error("AI analysis error:", error);
    res.status(500).json({
      message: "Failed to analyze attendance data.",
    });
  }
});

// ===============================
// AI CHATBOT
// Rule-based assistant; no API key
// ===============================

app.post("/api/ai/chat", async (req, res) => {
  try {
    const question = String(req.body.question || "")
      .trim()
      .toLowerCase();

    if (!question) {
      return res.status(400).json({
        answer: "Please type a question first.",
      });
    }

    const students = await Student.find().sort({ name: 1 });
    const records = await Attendance.find();

    const today = getTodayDate();

    const present = records.filter(
      (record) => record.status === "Present"
    ).length;

    const absent = records.filter(
      (record) => record.status === "Absent"
    ).length;

    const late = records.filter(
      (record) => record.status === "Late"
    ).length;

    const todayRecords = records.filter(
      (record) => record.date === today
    );

    const todayAbsent = todayRecords.filter(
      (record) => record.status === "Absent"
    );

    const absenceCounts = {};

    records
      .filter((record) => record.status === "Absent")
      .forEach((record) => {
        const key = record.studentId;

        if (!absenceCounts[key]) {
          absenceCounts[key] = {
            studentId: record.studentId,
            name: record.name || "Unknown Student",
            absences: 0,
          };
        }

        absenceCounts[key].absences += 1;
      });

    const mostAbsent = Object.values(absenceCounts).sort(
      (a, b) => b.absences - a.absences
    );

    let answer;

    if (
      question.includes("hello") ||
      question.includes("hi") ||
      question.includes("hey")
    ) {
      answer =
        "Hello! I'm your Class Attendance Assistant. Ask me about students, attendance, Present, Absent, Late, or attendance analysis.";
    } else if (
      question.includes("how many students") ||
      question.includes("total students") ||
      question.includes("number of students")
    ) {
      answer = `There are ${students.length} students registered in the system.`;
    } else if (
      question.includes("today") &&
      (question.includes("absent") || question.includes("missing"))
    ) {
      answer =
        todayAbsent.length > 0
          ? `Absent today (${today}): ${todayAbsent
              .map((record) => record.name || record.studentId)
              .join(", ")}.`
          : `There are no Absent records for today (${today}).`;
    } else if (
      question.includes("most absent") ||
      question.includes("frequently absent") ||
      question.includes("many absences")
    ) {
      answer =
        mostAbsent.length > 0
          ? "Students with the most recorded absences: " +
            mostAbsent
              .slice(0, 5)
              .map(
                (student, index) =>
                  `${index + 1}. ${student.name} (${student.absences} absences)`
              )
              .join("; ")
          : "There are no Absent records yet.";
    } else if (
      question.includes("attendance rate") ||
      question.includes("present rate")
    ) {
      const rate =
        records.length > 0
          ? Math.round((present / records.length) * 100)
          : 0;

      answer = `The overall Present rate is ${rate}% (${present} Present records out of ${records.length} total attendance records).`;
    } else if (
      question.includes("how many present") ||
      question.includes("total present") ||
      question.includes("present records")
    ) {
      answer = `There are ${present} Present attendance records.`;
    } else if (
      question.includes("how many absent") ||
      question.includes("total absent") ||
      question.includes("absent records")
    ) {
      answer = `There are ${absent} Absent attendance records.`;
    } else if (
      question.includes("how many late") ||
      question.includes("total late") ||
      question.includes("late records")
    ) {
      answer = `There are ${late} Late attendance records.`;
    } else if (
      question.includes("attendance records") ||
      question.includes("total records")
    ) {
      answer = `There are ${records.length} attendance records in total.`;
    } else if (
      question.includes("list students") ||
      question.includes("show students") ||
      question.includes("student names")
    ) {
      answer =
        students.length > 0
          ? "Registered students: " +
            students
              .map((student) => `${student.name} (${student.studentId})`)
              .join(", ")
          : "No students have been registered yet.";
    } else if (question.includes("help")) {
      answer =
        "Try asking: How many students? How many are Present? How many are Absent? Who is absent today? Who has the most absences? What is the attendance rate?";
    } else {
      answer =
        "I can answer questions about your saved attendance data. Try: 'How many students?', 'How many are absent?', 'Who is absent today?', 'Who has the most absences?', or 'What is the attendance rate?'";
    }

    res.json({ answer });
  } catch (error) {
    console.error("AI chatbot error:", error);
    res.status(500).json({
      answer: "Sorry, I could not process your question. Please try again.",
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
