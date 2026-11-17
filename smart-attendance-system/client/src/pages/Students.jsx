
import { useEffect, useMemo, useState } from "react";
import API from "../services/api";
import "./Students.css";

const initialFormData = {
  name: "",
  rollNumber: "",
  course: "",
  email: "",
};

export default function Students() {
  const [students, setStudents] = useState([]);
  const [formData, setFormData] = useState(initialFormData);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch student records
  async function fetchStudents(showLoading = false) {
    if (showLoading) setLoading(true);

    try {
      const response = await API.get("/students");

      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.students || [];

      setStudents(data);
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to load student records."
      );
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  // Initial data loading
  useEffect(() => {
    let active = true;

    async function loadStudents() {
      try {
        const response = await API.get("/students");

        if (!active) return;

        const data = Array.isArray(response.data)
          ? response.data
          : response.data?.students || [];

        setStudents(data);
      } catch (err) {
        if (active) {
          setError(
            err.response?.data?.message ||
              "Failed to load student records."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadStudents();

    return () => {
      active = false;
    };
  }, []);

  // Handle form inputs
  function handleChange(e) {
    const { name, value } = e.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  }

  // Reset form
  function resetForm() {
    setFormData(initialFormData);
    setEditingId(null);
  }

  // Add or update student
  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setSuccess("");

    const studentData = {
      name: formData.name.trim(),
      rollNumber: formData.rollNumber.trim(),
      course: formData.course.trim(),
      email: formData.email.trim(),
    };

    if (
      !studentData.name ||
      !studentData.rollNumber ||
      !studentData.course
    ) {
      setError(
        "Student name, roll number and course are required."
      );
      return;
    }

    try {
      setSubmitting(true);

      if (editingId) {
        await API.put(`/students/${editingId}`, studentData);
        setSuccess("Student updated successfully.");
      } else {
        await API.post("/students", studentData);
        setSuccess("Student added successfully.");
      }

      resetForm();
      await fetchStudents();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          `Failed to ${editingId ? "update" : "add"} student.`
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Edit student
  function handleEdit(student) {
    setFormData({
      name: student.name || "",
      rollNumber: student.rollNumber || "",
      course: student.course || "",
      email: student.email || "",
    });

    setEditingId(student._id);
    setError("");
    setSuccess("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // Delete student
  async function handleDelete(student) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${student.name}?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      setSubmitting(true);

      await API.delete(`/students/${student._id}`);

      if (editingId === student._id) {
        resetForm();
      }

      setSuccess("Student deleted successfully.");
      await fetchStudents();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to delete student."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Search students
  const filteredStudents = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    return students.filter((student) =>
      [
        student.name,
        student.rollNumber,
        student.course,
        student.email,
      ].some((value) =>
        String(value || "").toLowerCase().includes(search)
      )
    );
  }, [students, searchTerm]);

  // Calculate total courses
  const totalCourses = useMemo(
    () =>
      new Set(
        students
          .map((student) => student.course?.trim())
          .filter(Boolean)
      ).size,
    [students]
  );

  return (
    <div className="students-module">

      {/* Statistics */}
      <div className="student-stats">
        <div className="student-stat-card">
          <div className="student-stat-icon blue">🎓</div>
          <div>
            <p>Total Students</p>
            <h3>{students.length}</h3>
            <span>Registered students</span>
          </div>
        </div>

        <div className="student-stat-card">
          <div className="student-stat-icon purple">📚</div>
          <div>
            <p>Total Courses</p>
            <h3>{totalCourses}</h3>
            <span>Courses represented</span>
          </div>
        </div>

        <div className="student-stat-card">
          <div className="student-stat-icon green">✓</div>
          <div>
            <p>Records Available</p>
            <h3>{students.length}</h3>
            <span>Registered records</span>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="student-alert student-alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="student-alert student-alert-success">
          {success}
        </div>
      )}

      {/* Add / Edit Student */}
      <section className="student-add-panel">
        <div className="student-section-heading">
          <div>
            <h2>
              {editingId ? "Edit Student" : "Add New Student"}
            </h2>
            <p>
              {editingId
                ? "Update the student's information."
                : "Enter student information to register a new student."}
            </p>
          </div>

          <div className="student-heading-icon">
            {editingId ? "✎" : "+"}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="student-form-grid">
            <div className="student-field">
              <label htmlFor="student-name">Student Name</label>
              <input
                id="student-name"
                type="text"
                name="name"
                placeholder="Enter full name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="student-field">
              <label htmlFor="student-roll">Roll Number</label>
              <input
                id="student-roll"
                type="text"
                name="rollNumber"
                placeholder="e.g. 24BCF1001"
                value={formData.rollNumber}
                onChange={handleChange}
                required
              />
            </div>

            <div className="student-field">
              <label htmlFor="student-course">
                Course / Department
              </label>
              <input
                id="student-course"
                type="text"
                name="course"
                placeholder="e.g. CSE"
                value={formData.course}
                onChange={handleChange}
                required
              />
            </div>

            <div className="student-field">
              <label htmlFor="student-email">
                Email Address <span>(Optional)</span>
              </label>
              <input
                id="student-email"
                type="email"
                name="email"
                placeholder="student@example.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="student-form-footer">
            {editingId && (
              <button
                type="button"
                className="student-cancel-btn"
                onClick={resetForm}
                disabled={submitting}
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              className="student-add-btn"
              disabled={submitting}
            >
              {submitting
                ? "Please wait..."
                : editingId
                  ? "Update Student"
                  : "+ Add Student"}
            </button>
          </div>
        </form>
      </section>

      {/* Student Records */}
      <section className="student-records-panel">
        <div className="student-records-header">
          <div>
            <h2>Student Records</h2>
            <p>Manage and view all registered students.</p>
          </div>

          <span className="student-record-count">
            {filteredStudents.length} Students
          </span>
        </div>

        {/* Search */}
        <div className="student-toolbar">
          <div className="student-search">
            <span>⌕</span>
            <input
              type="text"
              placeholder="Search by name, roll number, course or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Table */}
        <div className="student-table-wrapper">
          <table className="student-table">
            <thead>
              <tr>
                <th>STUDENT</th>
                <th>ROLL NUMBER</th>
                <th>COURSE</th>
                <th>EMAIL ADDRESS</th>
                <th>ACTION</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="5" className="student-empty-state">
                    Loading student records...
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan="5">
                    <div className="student-empty-state">
                      <div>📂</div>
                      <h3>No students found</h3>
                      <p>
                        {searchTerm
                          ? "Try another search term."
                          : "Add your first student using the form above."}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student._id}>
                    <td>
                      <div className="student-name-cell">
                        <div className="student-avatar">
                          {student.name?.charAt(0).toUpperCase() || "S"}
                        </div>
                        <strong>{student.name}</strong>
                      </div>
                    </td>

                    <td>
                      <span className="student-roll">
                        {student.rollNumber}
                      </span>
                    </td>

                    <td>
                      <span className="student-course">
                        {student.course}
                      </span>
                    </td>

                    <td>{student.email || "—"}</td>

                    {/* Action column */}
                    <td>
                      <div className="student-action-buttons">
                        <button
                          type="button"
                          className="student-edit-btn"
                          onClick={() => handleEdit(student)}
                          disabled={submitting}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="student-delete-btn"
                          onClick={() => handleDelete(student)}
                          disabled={submitting}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
