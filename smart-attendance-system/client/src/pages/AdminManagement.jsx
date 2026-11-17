
import { useEffect, useMemo, useState } from "react";
import API from "../services/api";
import "./AdminManagement.css";

export default function AdminManagement() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [search, setSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [roleFilter, setRoleFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState([]);
  const [sort, setSort] = useState({
    key: "createdAt",
    direction: "desc",
  });

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "admin",
  });

  // Fetch administrator accounts
  async function fetchAdmins() {
    try {
      const response = await API.get("/admins");
      setAdmins(response.data);
      setError("");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to load administrator accounts."
      );
    } finally {
      setLoading(false);
    }
  }

  // Initial data loading
  useEffect(() => {
    let ignore = false;

    async function loadAdmins() {
      try {
        const response = await API.get("/admins");

        if (!ignore) {
          setAdmins(response.data);
          setError("");
        }
      } catch (err) {
        if (!ignore) {
          setError(
            err.response?.data?.message ||
              "Unable to load administrator accounts."
          );
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadAdmins();

    return () => {
      ignore = true;
    };
  }, []);

  // Search, filter and sort accounts
  const filteredAdmins = useMemo(() => {
    const term = search.trim().toLowerCase();

    const result = admins.filter((admin) => {
      const searchableRole = (admin.role || "").replaceAll("_", " ");

      const matchesSearch =
        !term ||
        admin.name?.toLowerCase().includes(term) ||
        admin.email?.toLowerCase().includes(term) ||
        searchableRole.includes(term);

      const matchesRole =
        roleFilter === "all" || admin.role === roleFilter;

      return matchesSearch && matchesRole;
    });

    return result.sort((a, b) => {
      const av =
        sort.key === "createdAt"
          ? new Date(a.createdAt || 0).getTime()
          : String(a[sort.key] || "").toLowerCase();

      const bv =
        sort.key === "createdAt"
          ? new Date(b.createdAt || 0).getTime()
          : String(b[sort.key] || "").toLowerCase();

      if (av < bv) {
        return sort.direction === "asc" ? -1 : 1;
      }

      if (av > bv) {
        return sort.direction === "asc" ? 1 : -1;
      }

      return 0;
    });
  }, [admins, search, roleFilter, sort]);

  // Account statistics
  const superAdmins = admins.filter(
    (admin) => admin.role === "super_admin"
  ).length;

  const regularAdmins = admins.filter(
    (admin) => admin.role === "admin"
  ).length;

  const officers = admins.filter(
    (admin) => admin.role === "attendance_officer"
  ).length;

  // Handle form inputs
  const handleChange = (event) => {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  // Create administrator
  async function handleCreateAdmin(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    try {
      await API.post("/admins", form);

      setSuccess(
        "Administrator account created successfully."
      );

      setForm({
        name: "",
        email: "",
        password: "",
        role: "admin",
      });

      setShowCreateForm(false);

      await fetchAdmins();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to create administrator account."
      );
    }
  }

  // Change administrator role
  async function handleRoleChange(id, role) {
    setError("");
    setSuccess("");

    try {
      await API.patch(`/admins/${id}/role`, { role });

      setSuccess("Administrator role updated successfully.");

      await fetchAdmins();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to update administrator role."
      );
    }
  }

  // Delete administrator
  async function handleDeleteAdmin(id, name) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${name}'s account?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await API.delete(`/admins/${id}`);

      setSelectedIds((ids) =>
        ids.filter((item) => item !== id)
      );

      setSuccess(
        "Administrator account deleted successfully."
      );

      await fetchAdmins();
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to delete administrator account."
      );
    }
  }
       // Delete multiple selected administrator accounts
