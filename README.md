# University Ideas Portal

---

## Project Information

| Information | Details |
|-----------|---------|
| **Subject Code** | COMP1640 |
| **Subject Title** | Enterprise Web Software Development |
| **Team Name** | Banana |

## Group Member Information

### Member List

| Full Name | UoG ID |
|-----------|--------|
| Le Ba Long | 001504854 |
| Huynh Doan Tan Phat | 001504878 |
| Ho Nhat Linh | 001505299 |
| Le Thi Mai Hoa | 001504838 |
| Nghiem Le Thanh Huy | 001504839 |

### Role Assignment

| Full Name | Role |
|-----------|------|
| Huynh Doan Tan Phat | Developer (Backend) / Database |
| Le Ba Long | Scrum Master / Developer (Frontend) |
| Ho Nhat Linh | Developer (Backend) |
| Nghiem Le Thanh Huy | Developer (Frontend) |
| Le Thi Mai Hoa | Product Owner / Tester |

---

## Overview

The system is an ideas management portal for improving the university environment. Users can log in, view and contribute ideas, vote, comment, track progress, and manage categories. The system consists of:

- `backend/`: Node.js + Express API connected to PostgreSQL.
- `frontend/`: React + Vite user interface.

## Main Features

### 1. Authentication and Authorization

- Login with email and password.
- Account role-based access control: `staff`, `qa_coordinator`, `qa_manager`, `admin`.
- Login session management with JWT.
- Forgot password redirects to recovery page.

### 2. Ideas Management

- `staff` can submit new ideas when the submission period is open.
- Each idea consists of title, content, category, department, and anonymous option.
- Users can view ideas list, search, filter by category, department, and sort by:
  - Latest
  - Most Popular
  - Most Viewed
  - Most Commented

### 3. Voting and Feedback

- Users can vote on ideas (thumbs up / thumbs down).
- Only one vote per idea per user.
- Display total upvotes/downvotes and user's voting status.
- Display comments and allow viewing idea details.

### 4. Dashboard and Reports

- Dashboard page displays idea rankings:
  - Most-liked ideas
  - Most-viewed ideas
  - Latest ideas
- Display idea submission opening/closing and comment period closing dates.
- For roles `qa_coordinator` and `qa_manager`, dashboard provides in-depth statistics by department.

### 5. System Administration

- `admin` can manage categories, departments, users, and idea statuses.
- Support data export via `export` endpoint.
- Track and send notifications to users.

## Operating Architecture

### Backend

`backend/src/index.js` initializes Express server and registers API routes:

- `/api/auth`
- `/api/ideas`
- `/api/comments`
- `/api/votes`
- `/api/categories`
- `/api/departments`
- `/api/stats`
- `/api/export`
- `/api/closure-dates`
- `/api/notifications`
- `/api/admin`
- `/api/academic-years`

Frontend calls these endpoints via fetch and `api` service to display data and control functionality.

### Frontend

React interface consists of:

- `App.jsx`: Navigation between modules based on role and login status.
- `AuthContext.jsx`: Stores token in `localStorage`, manages login/logout.
- Main pages:
  - `DashboardPage.jsx`
  - `IdeasPage.jsx`
  - `StatisticsPage.jsx`
  - `CategoriesPage.jsx`
  - `DownloadPage.jsx`
  - `AdminPage.jsx`
  - `ExceptionReportsPage.jsx`

### Sample Data and Seeding

`backend/src/seed.js` creates demo data including:

- Departments
- Users with different roles
- Idea categories
- Academic years and closure dates
- Sample ideas

## Installation Guide

### Requirements

- Node.js 18+ or compatible version
- PostgreSQL

### Step 1: Install Dependencies

At the project root directory:

```bash
npm install
```

Then install separately for backend and frontend (if needed):

```bash
cd backend && npm install
cd ../frontend && npm install
```

### Step 2: Set Up Environment Variables

Create a `.env` file in the `backend/` directory. You can use the following template as a starting point:
```env
DATABASE_URL=your_postgresql_connection_string
JWT_SECRET=your_random_secret_key
PORT=5000
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_app_password
```
####  Detailed Database Configuration (`DATABASE_URL`)

The system requires a PostgreSQL database to store ideas, users, and votes. You can choose one of the two methods below to set up your connection string:

