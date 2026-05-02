# ⚡ TaskFlow — Team Task Manager

A full-stack team task management app with role-based access control (Admin/Member), built with **Node.js + Express + PostgreSQL** on the backend and **React + Vite** on the frontend.

---

## 🚀 Live Demo

> **[Live URL will be here after Railway deployment]**

---

## ✨ Features

- **Authentication** — Secure JWT-based signup & login
- **Projects** — Create, edit, and delete projects with member management
- **Role-Based Access Control** — Admin (full control) vs Member (create/update tasks)
- **Tasks** — Full CRUD with status (To Do / In Progress / Done), priority, assignee, and due dates
- **Kanban Board** — Visual task management across three columns
- **Dashboard** — Personal task view with overdue detection and stats
- **Team Management** — Add/remove members, promote to admin

---

## 🏗️ Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Frontend   | React 18, Vite, React Router v6   |
| Backend    | Node.js, Express.js               |
| Database   | PostgreSQL                        |
| Auth       | JWT (jsonwebtoken) + bcryptjs     |
| Deployment | Railway                           |

---

## 🗄️ Database Schema

```sql
users           — id, name, email, password_hash, created_at
projects        — id, name, description, owner_id, created_at
project_members — project_id, user_id, role (admin|member)
tasks           — id, project_id, title, description, status, priority,
                  assigned_to, due_date, created_by, created_at
```

---

## 🔐 Role-Based Access

| Action                        | Admin | Member |
|-------------------------------|:-----:|:------:|
| View project & tasks          | ✅    | ✅     |
| Create tasks                  | ✅    | ✅     |
| Update any task               | ✅    | ✅     |
| Delete own tasks              | ✅    | ✅     |
| Delete any task               | ✅    | ❌     |
| Add/remove team members       | ✅    | ❌     |
| Edit/delete project           | ✅    | ❌     |

---

## 📡 API Reference

### Auth
| Method | Endpoint           | Description       |
|--------|-------------------|-------------------|
| POST   | /api/auth/signup  | Register new user |
| POST   | /api/auth/login   | Login & get token |

### Projects
| Method | Endpoint                         | Description              |
|--------|----------------------------------|--------------------------|
| GET    | /api/projects                    | List user's projects     |
| GET    | /api/projects/:id                | Get project + members    |
| POST   | /api/projects                    | Create project (admin)   |
| PUT    | /api/projects/:id                | Update project (admin)   |
| DELETE | /api/projects/:id                | Delete project (admin)   |
| POST   | /api/projects/:id/members        | Add member (admin)       |
| PUT    | /api/projects/:id/members/:uid   | Update role (admin)      |
| DELETE | /api/projects/:id/members/:uid   | Remove member (admin)    |

### Tasks
| Method | Endpoint                          | Description              |
|--------|-----------------------------------|--------------------------|
| GET    | /api/tasks/dashboard              | My tasks (all projects)  |
| GET    | /api/tasks/project/:projectId     | Tasks in a project       |
| POST   | /api/tasks                        | Create task              |
| PUT    | /api/tasks/:id                    | Update task              |
| DELETE | /api/tasks/:id                    | Delete task              |

### Users
| Method | Endpoint           | Description       |
|--------|-------------------|-------------------|
| GET    | /api/users/me     | Get own profile   |
| PUT    | /api/users/me     | Update name       |
| GET    | /api/users/search | Search users      |

---

## 💻 Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL database

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_USERNAME/team-task-manager.git
cd team-task-manager

# 2. Install backend dependencies
cd backend && npm install

# 3. Configure environment
cp ../.env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET

# 4. Start backend (auto-creates tables)
npm run dev

# 5. In another terminal, install & start frontend
cd ../frontend && npm install && npm run dev
```

Frontend runs at `http://localhost:5173`, backend at `http://localhost:5000`.

---

## 🚂 Deploy to Railway

### Step 1 — Create Railway project
1. Go to [railway.app](https://railway.app) and sign in
2. Click **New Project** → **Deploy from GitHub repo**
3. Connect your GitHub and select this repo

### Step 2 — Add PostgreSQL
1. Click **+ New** → **Database** → **Add PostgreSQL**
2. Railway will automatically set `DATABASE_URL`

### Step 3 — Set environment variables
In your service settings → **Variables**, add:
```
JWT_SECRET=your-very-long-random-secret-string
NODE_ENV=production
```

### Step 4 — Deploy
Railway will automatically run `npm run build` then `npm start`.

Your app will be live at `https://your-app.up.railway.app` 🎉

---

## 📁 Project Structure

```
team-task-manager/
├── package.json          # Root — orchestrates build & start
├── railway.json          # Railway deployment config
├── .env.example          # Environment variables template
├── backend/
│   ├── server.js         # Express app entry point
│   ├── db.js             # PostgreSQL pool + schema init
│   ├── middleware/
│   │   └── auth.js       # JWT verification middleware
│   └── routes/
│       ├── auth.js       # Signup & login
│       ├── projects.js   # Project CRUD + member management
│       ├── tasks.js      # Task CRUD
│       └── users.js      # User profile & search
└── frontend/
    ├── vite.config.js    # Vite config + dev proxy
    ├── index.html        # HTML entry
    └── src/
        ├── App.jsx       # Router + private routes
        ├── index.css     # Global design system
        ├── api/index.js  # Axios with JWT interceptor
        ├── context/
        │   └── AuthContext.jsx
        ├── components/
        │   ├── Navbar.jsx
        │   ├── Modal.jsx
        │   └── TaskCard.jsx
        └── pages/
            ├── Login.jsx
            ├── Signup.jsx
            ├── Dashboard.jsx
            ├── Projects.jsx
            └── ProjectDetail.jsx
```

---

## 🛡️ Security

- Passwords hashed with **bcryptjs** (12 salt rounds)
- JWT tokens expire in **7 days**
- All API routes are protected via auth middleware
- Role checks enforced server-side on every mutation
- SQL injection prevented via **parameterized queries**

---

## 📄 License

MIT
