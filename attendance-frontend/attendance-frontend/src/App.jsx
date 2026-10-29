
import { useEffect, useState } from "react";
import "./App.css";

const API = "";

function App() {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState("Dashboard");
  const [dashboardFilter, setDashboardFilter] = useState("All");

  const [showStudentForm, setShowStudentForm] = useState(false);
  const [studentId, setStudentId] = useState("");
  const [name, setName] = useState("");
  const [course, setCourse] = useState("");
  const [year, setYear] = useState("");
  const [savingStudent, setSavingStudent] = useState(false);
  const [deletingStudentId, setDeletingStudentId] = useState(null);

  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  const [attendanceStudentId, setAttendanceStudentId] = useState("");
  const [attendanceDate, setAttendanceDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [attendanceStatus, setAttendanceStatus] = useState("Present");
  const [savingAttendance, setSavingAttendance] = useState(false);

  const [editingAttendanceId, setEditingAttendanceId] = useState(null);
  const [editAttendanceStatus, setEditAttendanceStatus] = useState("Present");
  const [savingEdit, setSavingEdit] = useState(false);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  const [aiQuestion, setAiQuestion] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiError, setAiError] = useState("");

  const loadData = async () => {
    try {
      const studentsResponse = await fetch(`${API}/api/students`);
      if (!studentsResponse.ok) throw new Error("Failed to load students");
      setStudents(await studentsResponse.json());

      const attendanceResponse = await fetch(`${API}/api/attendance`);
      if (!attendanceResponse.ok) throw new Error("Failed to load attendance");
      setAttendance(await attendanceResponse.json());
    } catch (error) {
      console.error("Loading error:", error);
    }
  };

  const loadAIAnalysis = async () => {
    try {
      setAiError("");
      const response = await fetch(`${API}/api/ai/analysis`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load analysis.");
      }

      setAiAnalysis(data);
    } catch (error) {
      setAiError(error.message || "Could not connect to the server.");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (page === "AI Assistant") {
      loadAIAnalysis();
    }
  }, [page]);

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  const openDashboardList = (filter) => {
    setDashboardFilter(filter);
    setPage("Dashboard List");
    setSearch("");
    setMessage("");
  };

  const addStudent = async (e) => {
    e.preventDefault();
    setSavingStudent(true);
    setMessage("");

    try {
      const response = await fetch(`${API}/api/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, name, course, year }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to add student.");

      setStudentId("");
      setName("");
      setCourse("");
      setYear("");
      setShowStudentForm(false);
      showMessage("Student added successfully!");
      await loadData();
    } catch (error) {
      showMessage(error.message || "Could not connect to the server.", "error");
    } finally {
      setSavingStudent(false);
    }
  };

  const deleteStudent = async (student) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${student.name} (${student.studentId})?`
    );
    if (!confirmed) return;

    setDeletingStudentId(student._id);
    setMessage("");

    try {
      const response = await fetch(`${API}/api/students/${student._id}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Failed to delete student.");

      showMessage("Student deleted successfully!");
      await loadData();
    } catch (error) {
      showMessage(error.message || "Could not delete student.", "error");
    } finally {
      setDeletingStudentId(null);
    }
  };

  const addAttendance = async (e) => {
    e.preventDefault();
    setSavingAttendance(true);
    setMessage("");

    try {
      const selectedStudent = students.find(
        (student) => student.studentId === attendanceStudentId
      );

      if (!selectedStudent) throw new Error("Please select a valid student.");

      const response = await fetch(`${API}/api/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: attendanceStudentId,
          name: selectedStudent.name,
          date: attendanceDate,
          status: attendanceStatus,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to save attendance.");

      setAttendanceStudentId("");
      setAttendanceDate(new Date().toISOString().slice(0, 10));
      setAttendanceStatus("Present");
      setShowAttendanceForm(false);
      showMessage("Attendance saved successfully!");
      await loadData();
    } catch (error) {
      showMessage(error.message || "Could not connect to the server.", "error");
    } finally {
      setSavingAttendance(false);
    }
  };

  const startEditAttendance = (item) => {
    setEditingAttendanceId(item._id);
    setEditAttendanceStatus(item.status);
    setMessage("");
  };

  const cancelEditAttendance = () => {
    setEditingAttendanceId(null);
    setEditAttendanceStatus("Present");
  };

  const saveAttendanceEdit = async (id) => {
    setSavingEdit(true);
    setMessage("");

    try {
      const response = await fetch(`${API}/api/attendance/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: editAttendanceStatus }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Failed to update attendance.");

      setEditingAttendanceId(null);
      showMessage("Attendance updated successfully!");
      await loadData();
    } catch (error) {
      showMessage(error.message || "Could not update attendance.", "error");
    } finally {
      setSavingEdit(false);
    }
  };

  const askAI = async (e, questionText) => {
    if (e) e.preventDefault();

    const question = (questionText || aiQuestion).trim();
    if (!question || aiLoading) return;

    setAiQuestion(question);
    setAiLoading(true);
    setAiAnswer("");
    setAiError("");

    try {
      const response = await fetch(`${API}/api/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.answer || "Could not get an answer.");
      }

      setAiAnswer(data.answer);
    } catch (error) {
      setAiError(error.message || "Could not connect to the backend.");
    } finally {
      setAiLoading(false);
    }
  };

  const filteredStudents = students.filter((student) =>
    `${student.name || ""} ${student.studentId || ""} ${student.course || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const filteredAttendance = attendance.filter((item) => {
    const matchesStatus =
      dashboardFilter === "All" ||
      item.status?.toLowerCase() === dashboardFilter.toLowerCase();

    const matchesSearch =
      `${item.name || ""} ${item.studentId || ""} ${item.date || ""} ${item.status || ""}`
        .toLowerCase()
        .includes(search.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const presentCount = attendance.filter(
    (item) => item.status?.toLowerCase() === "present"
  ).length;

  const absentCount = attendance.filter(
    (item) => item.status?.toLowerCase() === "absent"
  ).length;

  const lateCount = attendance.filter(
    (item) => item.status?.toLowerCase() === "late"
  ).length;

  const menu = [
    { name: "Dashboard", icon: "▦" },
    { name: "Students", icon: "♙" },
    { name: "Attendance", icon: "☑" },
    { name: "AI Assistant", icon: "✦" },
  ];

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">CA</div>
          <div>
            <h2>ClassAttend</h2>
            <span>MANAGEMENT SYSTEM</span>
          </div>
        </div>

        <p className="menu-label">MAIN MENU</p>

        <nav>
          {menu.map((item) => (
            <button
              key={item.name}
              className={`menu-item ${
                page === item.name ||
                (page === "Dashboard List" && item.name === "Dashboard")
                  ? "selected"
                  : ""
              }`}
              onClick={() => {
                setPage(item.name);
                setMessage("");
                setSearch("");
              }}
            >
              <span className="menu-icon">{item.icon}</span>
              {item.name}
              {(page === item.name ||
                (page === "Dashboard List" && item.name === "Dashboard")) && (
                <span className="menu-arrow">›</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="profile-avatar">T</div>
          <div>
            <strong>Teacher</strong>
            <span>Administrator</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <p className="breadcrumb">
              Pages / {page === "Dashboard List" ? "Dashboard / Records" : page}
            </p>
            <h1>
              {page === "Dashboard List"
                ? dashboardFilter === "Students"
                  ? "All Students"
                  : dashboardFilter === "All"
                  ? "All Attendance Records"
                  : `${dashboardFilter} Records`
                : page}
            </h1>
          </div>
          <div className="topbar-right">
            <span className="online-dot"></span>
            <span>System Online</span>
            <div className="top-avatar">T</div>
          </div>
        </header>

        {page !== "Dashboard List" && page !== "AI Assistant" && (
          <section className="welcome-banner">
            <div>
              <p className="banner-tag">STUDENT MANAGEMENT PORTAL</p>
              <h2>Welcome back, Teacher! 👋</h2>
              <p>
                Manage your students and monitor classroom attendance in one place.
              </p>
            </div>
            <div className="banner-art">📚</div>
          </section>
        )}

        {page === "Dashboard" && (
          <section className="stats-grid">
            <button className="stat-card clickable-stat" onClick={() => openDashboardList("Students")}>
              <div className="stat-top"><span>Total Students</span><div className="stat-icon blue">♙</div></div>
              <h2>{students.length}</h2>
              <p>Click to view all students →</p>
            </button>

            <button className="stat-card clickable-stat" onClick={() => openDashboardList("All")}>
              <div className="stat-top"><span>Attendance Records</span><div className="stat-icon green">✓</div></div>
              <h2>{attendance.length}</h2>
              <p>Click to view all records →</p>
            </button>

            <button className="stat-card clickable-stat" onClick={() => openDashboardList("Present")}>
              <div className="stat-top"><span>Present</span><div className="stat-icon purple">◷</div></div>
              <h2>{presentCount}</h2>
              <p>Click to view present records →</p>
            </button>

            <button className="stat-card clickable-stat" onClick={() => openDashboardList("Absent")}>
              <div className="stat-top"><span>Absent</span><div className="stat-icon orange">!</div></div>
              <h2>{absentCount}</h2>
              <p>Click to view absent records →</p>
            </button>

            <button className="stat-card clickable-stat" onClick={() => openDashboardList("Late")}>
              <div className="stat-top"><span>Late</span><div className="stat-icon orange">◷</div></div>
              <h2>{lateCount}</h2>
              <p>Click to view late records →</p>
            </button>
          </section>
        )}

        {message && (
          <p className={`form-message ${messageType === "error" ? "error-message" : ""}`}>
            {message}
          </p>
        )}

        {page === "Dashboard" && (
          <section className="panel">
            <div className="panel-heading">
              <div><h2>Recent Students</h2><p>Overview of your registered students</p></div>
              <button className="secondary-button" onClick={() => { setPage("Students"); setSearch(""); }}>
                View all →
              </button>
            </div>
            <StudentTable
              students={students.slice(0, 5)}
              onDeleteStudent={deleteStudent}
              deletingStudentId={deletingStudentId}
            />
          </section>
        )}

        {page === "Dashboard List" && (
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h2>
                  {dashboardFilter === "Students"
                    ? "All Students"
                    : dashboardFilter === "All"
                    ? "All Attendance Records"
                    : `${dashboardFilter} Attendance Records`}
                </h2>
                <p>
                  {dashboardFilter === "Students"
                    ? `${filteredStudents.length} students found`
                    : `${filteredAttendance.length} attendance records found`}
                </p>
              </div>
              <button className="secondary-button" onClick={() => { setPage("Dashboard"); setSearch(""); }}>
                ← Back to Dashboard
              </button>
            </div>

            <input
              className="search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search records..."
            />

            {dashboardFilter === "Students" ? (
              <StudentTable
                students={filteredStudents}
                onDeleteStudent={deleteStudent}
                deletingStudentId={deletingStudentId}
              />
            ) : (
              <AttendanceTable
                attendance={filteredAttendance}
                editingAttendanceId={editingAttendanceId}
                editAttendanceStatus={editAttendanceStatus}
                setEditAttendanceStatus={setEditAttendanceStatus}
                startEditAttendance={startEditAttendance}
                cancelEditAttendance={cancelEditAttendance}
                saveAttendanceEdit={saveAttendanceEdit}
                savingEdit={savingEdit}
              />
            )}
          </section>
        )}

        {page === "Students" && (
          <section className="panel">
            <div className="panel-heading">
              <div><h2>Student Directory</h2><p>Add, search, view, and delete student information</p></div>
              <button className="primary-button" onClick={() => { setShowStudentForm(!showStudentForm); setMessage(""); }}>
                {showStudentForm ? "Cancel" : "+ Add Student"}
              </button>
            </div>

            {showStudentForm && (
              <form className="student-form" onSubmit={addStudent}>
                <h3>Add New Student</h3>
                <label>Student ID</label>
                <input value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="Enter student ID" required />
                <label>Student Name</label>
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter full name" required />
                <label>Course</label>
                <input value={course} onChange={(e) => setCourse(e.target.value)} placeholder="e.g. BSIT" required />
                <label>Year Level</label>
                <select value={year} onChange={(e) => setYear(e.target.value)} required>
                  <option value="">Select year level</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
                <button type="submit" className="primary-button" disabled={savingStudent}>
                  {savingStudent ? "Saving..." : "Save Student"}
                </button>
              </form>
            )}

            <input
              className="search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="⌕ Search by student name or ID..."
            />

            <StudentTable
              students={filteredStudents}
              onDeleteStudent={deleteStudent}
              deletingStudentId={deletingStudentId}
            />
          </section>
        )}

        {page === "Attendance" && (
          <section className="panel">
            <div className="panel-heading">
              <div><h2>Attendance Records</h2><p>Record, review, and edit classroom attendance</p></div>
              <button className="primary-button" onClick={() => { setShowAttendanceForm(!showAttendanceForm); setMessage(""); }}>
                {showAttendanceForm ? "Cancel" : "+ Record Attendance"}
              </button>
            </div>

            {showAttendanceForm && (
              <form className="student-form" onSubmit={addAttendance}>
                <h3>Record Student Attendance</h3>
                <label>Select Student</label>
                <select value={attendanceStudentId} onChange={(e) => setAttendanceStudentId(e.target.value)} required>
                  <option value="">Choose a student</option>
                  {students.map((student) => (
                    <option key={student._id} value={student.studentId}>
                      {student.studentId} - {student.name}
                    </option>
                  ))}
                </select>
                {students.length === 0 && <p>No students registered yet. Add a student first.</p>}
                <label>Date</label>
                <input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)} required />
                <label>Attendance Status</label>
                <select value={attendanceStatus} onChange={(e) => setAttendanceStatus(e.target.value)} required>
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="Late">Late</option>
                </select>
                <button type="submit" className="primary-button" disabled={savingAttendance || students.length === 0}>
                  {savingAttendance ? "Saving..." : "Save Attendance"}
                </button>
              </form>
            )}

            <div className="panel-heading attendance-count">
              <h3>Saved Attendance</h3>
              <span className="record-count">{attendance.length} records</span>
            </div>

            <AttendanceTable
              attendance={attendance}
              editingAttendanceId={editingAttendanceId}
              editAttendanceStatus={editAttendanceStatus}
              setEditAttendanceStatus={setEditAttendanceStatus}
              startEditAttendance={startEditAttendance}
              cancelEditAttendance={cancelEditAttendance}
              saveAttendanceEdit={saveAttendanceEdit}
              savingEdit={savingEdit}
            />
          </section>
        )}

        {page === "AI Assistant" && (
          <section className="ai-page">
            <div className="ai-intro">
              <div className="ai-large-icon">✦</div>
              <div>
                <p className="banner-tag">SMART CLASSROOM TOOLS</p>
                <h2>ClassAttend AI Assistant</h2>
                <p>Ask questions about saved attendance data and review attendance insights.</p>
                <span className="local-ai-label">Local assistant · No API key required</span>
              </div>
            </div>

            <section className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Smart Attendance Analysis</h2>
                  <p>Summary calculated from your database records</p>
                </div>
                <button className="secondary-button" onClick={loadAIAnalysis}>↻ Refresh</button>
              </div>

              {aiError && <p className="form-message error-message">{aiError}</p>}

              {aiAnalysis ? (
                <>
                  <div className="ai-stats-grid">
                    <div className="ai-stat"><span>Total Students</span><strong>{aiAnalysis.totalStudents}</strong></div>
                    <div className="ai-stat"><span>Total Records</span><strong>{aiAnalysis.totalRecords}</strong></div>
                    <div className="ai-stat"><span>Present</span><strong>{aiAnalysis.present}</strong></div>
                    <div className="ai-stat"><span>Absent</span><strong>{aiAnalysis.absent}</strong></div>
                    <div className="ai-stat"><span>Late</span><strong>{aiAnalysis.late}</strong></div>
                    <div className="ai-stat"><span>Present Rate</span><strong>{aiAnalysis.attendanceRate}%</strong></div>
                  </div>

                  <div className="today-summary">
                    <h3>Today's Records ({aiAnalysis.today.date})</h3>
                    <p>
                      Present: <strong>{aiAnalysis.today.present}</strong>
                      {" · "}Absent: <strong>{aiAnalysis.today.absent}</strong>
                      {" · "}Late: <strong>{aiAnalysis.today.late}</strong>
                    </p>
                    <p>Total attendance records today: {aiAnalysis.today.totalRecords}</p>
                  </div>

                  <div className="absence-list">
                    <h3>Students with the Most Absent Records</h3>
                    {aiAnalysis.studentsWithMostAbsences.length === 0 ? (
                      <p className="empty-state">No absent records found.</p>
                    ) : (
                      <div className="table-wrap">
                        <table>
                          <thead><tr><th>STUDENT ID</th><th>STUDENT NAME</th><th>ABSENT COUNT</th></tr></thead>
                          <tbody>
                            {aiAnalysis.studentsWithMostAbsences.map((student) => (
                              <tr key={student.studentId}>
                                <td>{student.studentId}</td>
                                <td>{student.name}</td>
                                <td>{student.absences}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                !aiError && <p className="empty-state">Loading attendance analysis...</p>
              )}
            </section>

            <section className="panel chatbot-panel">
              <div className="panel-heading">
                <div>
                  <h2>Ask the Attendance Assistant</h2>
                  <p>Answers are based on records stored in your database.</p>
                </div>
                <div className="chatbot-icon">✦</div>
              </div>

              <div className="quick-questions">
                <p>Try asking:</p>
                {[
                  "How many students are registered?",
                  "How many students are absent?",
                  "Who is absent today?",
                  "How many students are late?",
                  "What is the attendance rate?",
                  "Which students have the most absences?",
                ].map((question) => (
                  <button
                    type="button"
                    key={question}
                    className="question-chip"
                    onClick={() => askAI(null, question)}
                    disabled={aiLoading}
                  >
                    {question}
                  </button>
                ))}
              </div>

              <form className="ai-chat-form" onSubmit={askAI}>
                <input
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  placeholder="Ask a question about attendance..."
                  aria-label="Ask the attendance assistant"
                />
                <button className="primary-button" type="submit" disabled={aiLoading || !aiQuestion.trim()}>
                  {aiLoading ? "Thinking..." : "Ask"}
                </button>
              </form>

              {aiLoading && <p className="ai-thinking">Checking your attendance records...</p>}

              {aiAnswer && (
                <div className="ai-answer">
                  <strong>✦ Assistant</strong>
                  <p>{aiAnswer}</p>
                </div>
              )}

              {aiError && <p className="form-message error-message">{aiError}</p>}
            </section>
          </section>
        )}

        <footer>ClassAttend © 2026 · Class Attendance Management System</footer>
      </main>
    </div>
  );
}

function StudentTable({ students, onDeleteStudent, deletingStudentId }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>STUDENT ID</th>
            <th>STUDENT NAME</th>
            <th>COURSE</th>
            <th>YEAR LEVEL</th>
            <th>ACTION</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student._id}>
              <td><span className="student-id">{student.studentId || "N/A"}</span></td>
              <td>
                <div className="student-name">
                  <div className="student-avatar">{(student.name || "S").charAt(0).toUpperCase()}</div>
                  <strong>{student.name || "Unnamed Student"}</strong>
                </div>
              </td>
              <td>{student.course || "N/A"}</td>
              <td>{student.year || "N/A"}</td>
              <td>
                <button
                  type="button"
                  className="delete-button"
                  disabled={deletingStudentId === student._id}
                  onClick={() => onDeleteStudent(student)}
                >
                  {deletingStudentId === student._id ? "Deleting..." : "Delete"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {students.length === 0 && <p className="empty-state">No students found.</p>}
    </div>
  );
}

function AttendanceTable({
  attendance,
  editingAttendanceId,
  editAttendanceStatus,
  setEditAttendanceStatus,
  startEditAttendance,
  cancelEditAttendance,
  saveAttendanceEdit,
  savingEdit,
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>STUDENT ID</th>
            <th>STUDENT NAME</th>
            <th>DATE</th>
            <th>STATUS</th>
            <th>ACTION</th>
          </tr>
        </thead>
        <tbody>
          {attendance.map((item) => (
            <tr key={item._id}>
              <td>{item.studentId}</td>
              <td>{item.name}</td>
              <td>{item.date}</td>
              <td>
                {editingAttendanceId === item._id ? (
                  <select value={editAttendanceStatus} onChange={(e) => setEditAttendanceStatus(e.target.value)}>
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                    <option value="Late">Late</option>
                  </select>
                ) : (
                  <span className={`status-badge ${item.status?.toLowerCase() || ""}`}>
                    {item.status}
                  </span>
                )}
              </td>
              <td>
                {editingAttendanceId === item._id ? (
                  <div className="attendance-actions">
                    <button type="button" className="primary-button" disabled={savingEdit} onClick={() => saveAttendanceEdit(item._id)}>
                      {savingEdit ? "Saving..." : "Save"}
                    </button>
                    <button type="button" className="secondary-button" disabled={savingEdit} onClick={cancelEditAttendance}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button type="button" className="primary-button" onClick={() => startEditAttendance(item)}>
                    Edit
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {attendance.length === 0 && <p className="empty-state">No attendance records found.</p>}
    </div>
  );
}

export default App;
