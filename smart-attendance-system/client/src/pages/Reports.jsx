
import { useEffect, useState } from "react";
import API from "../services/api";

// Get today's date in local time
function getToday() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function Reports() {
  const today = getToday();

  const [startDate, setStartDate] = useState("2026-11-01");
  const [endDate, setEndDate] = useState(today);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch attendance records
  async function getReports(start, end) {
    const response = await API.get("/attendance", {
      params: {
        startDate: start,
        endDate: end,
      },
    });

    return response.data;
  }

  // Load reports whenever the date range changes
  useEffect(() => {
    let ignore = false;

    async function loadReports() {
      try {
        setLoading(true);
        setError("");

        const data = await getReports(startDate, endDate);

        if (!ignore) {
          setRecords(data);
        }
      } catch (err) {
        if (!ignore) {
          setRecords([]);
          setError(
            err.response?.data?.message ||
              "Failed to retrieve reports."
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadReports();

    return () => {
      ignore = true;
    };
  }, [startDate, endDate]);

  // Generate report manually
  const fetchReports = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getReports(startDate, endDate);
      setRecords(data);
    } catch (err) {
      setRecords([]);
      setError(
        err.response?.data?.message ||
          "Failed to retrieve reports."
      );
    } finally {
      setLoading(false);
    }
  };

  // Attendance statistics
  const present = records.filter(
    (record) => record.status === "Present"
  ).length;

  const absent = records.filter(
    (record) => record.status === "Absent"
  ).length;

  const total = records.length;

  const percentage =
    total > 0
      ? ((present / total) * 100).toFixed(1)
      : "0.0";

  // Group attendance by student
  const studentReports = Object.values(
    records.reduce((result, record) => {
      if (!record.student?._id) return result;

      const id = record.student._id;

      if (!result[id]) {
        result[id] = {
          ...record.student,
          present: 0,
          absent: 0,
        };
      }

      if (record.status === "Present") {
        result[id].present++;
      } else if (record.status === "Absent") {
        result[id].absent++;
      }

      return result;
    }, {})
  );

  // Export attendance records to CSV
  const exportCSV = () => {
    const headers = [
      "Date",
      "Student Name",
      "Roll Number",
      "Course",
      "Status",
    ];

    const rows = records.map((record) => [
      record.date,
      record.student?.name || "",
      record.student?.rollNumber || "",
      record.student?.course || "",
      record.status,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((value) =>
            `"${String(value).replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "attendance-report.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  // Determine attendance percentage badge
  const getPercentageClass = (rate) => {
    if (rate >= 75) return "present";
    if (rate >= 50) return "warning";
    return "absent";
  };

  return (
    <div className="reports-module">
      {/* Date Filters */}
      <section className="panel">
        <h2>Attendance Reports</h2>

        <div className="report-filters">
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
              max={today}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>

          <button
            type="button"
            onClick={fetchReports}
            disabled={loading}
          >
            {loading ? "Loading..." : "Generate Report"}
          </button>

          <button
            type="button"
            onClick={exportCSV}
            disabled={records.length === 0 || loading}
          >
            Export CSV
          </button>
        </div>

        {error && (
          <p className="error-message">{error}</p>
        )}
      </section>

      {/* Statistics Cards */}
      <div className="cards">
        <div className="card">
          <p>Total Records</p>
          <h2>{total}</h2>
        </div>

        <div className="card">
          <p>Present</p>
          <h2>{present}</h2>
        </div>

        <div className="card">
          <p>Absent</p>
          <h2>{absent}</h2>
        </div>

        <div className="card">
          <p>Attendance Rate</p>
          <h2>{percentage}%</h2>
        </div>
      </div>

      {/* Attendance Records */}
      <section className="panel">
        <h2>Attendance Records</h2>

        {loading ? (
          <p>Loading reports...</p>
        ) : records.length === 0 ? (
          <p>No attendance records found for this period.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Student</th>
                  <th>Roll Number</th>
                  <th>Course</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {records.map((record) => (
                  <tr key={record._id}>
                    <td>{record.date}</td>
                    <td>{record.student?.name || "N/A"}</td>
                    <td>
                      {record.student?.rollNumber || "N/A"}
                    </td>
                    <td>{record.student?.course || "N/A"}</td>
                    <td>
                      <span
                        className={`attendance-badge ${
                          record.status === "Present"
                            ? "present"
                            : "absent"
                        }`}
                      >
                        {record.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Student-wise Attendance Summary */}
      <section className="panel">
        <h2>Student-wise Attendance Summary</h2>

        {loading ? (
          <p>Loading student summary...</p>
        ) : studentReports.length === 0 ? (
          <p>No student attendance summary available.</p>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Roll Number</th>
                  <th>Present</th>
                  <th>Absent</th>
                  <th>Attendance %</th>
                </tr>
              </thead>

              <tbody>
                {studentReports.map((student) => {
                  const count =
                    student.present + student.absent;

                  const rate = count
                    ? Number(
                        (
                          (student.present / count) *
                          100
                        ).toFixed(1)
                      )
                    : 0;

                  return (
                    <tr key={student._id}>
                      <td>{student.name}</td>
                      <td>{student.rollNumber}</td>
                      <td>{student.present}</td>
                      <td>{student.absent}</td>
                      <td>
                        <span
                          className={`attendance-badge ${getPercentageClass(
                            rate
                          )}`}
                        >
                          {rate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
