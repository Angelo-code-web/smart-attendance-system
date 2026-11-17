# Smart Attendance System

A full-stack web-based attendance management system built using **React, Node.js, Express.js, and MongoDB**. The system provides secure authentication, role-based access control, student management, attendance tracking, reporting, and analytics.

## Project Overview

The Smart Attendance System is designed to simplify and improve the management of student attendance through a centralized web application.

It provides administrators and authorized users with tools to manage students, record attendance, monitor attendance records, and generate reports.

## Key Features

- **Secure Authentication:** JWT-based authentication for protected access.
- **Role-Based Access Control (RBAC):** Restricts access according to assigned user roles.
- **Admin Management:** Manage administrator accounts and access permissions.
- **Student Management:** Add, view, and manage student records.
- **Attendance Tracking:** Record and manage student attendance.
- **Reports:** Access attendance records and reports.
- **Analytics Dashboard:** View attendance-related information and statistics.
- **Protected API Routes:** Secure backend endpoints using authentication middleware.

## Technologies Used

| Technology | Purpose |
|---|---|
| React | Frontend user interface |
| Vite | Frontend development and build tool |
| Node.js | Backend runtime |
| Express.js | REST API development |
| MongoDB | Database |
| Mongoose | MongoDB object modelling |
| JSON Web Token (JWT) | Authentication |
| bcryptjs | Password hashing |
| CSS | User interface styling |

## Project Structure

```text
Full Stack- II Project/
│
├── .gitignore
├── README.md
│
├── server/
│   ├── controllers/
│   ├── middleware/
│   │   └── authMiddleware.js
│   ├── models/
│   │   ├── Admin.js
│   │   ├── Attendance.js
│   │   └── Student.js
│   ├── routes/
│   │   ├── adminRoutes.js
│   │   ├── attendanceRoutes.js
│   │   ├── authRoutes.js
│   │   └── studentRoutes.js
│   ├── server.js
│   ├── package.json
│   └── package-lock.json
│
└── smart-attendance-system/
    └── client/
        ├── public/
        ├── src/
        │   ├── assets/
        │   ├── pages/
        │   ├── services/
        │   ├── App.jsx
        │   ├── App.css
        │   ├── index.css
        │   └── main.jsx
        ├── index.html
        ├── package.json
        └── package-lock.json
```

## Installation and Setup

### Prerequisites

Install the following before running the application:

- Node.js and npm
- MongoDB
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/Angelo-code-web/smart-attendance-system.git
```

Navigate into the project:

```bash
cd smart-attendance-system
```

### 2. Configure the Backend

Navigate to the backend folder:

```bash
cd server
```

Install dependencies:

```bash
npm install
```

Create a `.env` file inside the `server` folder and configure your environment variables:

```env
PORT=5001
MONGODB_URI=mongodb://127.0.0.1:27017/smart_attendance
JWT_SECRET=replace_with_a_secure_secret
```

Use your own secure JWT secret. Never upload your actual `.env` file to GitHub.

### 3. Start the Backend Server

```bash
npm start
```

The backend API should run at:

```text
http://localhost:5001
```

### 4. Configure and Start the Frontend

Open a new terminal window and navigate to the frontend:

```bash
cd smart-attendance-system/client
```

Install dependencies:

```bash
npm install
```

Start the Vite development server:

```bash
npm run dev
```

Open the local URL displayed in your terminal, usually:

```text
http://localhost:5173
```

Ensure MongoDB is running and the frontend API configuration points to your backend server.

## API Routes

The backend organizes its API endpoints into the following route groups:

| Route Prefix | Purpose |
|---|---|
| `/api/auth` | Authentication |
| `/api/admins` | Administrator management |
| `/api/students` | Student management |
| `/api/attendance` | Attendance management |

The exact endpoints and required request parameters are defined in the corresponding route files.

## Security

The application incorporates the following security mechanisms:

- JWT-based authentication.
- Role-based authorization.
- Password hashing using bcryptjs.
- Protected backend routes.
- Environment variables for sensitive configuration.

## Future Improvements

Potential enhancements include:

- Attendance notifications.
- Exporting reports to PDF and Excel.
- QR-code-based attendance.
- Advanced attendance analytics.
- Improved dashboard visualizations.

## Author

**Angelo-code-web**

GitHub: https://github.com/Angelo-code-web

## License

This project is available for educational and demonstration purposes. A formal open-source license has not yet been specified.
