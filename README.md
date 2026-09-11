# Library Management System (LMS)

A **web-based Library Management System** built with a **Node.js RESTful backend** and a **modern frontend**.
This system manages **books, users, borrowing, returning, fines, and roles** following real-world library rules.

**Live demo:** https://dlegendz.github.io/LMS/

> The live demo runs entirely in the browser with sample data (no backend needed).
> On the login page, click **Admin**, **Librarian**, or **Member** to sign in instantly.

---

## Screenshots

### Login

![Login page](docs/screenshots/login.png)

### Admin

| Dashboard | Users |
| --- | --- |
| ![Admin dashboard](docs/screenshots/admin-dashboard.png) | ![Admin users](docs/screenshots/admin-users.png) |

| Books | Borrow Records |
| --- | --- |
| ![Admin books](docs/screenshots/admin-books.png) | ![Admin borrow records](docs/screenshots/admin-borrow-records.png) |

| Fine Records |
| --- |
| ![Admin fine records](docs/screenshots/admin-fine-records.png) |

### Librarian

| Dashboard | Add Book |
| --- | --- |
| ![Librarian dashboard](docs/screenshots/librarian-dashboard.png) | ![Librarian add book](docs/screenshots/librarian-add-book.png) |

### Member

| Dashboard | Browse Books |
| --- | --- |
| ![Member dashboard](docs/screenshots/member-dashboard.png) | ![Member browse books](docs/screenshots/member-browse-books.png) |

| My Borrows | My Fines |
| --- | --- |
| ![Member borrows](docs/screenshots/member-my-borrows.png) | ![Member fines](docs/screenshots/member-my-fines.png) |

---

## Project Purpose

This project was built to:

* Apply backend engineering fundamentals
* Model real-world library workflows
* Enforce business rules securely
* Provide a complete API-ready system usable by a frontend

---

## System Overview

### User Roles

* **Admin**

  * Manage librarians
  * Assign roles & user status
* **Librarian**

  * Manage books & categories
  * Process borrowing & returning
* **Member (Student)**

  * View books
  * Borrow & return books (via librarian)

---

## Tech Stack

### Backend

* Node.js
* Express.js
* PostgreSQL
* JWT (Access + Refresh tokens)
* bcrypt
* CORS
* dotenv

### Frontend

* React 18 + TypeScript
* Vite
* Tailwind CSS + shadcn/ui
* React Router, TanStack Query, Axios
* Connected via REST API

---

## Authentication & Security

* JWT-based authentication
* httpOnly cookies for access tokens
* Role-based access control (RBAC)
* Protected routes
* Environment variables for secrets

---

## Core Features

### User Management

* Login / Logout
* Role assignment
* Account suspension

### Book Management

* Add / update / delete books
* Categories
* Availability tracking

### Borrowing System

* Borrow limit enforcement
* Due date calculation
* Prevent duplicate borrowing
* Status tracking

### Fine System

* Late return fines
* Fine accumulation
* Borrow blocking when limit exceeded

---

## API Design Principles

* RESTful endpoints
* Meaningful HTTP status codes
* JSON-based responses
* No business logic in routes
* Centralized validation & error handling

---

## Project Structure (Backend)

```
temp/backend/Library Management System Backend/app/
├── src/
├── .env
├── database.js
└── server.js
```

---

## How to Run Locally

### 1 Prerequisites

* Node.js (v18+ recommended)
* PostgreSQL
* npm

---

### 2 Clone the Repository

```bash
git clone <repo-url>
cd <your-project-name>
```

---

### 3 Install Dependencies

Do install dependencies for the frontend and backend by:

Frontend:

```bash
/Library-Management-System
```

Backend:

```bash
/temp/backend/Library Management System Backend
```

```bash
npm install
```

---

### 4 Setup Environment Variables

Create a `.env` file in the project root (Check the project structure stated above):

```env
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/lms
JWT_SECRET=your_jwt_secret
```

If you follow DATABASE_DDL.txt, then DATABASE_URL must be filled like this :

```env
DATABASE_URL = postgresql://lms_admin:1234567@localhost:5432/lms_db
```

The JWT_SECRET can be gained randomly by:

```bash
node -e "console.log(require('crypto').randomBytes(128).toString('hex'))"
```

---

### 5 Setup Database

* Create the database and name it as lms_db
* Make the user in the database with:
  ```bash
  CREATE USER lms_admin WITH PASSWORD '1234567'
  ```
* Import the lms_db.sql to the database
* Database structure will be ready to use with first admin account created
* The admin account's email and password can be checked in acc.txt

---

### 6 Start the Backend

Make sure you are in the folder :

```bash
/temp/backend/Library Management System Backend/app
```

```bash
node server.js
```

If the loading, takes too long :

Press `Ctrl + c` to stop the server. Re-run it again by:

```bash
node server.js
```

Server runs on:

```
http://localhost:3000
```

---

### 7 Run the Frontend

Make sure you are in the folder :

```bash
/Library-Management-System
```

```bash
npm run dev
```

Frontend runs on:

```
http://localhost:8080
```

---

## Demo Mode (No Backend)

The frontend can run without the backend using in-browser sample data.
This is the version deployed to GitHub Pages.

```bash
npm run dev:demo
```

Then open `http://localhost:8080/LMS/`.

Demo mode is enabled by `VITE_DEMO=true` in `.env.demo`. The mock API lives in
`src/lib/demo.ts` and follows the same rules as the backend (borrow limit of 3,
14-day loans, late fines, fine limit). All demo accounts use the password `demo1234`.

---

## Deployment (GitHub Pages)

Every push to `main` builds the demo and deploys it to GitHub Pages using
`.github/workflows/deploy.yml`.

One-time setup: in the repository go to **Settings → Pages → Build and deployment**
and set **Source** to **GitHub Actions**.

To build the demo locally:

```bash
npm run build:demo
```

---

## CORS Configuration

Backend allows frontend access:

```js
origin: "http://localhost:8080",
credentials: true
```

Frontend requests must include:

```js
credentials: "include"
```

---

## Testing (Manual)

* Use Postman to test APIs
* Validate:

  * Role restrictions
  * Borrow limits
  * Fine logic
  * Status enforcement

---

## Notes

* Backend is **fully completed**
* Frontend consumes backend APIs directly when run locally (`npm run dev`)
* Mock data is only used by the demo build (`npm run dev:demo` / GitHub Pages)
* Suitable for real-world extension

