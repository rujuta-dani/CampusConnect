# CampusConnect — Campus Collaboration & Networking Platform

CampusConnect is a full-stack web platform designed for university ecosystems to streamline student networking, academic discussions, club governance, event management, project collaboration, and administrative moderation.

---

## 🚀 Key Features & Modules

- **Authentication & RBAC**: Secure JWT-based authentication supporting multi-role access control (`student`, `faculty` / `teacher`, `club`, `admin`).
- **Profile & Skill Directory**: Customizable user profiles with bio, department, graduation year, social links, avatar management, and searchable skill tags.
- **Mutual Connections & Networking**: Bidirectional connection requests, mutual connection discovery, and personalized connection recommendations.
- **Social Feed & Interactive Posts**: Social feed with text and image posts, real-time likes, comments, and a 60-second grace period soft-delete undo mechanism.
- **Clubs & Communities**: Chapter creation with an administrative approval pipeline (`pending` ➔ `approved` / `rejected` / `changes_requested`), multi-tiered roles (`owner`, `moderator`, `member`), and internal community discussions.
- **Campus Events & RSVPs**: Event publishing with admin approval verification, attendee registration tracking, capacity limits, and venue coordination.
- **Project Collaboration Marketplace**: Recruitment portal for student projects, hackathons, and research initiatives with multi-skill matching and applicant management.
- **Real-Time Messaging & Chat**: Direct 1-on-1 chats (protected by connection gating and block settings), community group chats, and collaboration team channels with file attachments.
- **Resource Hub & Document Repository**: Secure upload and download of academic materials (.pdf, .docx, .pptx) with permission scoping and download analytics.
- **Faculty Portal & Official Notices**: Verified teacher directory with department office hours and targeted broadcast notices to specific student groups.
- **Moderation & User Governance**: Profile-level reporting, automated user blocking, warning issuances, and account status management (active, suspended, banned).
- **Administrative Governance & Audit Trails**: Centralized dashboard for platform metrics, moderation queues, content approval pipelines, and audit logging.
- **Platform Analytics**: Interactive visual insights for 30-day user growth, daily active users (DAU), engagement trends, and top skills.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Backend** | Python 3.12, FastAPI, SQLAlchemy ORM, Uvicorn, Passlib (Bcrypt), PyJWT, WebSockets |
| **Database** | MySQL 8.x / 9.x |
| **Frontend** | React 18, Vite, React Router v6, Tailwind CSS, Lucide Icons, Recharts, Axios |
| **Architecture** | RESTful APIs + WebSocket Endpoints, Client-side State Management via Context API |

---

## 📁 Project Structure

```
Campus-Connect/
├── backend/
│   ├── app/
│   │   ├── auth/                # JWT handler & authentication dependencies
│   │   ├── database/            # Database engine, session maker & init migrations
│   │   ├── models/              # SQLAlchemy database ORM models
│   │   ├── routes/              # FastAPI router endpoints for all modules
│   │   ├── schemas/             # Pydantic request and response schemas
│   │   ├── services/            # Core business logic layer
│   │   ├── utils/               # Password hashing & error handlers
│   │   └── main.py              # FastAPI application initialization & middleware
│   ├── uploads/                 # Static media storage directories
│   ├── seed_mitwpu.py           # Database demo seeder script
│   ├── requirements.txt         # Python backend dependencies
│   └── .env.example             # Backend environment variable template
├── frontend/
│   ├── public/                  # Public static assets
│   ├── src/
│   │   ├── components/          # Reusable UI components & layouts
│   │   ├── context/             # AuthContext, NotificationContext, UndoDeleteContext
│   │   ├── pages/               # Application page views
│   │   ├── routes/              # Protected route guards
│   │   ├── services/            # Axios API service interfaces
│   │   ├── styles/              # Global styles & Neobrutalist design tokens
│   │   ├── App.jsx              # Application router configuration
│   │   └── main.jsx             # React DOM entry point
│   ├── package.json             # Frontend dependencies and scripts
│   └── vite.config.js           # Vite build and dev server configuration
└── README.md                    # Project documentation
```

---

## ⚙️ Getting Started & Setup Guide

### Prerequisites
- **Python 3.10+** (Python 3.12 recommended)
- **Node.js 18+** & **npm**
- **MySQL Server 8.0+** running locally or remotely

---

### 1. Database Configuration

1. Log into your MySQL server and create a database:
   ```sql
   CREATE DATABASE campusconnect CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

---

### 2. Backend Setup

1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # On macOS/Linux:
   python3 -m venv venv
   source venv/bin/activate

   # On Windows:
   python -m venv venv
   venv\Scripts\activate
   ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your MySQL credentials:
   ```env
   DB_HOST=localhost
   DB_PORT=3306
   DB_NAME=campusconnect
   DB_USER=root
   DB_PASSWORD=your_mysql_password

   JWT_SECRET_KEY=your_secure_jwt_secret_key_here
   JWT_ALGORITHM=HS256
   JWT_ACCESS_TOKEN_EXPIRE_MINUTES=1440
   ```

5. Seed demo dataset (Optional but Recommended):
   ```bash
   python seed_mitwpu.py
   ```

6. Start the FastAPI backend server:
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```
   * The API will be available at: `http://localhost:8000`
   * Interactive Swagger Documentation: `http://localhost:8000/docs`
   * ReDoc Documentation: `http://localhost:8000/redoc`

---

### 3. Frontend Setup

1. In a new terminal window, navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```

2. Install Node dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   * Open your browser and navigate to: `http://localhost:5173`

---

## 👥 Demo User Accounts (Seeded via `seed_mitwpu.py`)

All seeded demo accounts share the password: `password123`

| Role | Name | Email | Permissions / Access |
|---|---|---|---|
| **Student** | Prapti Dodal | `prapti@gmail.com` | Feed, Profile, Connections, Clubs, Events, Collaborations, Chat |
| **Student** | Rujuta Dani | `rujuta@gmail.com` | Feed, Profile, Connections, Projects, Applications |
| **Student** | Swapnil Joshi | `swapnil@gmail.com` | Student Chapter Member, Event Attendee |
| **Admin** | Student Council Admin | `council@mitwpu.edu.in` | Full Administrative Governance, Approvals, Moderation Queue |
| **Faculty** | Dr. Rajesh Kulkarni | `rajesh.kulkarni@mitwpu.edu.in` | Faculty Portal, Official Notice Broadcast, Analytics |

---

## 🧪 Production Build Verification

To verify that the frontend compiles cleanly for production:

```bash
cd frontend
npm run build
```
Build output will be generated in `frontend/dist/`.

---

## 📄 License
This project is developed for academic evaluation purposes. All rights reserved.
