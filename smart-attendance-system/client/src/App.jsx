
import { useState, useEffect, useMemo } from "react";
import "./App.css";

import API from "./services/api";
import Login from "./pages/Login";
import Students from "./pages/Students";
import Attendance from "./pages/Attendance";
import Reports from "./pages/Reports";
import Analytics from "./pages/Analytics";
import AdminManagement from "./pages/AdminManagement";

function getLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateString) {
  if (!dateString) return "—";

  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });
}

function getStudentName(record) {
  if (record.student && typeof record.student === "object") {
    return (
      record.student.name ||
      record.student.rollNumber ||
      "Student"
    );
  }

  return "Student";
}

export default function App() {
  const [admin, setAdmin] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activePage, setActivePage] = useState("Dashboard");

  const [dashboardStats, setDashboardStats] = useState({
    totalStudents: 0,
    present: 0,
    absent: 0,
    attendanceRate: 0,
  });

  const [weeklyRecords, setWeeklyRecords] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [dashboardError, setDashboardError] = useState("");

  // Role-based navigation
  const menu =
    admin?.role === "super_admin"
      ? [
          "Dashboard",
          "Students",
          "Attendance",
          "Reports",
          "Analytics",
          "Admin Management",
        ]
      : admin?.role === "admin"
        ? [
            "Dashboard",
            "Students",
            "Attendance",
            "Reports",
            "Analytics",
          ]
        : [
            "Dashboard",
            "Students",
            "Attendance",
          ];

  // Validate existing login session
  useEffect(() => {
    let isMounted = true;

    async function checkAuthentication() {
      const token = localStorage.getItem("token");
      const savedAdmin = localStorage.getItem("admin");

      if (!token || !savedAdmin) {
        localStorage.removeItem("token");
        localStorage.removeItem("admin");

        if (isMounted) {
          setAdmin(null);
          setAuthLoading(false);
        }

        return;
      }

      try {
        const parsedAdmin = JSON.parse(savedAdmin);

        await API.get("/students");

        if (isMounted) {
          setAdmin(parsedAdmin);
        }
      } catch (error) {
        if (error.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("admin");

          if (isMounted) {
            setAdmin(null);
          }
        } else {
          try {
            if (isMounted) {
              setAdmin(JSON.parse(savedAdmin));
            }
          } catch {
            localStorage.removeItem("token");
            localStorage.removeItem("admin");
          }
        }
      } finally {
        if (isMounted) {
          setAuthLoading(false);
        }
      }
    }

    checkAuthentication();

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch dashboard data
  useEffect(() => {
    if (!admin || activePage !== "Dashboard") return;

    let isMounted = true;

    async function fetchDashboardData() {
      setDashboardLoading(true);
      setDashboardError("");

      try {
        const today = new Date();
        const todayString = getLocalDate(today);

        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - 6);

        const startDate = getLocalDate(weekStart);

        const [
          studentsResponse,
          todayAttendanceResponse,
          weeklyAttendanceResponse,
        ] = await Promise.all([
          API.get("/students"),
          API.get("/attendance", {
            params: { date: todayString },
          }),
          API.get("/attendance", {
            params: {
              startDate,
              endDate: todayString,
            },
          }),
        ]);

        const students = Array.isArray(studentsResponse.data)
          ? studentsResponse.data
          : [];

        const todayRecords = Array.isArray(
          todayAttendanceResponse.data
        )
          ? todayAttendanceResponse.data
          : [];

        const weekRecords = Array.isArray(
          weeklyAttendanceResponse.data
        )
          ? weeklyAttendanceResponse.data
          : [];

        const present = todayRecords.filter(
          (record) => record.status === "Present"
        ).length;

        const absent = todayRecords.filter(
          (record) => record.status === "Absent"
        ).length;

        const marked = present + absent;

        if (!isMounted) return;

        setDashboardStats({
          totalStudents: students.length,
          present,
          absent,
          attendanceRate:
            marked > 0
              ? Number(((present / marked) * 100).toFixed(1))
              : 0,
        });

        setWeeklyRecords(weekRecords);

        setRecentActivity(
          [...weekRecords]
            .sort((a, b) => {
              const dateDifference =
                new Date(b.date) - new Date(a.date);

              if (dateDifference !== 0) {
                return dateDifference;
              }

              return (
                new Date(b.updatedAt || b.createdAt || 0) -
                new Date(a.updatedAt || a.createdAt || 0)
              );
            })
            .slice(0, 6)
        );
      } catch (error) {
        console.error("Dashboard error:", error);

        if (isMounted) {
          setDashboardError(
            error.response?.data?.message ||
              "Unable to load all dashboard information."
          );
        }
      } finally {
        if (isMounted) {
          setDashboardLoading(false);
        }
      }
    }

    fetchDashboardData();

    return () => {
      isMounted = false;
    };
  }, [activePage, admin]);

  // Calculate seven-day attendance trend
  const weeklySummary = useMemo(() => {
    const days = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      const dateString = getLocalDate(date);

      const records = weeklyRecords.filter(
        (record) => record.date === dateString
      );

      const present = records.filter(
        (record) => record.status === "Present"
      ).length;

      const absent = records.filter(
        (record) => record.status === "Absent"
      ).length;

      days.push({
        date: dateString,
        day: date.toLocaleDateString("en-IN", {
          weekday: "short",
        }),
        present,
        absent,
        total: present + absent,
      });
    }

    return days;
  }, [weeklyRecords]);

  const weeklyPresent = weeklySummary.reduce(
    (total, day) => total + day.present,
    0
  );

  const weeklyAbsent = weeklySummary.reduce(
    (total, day) => total + day.absent,
    0
  );

  const weeklyMarked = weeklyPresent + weeklyAbsent;

  const weeklyRate =
    weeklyMarked > 0
      ? ((weeklyPresent / weeklyMarked) * 100).toFixed(1)
      : "0.0";

  const maximumAttendance = Math.max(
    1,
    ...weeklySummary.map((day) => day.total)
  );

  // Handle successful login
  const handleLoginSuccess = (adminData) => {
    setAdmin(adminData);
    setActivePage("Dashboard");
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("admin");

    setAdmin(null);
    setActivePage("Dashboard");

    setDashboardStats({
      totalStudents: 0,
      present: 0,
      absent: 0,
      attendanceRate: 0,
    });

    setWeeklyRecords([]);
    setRecentActivity([]);
  };

  // Loading screen
  if (authLoading) {
    return (
      <div className="login-container">
        <h2>Checking authentication...</h2>
      </div>
    );
  }

  // Login screen
  if (!admin) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Role-based page protection
  const safeActivePage = menu.includes(activePage)
    ? activePage
    : "Dashboard";

  return (
    <div className="app">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <h2>
          <span className="sidebar-logo">◆</span>
          Smart Attendance
        </h2>

        <div className="sidebar-menu-label">MAIN MENU</div>

        {menu.map((item) => {
          const icons = {
            Dashboard: "▦",
            Students: "♙",
            Attendance: "▣",
            Reports: "▤",
            Analytics: "▥",
            "Admin Management": "♟",
          };

          return (
            <button
              key={item}
              type="button"
              className={
                safeActivePage === item ? "active" : ""
              }
              onClick={() => setActivePage(item)}
            >
              <span className="sidebar-icon">
                {icons[item]}
              </span>
              {item}
            </button>
          );
        })}

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              {admin.name?.charAt(0).toUpperCase()}
            </div>

            <div>
              <strong>{admin.name}</strong>
              <small>
                {admin.role === "super_admin"
                  ? "Super Administrator"
                  : admin.role === "admin"
                    ? "Administrator"
                    : "Attendance Officer"}
              </small>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main">
        <header className="topbar">
          <div className="topbar-heading">
            <h1>{safeActivePage}</h1>
            <p>Smart Attendance Management System</p>
          </div>

          <div className="topbar-user">
            <div className="topbar-welcome">
              <span>Welcome back,</span>
              <strong>{admin.name}</strong>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="logout-button"
            >
              Logout
            </button>
          </div>
        </header>

        {/* DASHBOARD */}
        {safeActivePage === "Dashboard" && (
          <div className="dashboard">

            <div className="dashboard-intro">
              <div>
                <h2>Dashboard Overview</h2>
                <p>
                  Monitor student attendance and system performance.
                </p>
              </div>

              <div className="dashboard-date">
                ◷{" "}
                {new Date().toLocaleDateString("en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
            </div>

            {dashboardError && (
              <div className="dashboard-error">
                {dashboardError}
              </div>
            )}

            {/* STATISTICS */}
            <section className="dashboard-stats">
              <article className="dashboard-stat blue-stat">
                <div>
                  <p>Total Students</p>
                  <h2>
                    {dashboardLoading
                      ? "..."
                      : dashboardStats.totalStudents}
                  </h2>
                  <small>Registered students</small>
                </div>
                <span className="dashboard-stat-icon">♙</span>
              </article>

              <article className="dashboard-stat green-stat">
                <div>
                  <p>Present Today</p>
                  <h2>
                    {dashboardLoading
                      ? "..."
                      : dashboardStats.present}
                  </h2>
                  <small>Marked present today</small>
                </div>
                <span className="dashboard-stat-icon">✓</span>
              </article>

              <article className="dashboard-stat orange-stat">
                <div>
                  <p>Absent Today</p>
                  <h2>
                    {dashboardLoading
                      ? "..."
                      : dashboardStats.absent}
                  </h2>
                  <small>Marked absent today</small>
                </div>
                <span className="dashboard-stat-icon">!</span>
              </article>

              <article className="dashboard-stat purple-stat">
                <div>
                  <p>Attendance Rate</p>
                  <h2>
                    {dashboardLoading
                      ? "..."
                      : `${dashboardStats.attendanceRate}%`}
                  </h2>
                  <small>Based on marked attendance</small>
                </div>
                <span className="dashboard-stat-icon">%</span>
              </article>
            </section>

            {/* CHART AND SUMMARY */}
            <section className="dashboard-middle">

              <div className="dashboard-panel attendance-chart-panel">
                <div className="dashboard-panel-heading">
                  <div>
                    <h3>Weekly Attendance Trend</h3>
                    <p>Daily attendance records for the last 7 days</p>
                  </div>

                  <span className="dashboard-period">
                    Last 7 Days
                  </span>
                </div>

                <div className="attendance-chart">
                  <div className="chart-legend">
                    <span>
                      <i className="legend-present"></i>
                      Present
                    </span>

                    <span>
                      <i className="legend-absent"></i>
                      Absent
                    </span>
                  </div>

                  <div className="chart-bars">
                    {weeklySummary.map((day) => (
                      <div
                        className="chart-day"
                        key={day.date}
                      >
                        <div className="chart-bar-area">
                          {day.total > 0 ? (
                            <div
                              className="chart-bar-stack"
                              title={`${day.present} present, ${day.absent} absent`}
                            >
                              <div
                                className="chart-bar-present"
                                style={{
                                  height: `${
                                    (day.present / maximumAttendance) *
                                    150
                                  }px`,
                                }}
                              ></div>

                              <div
                                className="chart-bar-absent"
                                style={{
                                  height: `${
                                    (day.absent / maximumAttendance) *
                                    150
                                  }px`,
                                }}
                              ></div>
                            </div>
                          ) : (
                            <span className="chart-no-data">—</span>
                          )}
                        </div>

                        <span className="chart-day-label">
                          {day.day}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="chart-footer">
                  <div>
                    <span>Total Present</span>
                    <strong>{weeklyPresent}</strong>
                  </div>

                  <div>
                    <span>Total Absent</span>
                    <strong>{weeklyAbsent}</strong>
                  </div>

                  <div>
                    <span>Weekly Rate</span>
                    <strong>{weeklyRate}%</strong>
                  </div>
                </div>
              </div>

              {/* ATTENDANCE SUMMARY */}
              <div className="dashboard-panel summary-panel">
                <div className="dashboard-panel-heading">
                  <div>
                    <h3>Today's Summary</h3>
                    <p>Attendance status overview</p>
                  </div>
                </div>

                <div className="summary-total">
                  <strong>
                    {dashboardStats.present +
                      dashboardStats.absent}
                  </strong>
                  <span>Students marked today</span>
                </div>

                <div className="summary-progress">
                  <div
                    className="summary-progress-present"
                    style={{
                      width: `${dashboardStats.attendanceRate}%`,
                    }}
                  ></div>
                </div>

                <div className="summary-row">
                  <span>
                    <i className="summary-dot present-dot"></i>
                    Present
                  </span>
                  <strong>{dashboardStats.present}</strong>
                </div>

                <div className="summary-row">
                  <span>
                    <i className="summary-dot absent-dot"></i>
                    Absent
                  </span>
                  <strong>{dashboardStats.absent}</strong>
                </div>

                <div className="summary-row">
                  <span>
                    <i className="summary-dot rate-dot"></i>
                    Attendance Rate
                  </span>
                  <strong>
                    {dashboardStats.attendanceRate}%
                  </strong>
                </div>
              </div>
            </section>

            {/* QUICK ACTIONS */}
            <section className="dashboard-panel quick-actions-panel">
              <div className="dashboard-panel-heading">
                <div>
                  <h3>Quick Actions</h3>
                  <p>Access frequently used system features</p>
                </div>
              </div>

              <div className="quick-actions">
                <button
                  type="button"
                  onClick={() => setActivePage("Students")}
                >
                  <span className="quick-action-icon blue-action">
                    ♙
                  </span>
                  <span>
                    <strong>Manage Students</strong>
                    <small>View and manage student records</small>
                  </span>
                  <b>→</b>
                </button>

                <button
                  type="button"
                  onClick={() => setActivePage("Attendance")}
                >
                  <span className="quick-action-icon green-action">
                    ✓
                  </span>
                  <span>
                    <strong>Mark Attendance</strong>
                    <small>Record daily student attendance</small>
                  </span>
                  <b>→</b>
                </button>

                {menu.includes("Reports") && (
                  <button
                    type="button"
                    onClick={() => setActivePage("Reports")}
                  >
                    <span className="quick-action-icon purple-action">
                      ▤
                    </span>
                    <span>
                      <strong>Generate Reports</strong>
                      <small>View attendance reports</small>
                    </span>
                    <b>→</b>
                  </button>
                )}
              </div>
            </section>

            {/* RECENT ACTIVITY */}
            <section className="dashboard-panel recent-activity-panel">
              <div className="dashboard-panel-heading">
                <div>
                  <h3>Recent Attendance Activity</h3>
                  <p>Latest attendance records from the last 7 days</p>
                </div>

                <button
                  className="dashboard-view-all"
                  type="button"
                  onClick={() => setActivePage("Attendance")}
                >
                  View Attendance →
                </button>
              </div>

              <div className="recent-activity-table">
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>
                    {recentActivity.length === 0 ? (
                      <tr>
                        <td
                          colSpan="3"
                          className="activity-empty"
                        >
                          No attendance activity available yet.
                        </td>
                      </tr>
                    ) : (
                      recentActivity.map((record) => (
                        <tr key={record._id}>
                          <td>
                            <strong>
                              {getStudentName(record)}
                            </strong>
                          </td>

                          <td>
                            {formatDisplayDate(record.date)}
                          </td>

                          <td>
                            <span
                              className={`activity-status ${
                                record.status === "Present"
                                  ? "status-present"
                                  : "status-absent"
                              }`}
                            >
                              {record.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

          </div>
        )}

        {/* OTHER PAGES */}
        {safeActivePage === "Students" && <Students />}

        {safeActivePage === "Attendance" && <Attendance />}

        {safeActivePage === "Reports" && <Reports />}

        {safeActivePage === "Analytics" && <Analytics />}

        {safeActivePage === "Admin Management" &&
          admin.role === "super_admin" && <AdminManagement />}
      </main>
    </div>
  );
}