async function handleBulkDelete() {
  const selectedAdmins = admins.filter(
    (admin) =>
      selectedIds.includes(admin._id) &&
      admin.role !== "super_admin"
  );

  if (selectedAdmins.length === 0) {
    setError("Please select administrator accounts to delete.");
    return;
  }

  const confirmed = window.confirm(
    `Are you sure you want to delete ${selectedAdmins.length} selected administrator account(s)?`
  );

  if (!confirmed) return;

  setError("");
  setSuccess("");

  const results = await Promise.allSettled(
    selectedAdmins.map((admin) =>
      API.delete(`/admins/${admin._id}`)
    )
  );

  const deletedCount = results.filter(
    (result) => result.status === "fulfilled"
  ).length;

  const failedCount = results.length - deletedCount;

  setSelectedIds([]);

  await fetchAdmins();

  if (failedCount === 0) {
    setSuccess(
      `${deletedCount} administrator account(s) deleted successfully.`
    );
  } else {
    setError(
      `${deletedCount} account(s) deleted. ${failedCount} account(s) could not be deleted.`
    );
  }
}

  // Sort table columns
  function toggleSort(key) {
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc"
          ? "desc"
          : "asc",
    }));
  }

  // Select all visible accounts
  // Select all visible accounts except the protected Super Admin
