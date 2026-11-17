
import { useEffect, useState } from "react";
import API from "../services/api";
import "./Attendance.css";

function getToday() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function Attendance() {
  const [date, setDate] = useState(getToday);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Load students and saved attendance for the selected date
  useEffect(() => {
    let active = true;

    async function loadAttendance() {
      setLoading(true);
      setError("");
      setMessage("");

      try {
        const [studentResponse, attendanceResponse] =
          await Promise.all([
            API.get("/students"),
            API.get("/attendance", {
              params: { date },
            }),
          ]);

        if (!active) return;

        setStudents(studentResponse.data);

        const savedAttendance = {};

        attendanceResponse.data.forEach((record) => {
          if (record.student?._id) {
            savedAttendance[record.student._id] = record.status;
          }
        });

        setAttendance(savedAttendance);
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              "Failed to load attendance."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadAttendance();

    return () => {
      active = false;
    };
  }, [date]);

  // Change student attendance status
  const handleStatusChange = (studentId, status) => {
    setAttendance((previous) => ({
      ...previous,
      [studentId]: status,
    }));
  };

  // Save attendance records
  const saveAttendance = async () => {
    if (students.length === 0) {
      setError("No students available to mark attendance.");
      return;
    }

    const unmarkedStudents = students.filter(
      (student) => !attendance[student._id]
    );

    if (unmarkedStudents.length > 0) {
      setError(
        `Please mark attendance for all students. ${unmarkedStudents.length} student(s) are unmarked.`
      );
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      await Promise.all(
        students.map((student) =>
          API.post("/attendance/mark", {
            studentId: student._id,
            date,
            status: attendance[student._id],
          })
        )
      );

      setMessage("Attendance saved successfully!");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to save attendance."
      );
    } finally {
      setSaving(false);
    }
  };

  const presentCount = students.filter(
    (student) => attendance[student._id] === "Present"
  ).length;

  const absentCount = students.filter(
    (student) => attendance[student._id] === "Absent"
  ).length;

  return (
    <div className="attendance-module">
      <section className="panel">
        <h2>Mark Student Attendance</h2>

        <div className="attendance-date">
          <label htmlFor="attendance-date">
            Select Attendance Date:
          </label>

          <input
            id="attendance-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            max={getToday()}
          />
        </div>
      </section>

      <div className="cards">
        <div className="card">
          <p>Total Students</p>
          <h2>{students.length}</h2>
        </div>

        <div className="card">
          <p>Present</p>
          <h2>{presentCount}</h2>
        </div>

        <div className="card">
          <p>Absent</p>
          <h2>{absentCount}</h2>
        </div>

        <div className="card">
          <p>Unmarked</p>
          <h2>
            {students.length - presentCount - absentCount}
          </h2>
        </div>
      </div>

      <section className="panel">
        <h2>Student Attendance List</h2>

        {error && (
          <p className="error-message">{error}</p>
        )}

        {message && (
          <p className="success-message">{message}</p>
        )}

        {loading ? (
          <p>Loading attendance...</p>
        ) : students.length === 0 ? (
          <p>No students registered. Add students first.</p>
        ) : (
          <>
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Roll Number</th>
                    <th>Course</th>
                    <th>Attendance Status</th>
                  </tr>
                </thead>

                <tbody>
                  {students.map((student) => (
                    <tr key={student._id}>
                      <td>{student.name}</td>
                      <td>{student.rollNumber}</td>
                      <td>{student.course}</td>

                      <td>
                        
<select
  className={`attendance-status-select ${
    attendance[student._id]?.toLowerCase() || "unmarked"
  }`}
  value={attendance[student._id] || ""}
  onChange={(e) =>
    handleStatusChange(student._id, e.target.value)
  }
>
  <option value="">Select Status</option>
  <option value="Present">Present</option>
  <option value="Absent">Absent</option>
</select>

                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={saveAttendance}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save Attendance"}
            </button>
          </>
        )}
      </section>
    </div>
  );
}
