
import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import API from "../services/api";

function getDateString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getDefaultStartDate() {
  const date = new Date();
  date.setDate(date.getDate() - 29);
  return getDateString(date);
}

function getToday() {
  return getDateString(new Date());
}

export default function Analytics() {
  const today = getToday();

  const [startDate, setStartDate] = useState(getDefaultStartDate);
  const [endDate, setEndDate] = useState(today);

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch analytics whenever the selected date range changes
  useEffect(() => {
    let active = true;

    async function fetchAnalytics() {
      if (!startDate || !endDate || startDate > endDate) {
        setError("Please select a valid date range.");
        setRecords([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await API.get("/attendance", {
          params: {
            startDate,
            endDate,
          },
        });

        if (active) {
          setRecords(response.data);
        }
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              "Unable to load analytics."
          );
          setRecords([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    fetchAnalytics();

    return () => {
      active = false;
    };
  }, [startDate, endDate]);

  const present = records.filter(
    (record) => record.status === "Present"
  ).length;

  const absent = records.filter(
    (record) => record.status === "Absent"
  ).length;

  const total = records.length;

  const attendanceRate =
    total > 0
      ? ((present / total) * 100).toFixed(1)
      : "0.0";

  // Present vs absent chart
  const statusData = [
    { name: "Present", value: present },
    { name: "Absent", value: absent },
  ];

  // Daily attendance chart
  const dailyMap = {};

  records.forEach((record) => {
    if (!dailyMap[record.date]) {
      dailyMap[record.date] = {
        date: record.date,
        Present: 0,
        Absent: 0,
      };
    }

    dailyMap[record.date][record.status]++;
  });

  const dailyData = Object.values(dailyMap).sort(
    (a, b) => a.date.localeCompare(b.date)
  );

  // Student-wise attendance chart
  const studentMap = {};

  records.forEach((record) => {
    if (!record.student) return;

    const id = record.student._id;

    if (!studentMap[id]) {
      studentMap[id] = {
        id,
        name: record.student.name,
        rollNumber: record.student.rollNumber,
        Present: 0,
        Absent: 0,
      };
    }

    studentMap[id][record.status]++;
  });

  const studentData = Object.values(studentMap)
    .map((student) => {
      const studentTotal =
        student.Present + student.Absent;

      return {
        ...student,
        total: studentTotal,
        attendanceRate:
          studentTotal > 0
            ? Number(
                (
                  (student.Present / studentTotal) *
                  100
                ).toFixed(1)
              )
            : 0,
      };
    })
    .sort(
      (a, b) => a.attendanceRate - b.attendanceRate
    );

  const COLORS = ["#16a34a", "#dc2626"];

  return (
    <div className="analytics-module">

      {/* Analytics Header and Date Filters */}
      <section className="panel">
        <div className="analytics-header">
          <div>
            <h2>Attendance Analytics Dashboard</h2>
            <p>
              Monitor attendance patterns and student
              performance for your selected period.
            </p>
          </div>
        </div>

        <div className="analytics-filters">
          <label>
            Start Date
            <input
              type="date"
              value={startDate}
              max={today}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>

          <label>
            End Date
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={today}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>

          <button
            type="button"
            onClick={() => {
              setStartDate(getDefaultStartDate());
              setEndDate(getToday());
            }}
          >
            Last 30 Days
          </button>
        </div>
      </section>

      {error && (
        <section className="panel">
          <p className="error-message">{error}</p>
        </section>
      )}

      {loading ? (
        <section className="panel">
          <p>Loading analytics...</p>
        </section>
      ) : (
        <>
          {/* Statistics */}
          <div className="cards">
            <div className="card">
              <p>Total Attendance Records</p>
              <h2>{total}</h2>
              <small>All recorded attendance</small>
            </div>

            <div className="card">
              <p>Present</p>
              <h2>{present}</h2>
              <small>Present records</small>
            </div>

            <div className="card">
              <p>Absent</p>
              <h2>{absent}</h2>
              <small>Absent records</small>
            </div>

            <div className="card">
              <p>Overall Attendance Rate</p>
              <h2>{attendanceRate}%</h2>
              <small>Present records out of total</small>
            </div>
          </div>

          {/* Present vs Absent */}
          <section className="panel">
            <h2>Attendance Distribution</h2>
            <p>Comparison of present and absent records.</p>

            {total === 0 ? (
              <p>No attendance data available for this period.</p>
            ) : (
              <div style={{ width: "100%", height: 300 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {statusData.map((entry, index) => (
                        <Cell
                          key={entry.name}
                          fill={COLORS[index]}
                        />
                      ))}
                    </Pie>

                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          {/* Daily Attendance */}
          <section className="panel">
            <h2>Daily Attendance Trends</h2>
            <p>Daily comparison of present and absent students.</p>

            {dailyData.length === 0 ? (
              <p>No daily attendance data available.</p>
            ) : (
              <div style={{ width: "100%", height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />

                    <Bar
                      dataKey="Present"
                      fill="#16a34a"
                    />

                    <Bar
                      dataKey="Absent"
                      fill="#dc2626"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          {/* Student Performance */}
          <section className="panel">
            <h2>Student Attendance Performance</h2>
            <p>Compare attendance records for each student.</p>

            {studentData.length === 0 ? (
              <p>No student attendance data available.</p>
            ) : (
              <>
                <div style={{ width: "100%", height: 320 }}>
                  <ResponsiveContainer>
                    <BarChart data={studentData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />

                      <Bar
                        dataKey="Present"
                        fill="#16a34a"
                      />

                      <Bar
                        dataKey="Absent"
                        fill="#dc2626"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <h3>Student-wise Attendance Summary</h3>
                <p>
                  Students are ordered from the lowest
                  to the highest attendance rate.
                </p>

                <div className="table-wrapper analytics-summary-table">
  <table>
    <thead>
      <tr>
        <th>Student</th>
        <th>Roll Number</th>
        <th>Present</th>
        <th>Absent</th>
        <th>Total</th>
        <th>Attendance Rate</th>
      </tr>
    </thead>

    <tbody>
      {studentData.map((student) => (
        <tr key={student.name}>
          <td className="student-name">{student.name}</td>
          <td>{student.rollNumber || "—"}</td>
          <td>{student.Present}</td>
          <td>{student.Absent}</td>
          <td>{student.Present + student.Absent}</td>
          <td>
            <span
              className={`attendance-rate ${
                student.attendanceRate >= 75
                  ? "rate-good"
                  : "rate-low"
              }`}
            >
              {student.attendanceRate}%
            </span>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