function toggleAll() {
  const ids = filteredAdmins
    .filter((admin) => admin.role !== "super_admin")
    .map((admin) => admin._id);

  const allSelected =
    ids.length > 0 &&
    ids.every((id) => selectedIds.includes(id));

  setSelectedIds((current) =>
    allSelected
      ? current.filter((id) => !ids.includes(id))
      : [...new Set([...current, ...ids])]
  );
}

  // Export administrator accounts as CSV
  function exportCSV() {
    const rows = [
      [
        "Administrator",
        "Email Address",
        "Role",
        "Date Created",
      ],
      ...filteredAdmins.map((admin) => [
        admin.name,
        admin.email,
        admin.role === "super_admin"
          ? "Super Admin"
          : admin.role === "admin"
            ? "Admin"
            : "Attendance Officer",
        admin.createdAt
          ? new Date(admin.createdAt).toLocaleDateString("en-GB")
          : "",
      ]),
    ];

    const csv = rows
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(value ?? "").replaceAll('"', '""')}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "administrator-accounts.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  // Format account creation date
  const formatDate = (date) =>
    date
      ? new Date(date).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  if (loading) {
    return (
      <div className="admin-loading">
        Loading administrator accounts...
      </div>
    );
  }

  return (
    <div className="admin-management">

      {/* PAGE HEADING */}
      <header className="admin-page-heading">
        <div>
          <h2>Administrator Management</h2>
          <p>
            Manage system administrators, assign roles,
            and control administrative access
          </p>
        </div>

        <button
          className="admin-analytics-btn"
          type="button"
          onClick={() =>
            setSuccess(
              "Open Analytics from the main navigation to view system analytics."
            )
          }
        >
          ▥ <span>Advanced Analytics</span>
        </button>
      </header>

      {/* TOP NAVIGATION TABS */}
      <nav
        className="admin-tabs"
        aria-label="Administrator sections"
      >
        <span>▥ <b>Overview</b></span>
        <span className="active">♟ <b>Accounts</b></span>
        <span>▱ <b>Roles</b></span>
        <span>◇ <b>Permissions</b></span>
        <span>◷ <b>Activity Logs</b></span>
      </nav>

      {/* NOTIFICATIONS */}
      {success && (
        <div
          className="admin-alert admin-success"
          role="status"
        >
          {success}
          <button
            type="button"
            onClick={() => setSuccess("")}
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div
          className="admin-alert admin-error"
          role="alert"
        >
          {error}
          <button
            type="button"
            onClick={() => setError("")}
          >
            ×
          </button>
        </div>
      )}

      {/* ADMINISTRATOR SECTION HEADING */}
      <div className="admin-section-heading">
        <div className="admin-section-title">
          <div className="admin-section-icon">
            ♙
          </div>

          <div>
            <h3>Administrator Accounts</h3>
            <p>
              View and manage all registered system administrators
            </p>
          </div>
        </div>

        <div className="admin-heading-actions">
          <button
            className="admin-outline-btn"
            type="button"
            onClick={() =>
              setSuccess(
                "Bulk import is not enabled yet. Add administrator accounts individually."
              )
            }
          >
            ⇧ <span>Bulk Import</span>
          </button>

          <button
            className="admin-primary-btn"
            type="button"
            onClick={() =>
              setShowCreateForm((value) => !value)
            }
          >
            ＋
            <span>
              {showCreateForm
                ? "Close Form"
                : "Add Administrator"}
            </span>
          </button>
        </div>
      </div>

      {/* STATISTICS CARDS */}
      <div className="admin-stats-grid">
        <article className="admin-stat-card total">
          <div>
            <p>Total Accounts</p>
            <h3>{admins.length}</h3>
          </div>
          <span>♙</span>
        </article>

        <article className="admin-stat-card super">
          <div>
            <p>Super Admins</p>
            <h3>{superAdmins}</h3>
          </div>
          <span>♛</span>
        </article>

        <article className="admin-stat-card regular">
          <div>
            <p>Admins</p>
            <h3>{regularAdmins}</h3>
          </div>
          <span>♙</span>
        </article>

        <article className="admin-stat-card officers">
          <div>
            <p>Attendance Officers</p>
            <h3>{officers}</h3>
          </div>
          <span>♙</span>
        </article>
      </div>

      {/* CREATE ADMINISTRATOR FORM */}
      {showCreateForm && (
        <section className="admin-create-panel">
          <div className="admin-panel-heading">
            <div>
              <h3>Create Administrator Account</h3>
              <p>
                Add a new administrator and assign system permissions.
              </p>
            </div>

            <button
              className="admin-close-btn"
              type="button"
              onClick={() => setShowCreateForm(false)}
              aria-label="Close form"
            >
              ×
            </button>
          </div>

          <form
            className="admin-create-form"
            onSubmit={handleCreateAdmin}
          >
            <div className="admin-form-group">
              <label htmlFor="admin-name">Full Name</label>
              <input
                id="admin-name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Enter full name"
                required
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="admin-email">Email Address</label>
              <input
                id="admin-email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Enter email address"
                required
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="admin-password">Password</label>
              <input
                id="admin-password"
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Minimum 8 characters"
                minLength={8}
                required
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="admin-role">Assign Role</label>
              <select
                id="admin-role"
                name="role"
                value={form.role}
                onChange={handleChange}
              >
                <option value="admin">Admin</option>
                <option value="attendance_officer">
                  Attendance Officer
                </option>
              </select>
            </div>

            <div className="admin-form-actions">
              <button
                className="admin-primary-btn"
                type="submit"
              >
                ＋ Create Account
              </button>
            </div>
          </form>
        </section>
      )}

      {/* SEARCH AND FILTERS */}
      <section className="admin-tools-panel">
        <div className="admin-search-row">
          <label className="admin-search-box">
            <span>⌕</span>
            <input
              type="search"
              aria-label="Search administrators"
              placeholder="Search administrators by name, email, or role..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
            />
          </label>

          <button
            className="admin-tool-btn"
            type="button"
            onClick={fetchAdmins}
          >
            ⟳ <span>Refresh</span>
          </button>

          <button
            className="admin-tool-btn"
            type="button"
            onClick={exportCSV}
          >
            ⇩ <span>Export</span>
          </button>
        </div>

        <button
          className="admin-filter-toggle"
          type="button"
          onClick={() =>
            setShowFilters((value) => !value)
          }
          aria-expanded={showFilters}
        >
          <span>▽ &nbsp;Advanced Filters</span>
          <span>{showFilters ? "⌃" : "⌄"}</span>
        </button>

        {showFilters && (
          <div className="admin-filter-content">
            <label htmlFor="admin-role-filter">
              Filter by role
            </label>

            <select
              id="admin-role-filter"
              value={roleFilter}
              onChange={(event) =>
                setRoleFilter(event.target.value)
              }
            >
              <option value="all">All roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="attendance_officer">
                Attendance Officer
              </option>
            </select>

            <button
              type="button"
              className="admin-reset-filter"
              onClick={() => {
                setRoleFilter("all");
                setSearch("");
              }}
            >
              Clear filters
            </button>
          </div>
        )}
      </section>

{/* BULK ACTION BAR */}
{selectedIds.length > 0 && (
  <div className="admin-bulk-actions">
    <div>
      <strong>{selectedIds.length} account(s) selected</strong>
      <span>Choose an action for selected accounts.</span>
    </div>

    <button
      type="button"
      className="admin-bulk-delete-btn"
      onClick={handleBulkDelete}
    >
      🗑 Delete Selected
    </button>

    <button
      type="button"
      className="admin-bulk-clear-btn"
      onClick={() => setSelectedIds([])}
    >
      Clear Selection
    </button>
  </div>
)}
      {/* ADMINISTRATOR ACCOUNTS TABLE */}
      <section className="admin-table-panel">
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th className="admin-check-cell">
                  <input
                    type="checkbox"
                    aria-label="Select all visible administrators"
                    checked={
                      filteredAdmins.filter(
                      (admin) => admin.role !== "super_admin"
                      ).length > 0 &&
                      filteredAdmins
                      .filter((admin) => admin.role !== "super_admin")
                      .every((admin) => selectedIds.includes(admin._id))
                     }
                    onChange={toggleAll}
                  />
                </th>

                <th>
                  <button
                    type="button"
                    onClick={() => toggleSort("name")}
                  >
                    Administrator ↕
                  </button>
                </th>

                <th>
                  <button
                    type="button"
                    onClick={() => toggleSort("email")}
                  >
                    Email Address ↕
                  </button>
                </th>

                <th>
                  <button
                    type="button"
                    onClick={() => toggleSort("role")}
                  >
                    Role ↕
                  </button>
                </th>

                <th>
                  <button
                    type="button"
                    onClick={() => toggleSort("createdAt")}
                  >
                    Date Created ↕
                  </button>
                </th>

                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredAdmins.length === 0 ? (
                <tr>
                  <td colSpan="6" className="admin-empty">
                    No administrator accounts match your search.
                  </td>
                </tr>
              ) : (
                filteredAdmins.map((admin) => (
                  <tr key={admin._id}>
                    <td className="admin-check-cell">
                      <input
                        type="checkbox"
                        aria-label={`Select ${admin.name}`}
                        checked={selectedIds.includes(admin._id)}
                        disabled={admin.role === "super_admin"}
                        onChange={() =>
                          setSelectedIds((ids) =>
                            ids.includes(admin._id)
                              ? ids.filter(
                                  (id) => id !== admin._id
                                )
                              : [...ids, admin._id]
                          )
                        }
                      />
                    </td>

                    <td>
                      <div className="admin-user">
                        <span
                          className={`admin-avatar ${
                            admin.role === "super_admin"
                              ? "avatar-super"
                              : "avatar-normal"
                          }`}
                        >
                          {admin.name?.charAt(0).toUpperCase()}
                        </span>

                        <strong>{admin.name}</strong>
                      </div>
                    </td>

                    <td>{admin.email}</td>

                    <td>
                      {admin.role === "super_admin" ? (
                        <span className="admin-role-badge super-badge">
                          ♛ &nbsp;Super Admin
                        </span>
                      ) : (
                        <select
                          className={`admin-role-select ${
                            admin.role === "admin"
                              ? "role-admin"
                              : "role-officer"
                          }`}
                          value={admin.role}
                          onChange={(event) =>
                            handleRoleChange(
                              admin._id,
                              event.target.value
                            )
                          }
                          aria-label={`Change role for ${admin.name}`}
                        >
                          <option value="admin">Admin</option>
                          <option value="attendance_officer">
                            Attendance Officer
                          </option>
                        </select>
                      )}
                    </td>

                    <td>{formatDate(admin.createdAt)}</td>

                    <td className="admin-actions-cell">
                      {admin.role !== "super_admin" ? (
                        <button
                          className="admin-delete-btn"
                          type="button"
                          onClick={() =>
                            handleDeleteAdmin(
                              admin._id,
                              admin.name
                            )
                          }
                        >
                          ▤ &nbsp;Delete
                        </button>
                      ) : (
                        <span className="admin-protected">
                          —
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <footer className="admin-table-footer">
          <span>
            Showing {filteredAdmins.length} of {admins.length} administrator accounts
          </span>

          {selectedIds.length > 0 && (
            <span>{selectedIds.length} selected</span>
          )}
        </footer>
      </section>
    </div>
  );
}