**Option 1: Local PostgreSQL (Manual Setup)**
Use this if you have PostgreSQL installed on your local machine (e.g., using pgAdmin).

* **URL Format:** `postgresql://[USER]:[PASSWORD]@localhost:5432/[DATABASE_NAME]`
* **How to fill:**
  * `USER`: Your PostgreSQL username (default is usually `postgres`).
  * `PASSWORD`: The password you created during PostgreSQL installation.
  * `DATABASE_NAME`: The name of the specific database you created for this portal project.
* **Example:** `postgresql://postgres:mysecretpass@localhost:5432/idea_portal_db`

**Option 2: Neon DB (Cloud/Managed Setup)**
Recommended for easy deployment and sharing without local installation.

* **Steps:**
  1. Register an account at [Neon.tech](https://neon.tech/).
  2. Create a new project and select the PostgreSQL version.
  3. On your project dashboard, find the **Connection Details** section.
  4. Copy the **Connection string**. It should look similar to this: 
     `postgresql://neondb_owner:[PASSWORD]@[HOST]/neondb?sslmode=require`
* **Note:** The `?sslmode=require` parameter is mandatory for Neon connections to ensure security.

####  Other Configuration Variables

* **`JWT_SECRET`**: A secret key used to sign and verify login tokens. Use a strong, random string (e.g., `comp1640_secret_key_2025`).
* **`PORT`**: The port number on which the backend server will listen. Default is set to `5000`.
* **`EMAIL_USER`**: The Gmail address used by the system to send notifications or password recovery emails.
* **`EMAIL_PASS`**: Your Google **App Password**.
  * *Note:* Do NOT use your regular Gmail password.
  * Go to your Google Account -> Security -> 2-Step Verification -> App Passwords to generate a unique 16-character code for this application.


### Step 3: Create Database and Seed Data

Before running, ensure database exists.

```bash
cd backend
npm run seed
```

This command will drop existing tables, recreate schema, and insert sample data.

## How to Run the Project

### Run Frontend and Backend Simultaneously

At the project root:

```bash
npm run dev
```

- Backend runs at `http://localhost:5000`
- Frontend runs at `http://localhost:5173`

### Run Separately

Backend:

```bash
cd backend
npm start
```

Frontend:

```bash
cd frontend
npm run dev
```

## Test Accounts

Sample data is seeded with the following accounts:

- Admin:
  - Email: `t.brady@gmail.com`
  - Password: `tom123`
- QA Manager:
  - Email: `d.harrison@gmail.com`
  - Password: `david123`
- QA Coordinator:
  - Email: `c.thompson@gmail.com`
  - Password: `claire123`
- Staff:
  - Email: `s.mitchell@gmail.com`
  - Password: `sarah123`
  - Email: `a.wong@gmail.com`
  - Password: `alice123`
  - Email: `j.ford@gmail.com`
  - Password: `james123`

> Note: To change sample data, modify `backend/src/seed.js` and run `npm run seed` again.

## Main Feature Testing Guide

### Test 1: Login

1. Open `http://localhost:5173`
2. Login with a sample account.
3. Check redirect to dashboard.

### Test 2: Submit New Idea (role `staff`)

1. Login with a staff account.
2. Go to `Ideas` page.
3. Click `Submit an Idea`.
4. Enter title, content, select category, and submit.
5. Verify new idea appears in the list.

### Test 3: Browse and Vote on Ideas

1. Open `Ideas` page.
2. Filter/change sorting and check data updates.
3. Open idea detail modal.
4. Perform thumbs up / thumbs down voting.
5. Check vote count increases and voting status is recorded.

### Test 4: View Dashboard and Reports

1. Login with QA Coordinator or QA Manager account.
2. Check statistics display correctly by department.
3. Identify featured ideas in ranking tables.

### Test 5: Manage Categories / Users

1. Login with Admin account.
2. Access administration page.
3. Check ability to view and handle category items, departments, or export data.

### Test 6: Check Idea Submission Closure Status

1. Check dashboard displays closing dates.
2. Try submitting idea after closure date has passed (requires corresponding web/backend conditions).

## Notes

- System uses `localStorage` to store JWT token.
- Upload information can be stored in `backend/uploads/`.
- If database connection error occurs, verify `DATABASE_URL` and PostgreSQL server.

---

This guide aims to help lecturers and reviewers easily understand the structure, main features, installation, and how to run the system.
