# 🚀 HackMate — College-Exclusive Hackathon Teammate Matcher

**HackMate** is a college-exclusive web application where students find hackathon teammates by swiping — like a dating app, but purposefully engineered for building high-impact hackathon teams.

---

## 📋 Table of Contents
1. [Problem & Core Principles](#-1-problem--core-principles)
2. [Software Engineering Lifecycle](#-2-software-engineering-lifecycle)
   - [Requirements](#21-requirements)
   - [System Architecture & Design](#22-system-architecture--design)
   - [Database Schema (MongoDB / Mongoose)](#23-database-schema)
   - [Screen Flow](#24-screen-flow)
3. [Tech Stack](#-3-tech-stack)
4. [Project File Tree](#-4-project-file-tree)
5. [Installation & Setup](#-5-installation--setup)
6. [Environment Variables](#-6-environment-variables)
7. [REST API Documentation](#-7-rest-api-documentation)
8. [Real-Time WebSocket Events (Socket.io)](#-8-real-time-websocket-events-socketio)
9. [Automated Testing Suite (Jest + Supertest)](#-9-automated-testing-suite)
10. [Deployment Guide](#-10-deployment-guide)
11. [Acceptance Criteria Verification](#-11-acceptance-criteria-verification)

---

## 🎯 1. Problem & Core Principles

### Problem
- Campus hackathon team formation is chaotic: large, noisy WhatsApp groups where requests get buried.
- No visibility into who is actually free and looking for a team for a **specific** hackathon.
- Teams assemble without checking skillsets, resulting in overlapping roles (e.g. 4 frontend devs) or critical gaps (e.g. no backend/ML engineer).

### Core Principles (Enforced in Code)
1. **College-Only**: Every user must be a verified college student. Enforced server-side by restricting signup and login strictly to Thapar University credentials (configured via `ALLOWED_EMAIL_DOMAIN=thapar.edu`).
2. **Swipe to Match & Rewind**: Draggable profile cards with smooth right (Team Up) and left (Pass) gestures, button controls, and a dedicated **Undo/Rewind button** (hotkey: `Z` / `Backspace`) to recover accidental skips.
3. **Intelligent Deck Ranking**: Candidates are ranked by an intelligent **Skill-Fit Algorithm** that scores role complementarity, tech stack synergy, and reciprocal interest so high-synergy teammates appear at the top.
4. **Event-Based**: Teammate discovery and matching happen strictly per hackathon event, never globally.
5. **Chat Only After Mutual Match**: A private 1-on-1 conversation is unlocked only when **both** students have swiped right on each other for the **same** event. Unsolicited messages are blocked at both REST and WebSocket layers.

---

## 📐 2. Software Engineering Lifecycle

### 2.1 Requirements
- **Student Profile Management**: College email verification, branch, year of study, technical role(s), tech stack tags, academic details (CGPA), bio, GitHub/LinkedIn links, and availability toggle.
- **Hackathon Event Hub**: Event listing with dates, mode (in-person/online), team size limits, problem themes, and live participant counts.
- **Per-Event Participation**: Students join a specific hackathon and submit an optional project pitch note (e.g. *"Building hospital triage AI, need backend dev"*).
- **Candidate Swipe Deck**: Returns participants of that event excluding already swiped profiles, unavailable students, and self. Includes skill-fit hints and role/skill filters.
- **Mutual Matching Engine**: Idempotent swipe recording. Reciprocal right-swipes trigger an instant mutual match, persistent chat record, and live Socket.io celebration.
- **Private 1-on-1 Chat**: Socket.io real-time chat rooms with typing indicators, message persistence, and strict match access control.
- **Admin Event Controls**: Admin portal (`isAdmin: true`) to create, update, or close hackathon registrations.

### 2.2 System Architecture & Design
HackMate follows a clean layered architecture:
```
┌────────────────────────────────────────────────────────┐
│             React + Vite Mobile-First Client           │
│  (Events Hub | Swipe Deck | Matches & Chat | Profile)  │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP / REST + WebSockets
┌──────────────────────────▼─────────────────────────────┐
│                 Node.js + Express API                  │
│  ├── Auth Middleware (JWT + College Domain Validation) │
│  ├── Event Controller & Deck Engine                    │
│  ├── Swipe Controller & Mutual Match Resolution        │
│  ├── Private Match Message Controller                  │
│  └── Socket.io Real-Time Room Manager                  │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│        Dual Database Engine (Auto-Switching)           │
│  ├── Primary: MongoDB Atlas Cloud (Mongoose ODM)       │
│  └── Fallback: Resilient Local JSON File Adapter       │
│      (Guarantees zero-setup, zero-crash execution)     │
└────────────────────────────────────────────────────────┘
```

### 2.3 Database Schema

#### User
- `name`: String (Required)
- `email`: String (Unique, Lowercase, College Domain Validated)
- `password`: String (Bcrypt Hash)
- `branch`: String (CSE, IT, COE, AI/DS, ECE, EE, Mech, Biotech)
- `year`: String (1st–4th Year)
- `role`: String (Primary role)
- `roles`: [String] (Multi-select technical roles)
- `skills` / `techStack`: [String] (Technical skillset tags)
- `bio`: String (Pitch summary)
- `links`: `{ github: String, linkedin: String }`
- `cgpa`: Number (Optional academic metric)
- `isAdmin`: Boolean (Admin privileges flag)
- `isAvailable`: Boolean (Teammate search status)
- `avatar`: String (DiceBear avatar URL)

#### Event
- `title`: String (Required)
- `description` / `tagline`: String
- `date`: String
- `mode`: String (`"online"` | `"offline"`)
- `location`: String
- `teamSize`: Number (Team size limit, default 4)
- `status`: String (`"upcoming"` | `"closed"`)
- `type`: String (Default `"hackathon"`, extensible for study groups)
- `theme`: String
- `participantsCount`: Number

#### EventParticipation
- `user`: String (Ref: User, Required)
- `event`: String (Ref: Event, Required)
- `note`: String (Optional pitch: idea, needed roles)
- `joinedAt`: Date
- *Compound Unique Index*: `(user, event)`

#### Swipe
- `swiper`: String (Ref: User, Required)
- `target`: String (Ref: User, Required)
- `event`: String (Ref: Event, Required)
- `direction`: String (`"right"` | `"left"`)
- *Compound Unique Index*: `(swiper, target, event)` (Enforces idempotency)

#### Match
- `users`: [String] (Sorted pair `[userA, userB].sort()`)
- `event`: String (Ref: Event, Required)
- `lastMessage`: String
- `lastMessageAt`: Date
- *Compound Unique Index*: `(users, event)`

#### Message
- `match`: String (Ref: Match, Indexed, Required)
- `sender`: String (Ref: User, Required)
- `text`: String (Required)
- `createdAt`: Date

### 2.4 Screen Flow
```
[ Login / Register (College Domain) ]
               │
               ▼
   [ Hackathon Events Hub ] ──(Join Event)──► [ Swipe Deck (Cards) ]
               │                                      │
               │                            (Mutual Right Swipe)
               ▼                                      ▼
       [ User Profile ]                    [ "It's a Match!" Modal ]
               │                                      │
               ▼                                      ▼
    [ Admin Portal (if Admin) ]            [ Private 1-on-1 Chat ]
```

---

## 💻 3. Tech Stack

- **Frontend**: React 18, Vite 5, Tailwind CSS, Lucide React icons, Axios, Socket.io-client.
- **Backend**: Node.js, Express 4, Socket.io, JSON Web Token (JWT), bcryptjs, CORS, dotenv.
- **Database**: MongoDB (Mongoose 8) with automatic fallback to local JSON file adapter (`server/lib/localDb.js`).
- **Testing**: Jest 30, Supertest 7.

---

## 🗂️ 4. Project File Tree

```
hackmate/
├── client/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── .env.example
│   ├── .env
│   └── src/
│       ├── App.jsx                     # Root router & tab manager
│       ├── main.jsx                    # React entrypoint
│       ├── index.css                   # Tailwind styles & animations
│       └── components/
│           ├── Navbar.jsx              # Responsive navigation & mobile tab bar
│           ├── AuthForm.jsx            # Sign-in/register with domain validation
│           ├── EventsView.jsx          # Hackathon listing, details & join/leave
│           ├── SwipeDeck.jsx           # Draggable cards with skill-fit hints
│           ├── MatchesView.jsx         # Matches grouped by event & real-time chat
│           ├── ProfileCard.jsx         # Student profile setup & editor
│           ├── AdminEventsView.jsx     # Admin hackathon management
│           ├── MatchModal.jsx          # Celebratory match pop-up
│           ├── ChatBox.jsx             # Chat utility component
│           └── HackerList.jsx          # Directory view
├── server/
│   ├── server.js                       # Express app & Socket.io server
│   ├── seed.js                         # 32 students + 4 hackathons seeder
│   ├── test-flow.js                    # Quick E2E verification script
│   ├── package.json                    # Scripts: dev, start, seed, test
│   ├── .env.example
│   ├── .env
│   ├── lib/
│   │   └── localDb.js                  # Zero-setup JSON database adapter
│   ├── middleware/
│   │   └── auth.js                     # JWT auth & admin middleware
│   ├── models/
│   │   ├── User.js                     # Student schema & methods
│   │   ├── Event.js                    # Hackathon schema & methods
│   │   ├── EventParticipation.js       # Per-event student enrollment
│   │   ├── Swipe.js                    # Idempotent swipe model
│   │   ├── Match.js                    # Mutual match record
│   │   └── Message.js                  # Match chat messages
│   ├── routes/
│   │   ├── authRoutes.js               # Register, Login, Me
│   │   ├── eventRoutes.js              # Events, Deck, Swipe, Join/Leave
│   │   ├── matchRoutes.js              # Matches & match messages
│   │   ├── messageRoutes.js            # Message history & sending
│   │   ├── swipeRoutes.js              # Swipes feed & reset
│   │   └── userRoutes.js               # Profiles & student lookups
│   ├── tests/
│   │   └── hackmate.test.js            # Jest + Supertest automated tests
│   └── data/                           # Local JSON database storage
│       ├── users.json
│       ├── events.json
│       ├── event_participations.json
│       ├── swipes.json
│       ├── matches.json
│       └── messages.json
├── package.json                        # Root workspace scripts
└── README.md
```

---

## ⚡ 5. Installation & Setup

### 🚀 Quickest Way (One-Command Startup)

HackMate is configured for **zero-setup execution**. The server automatically seeds sample hackathons and verified student profiles on its very first run, and runs both frontend and backend concurrently with a single command:

#### Option A: Terminal (Any OS)
```bash
npm run dev
```
*(Or `npm start` — this launches the Express backend on `http://localhost:5000` and the Vite React frontend on `http://localhost:3000` together).*

#### Option B: Windows One-Click
Double-click `start.bat` (or run `.\start.ps1` in PowerShell). It verifies dependencies, launches both services, and automatically opens `http://localhost:3000` in your browser.

---

### 🛠️ Manual Step-by-Step Setup (Optional)

#### Step 1: Install Dependencies
```bash
npm run install-all
```

#### Step 2: Seed the Database
Populates 4 hackathons and 32 student profiles with default password `password123`:
```bash
npm run seed
```

#### Step 3: Run the Services
- **Both simultaneously**: `npm run dev`
- **Server only**: `npm run server` (port 5000)
- **Client only**: `npm run client` (port 3000)
Seed 4 sample hackathons, 32 verified student profiles, and event participations:
```bash
npm run seed
```
*(Or from server directory: `cd server && npm run seed`)*

### Step 3: Start the Backend Server
```bash
npm run server
```
*Backend runs on `http://localhost:5000`.*

### Step 4: Start the Frontend Client
In a separate terminal:
```bash
npm run client
```
*Frontend runs on `http://localhost:5173` (or `http://localhost:3000`).*

---

## 🔑 6. Environment Variables

### Backend (`server/.env`)
```env
# Server Port
PORT=5000

# MongoDB URI (leave empty to use resilient zero-setup local JSON fallback)
MONGO_URI=mongodb://localhost:27017/hackmate

# JWT Secret
JWT_SECRET=hackmate_super_secret_jwt_key_12345

# Allowed College Domains (comma-separated or single domain)
ALLOWED_EMAIL_DOMAIN=campus.edu,thapar.edu

# Client Application URL
CLIENT_URL=http://localhost:5173
```

### Frontend (`client/.env`)
```env
VITE_API_BASE=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

---

## 📡 7. REST API Documentation

All API endpoints are prefixed with `/api`. Protected routes require header:
`Authorization: Bearer <JWT_TOKEN>`.

### Authentication & Profile
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register student with college domain email |
| `POST` | `/api/auth/login` | Public | Authenticate student & receive JWT |
| `GET` | `/api/auth/me` | Protected | Get authenticated student's profile |
| `GET` | `/api/profile` | Protected | Fetch current student's full profile |
| `PUT` | `/api/profile` | Protected | Update profile, branch, year, skills, links |

### Hackathon Events & Swipe Deck
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/events` | Public | List all campus hackathons |
| `GET` | `/api/events/:id` | Public | Get single hackathon details |
| `POST` | `/api/events` | Admin | Create a new campus hackathon |
| `PUT` | `/api/events/:id` | Admin | Edit hackathon or toggle status |
| `POST` | `/api/events/:id/join` | Protected | Join hackathon with optional pitch note |
| `DELETE` | `/api/events/:id/join` | Protected | Leave hackathon swipe pool |
| `GET` | `/api/events/:id/deck` | Protected | Get eligible candidates ranked by Skill-Fit AI |
| `POST` | `/api/events/:id/swipe` | Protected | Submit right/left swipe; creates match if mutual |
| `POST` | `/api/events/:id/rewind` | Protected | Undo/rewind last swipe and restore candidate |

### Matches & Private Chat
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/matches` | Protected | Get confirmed matches for current user |
| `GET` | `/api/matches/:id` | Protected | Get match conversation details |
| `GET` | `/api/matches/:id/messages` | Protected | Get chat history (blocks non-matched users) |
| `POST` | `/api/matches/:id/messages` | Protected | Send message (blocks non-matched users) |

---

## 🔌 8. Real-Time WebSocket Events (Socket.io)

| Event Name | Direction | Payload | Description |
|---|---|---|---|
| `joinUser` | Client ➔ Server | `userId` | User joins personal room for instant notifications |
| `join` / `joinMatch` | Client ➔ Server | `{ matchId, userId }` | Joins private match room (verified) |
| `leaveMatch` | Client ➔ Server | `matchId` | Leaves private match room |
| `typing` | Client ➔ Server ➔ Client | `{ matchId, senderId, isTyping }` | Typing indicator broadcast |
| `message` / `sendPrivateMessage` | Client ➔ Server | `{ matchId, senderId, text }` | Sends 1-on-1 private message |
| `receivePrivateMessage` | Server ➔ Room | `{ _id, match, sender, text, createdAt }` | Delivers message to room |
| `match` | Server ➔ User Room | `{ match, matchedUser, event }` | Instant popup notification on mutual match |

---

## 🧪 9. Automated Testing Suite

HackMate comes with a comprehensive **Jest + Supertest** test suite verifying all 5 core acceptance criteria.

To execute the tests:
```bash
npm run test
```
*(Or inside `server`: `cd server && npm test`)*

### Tested Scenarios
1. **College-Only Domain Check**:
   - Rejects non-college email (`intruder@gmail.com`) with `400 Bad Request`.
   - Rejects unauthorized domain (`spammer@yahoo.com`).
   - Accepts verified college domain (`student@campus.edu`).
2. **Deck Endpoint & No Repeat Profiles**:
   - Deck returns only participants enrolled in the specific event.
   - Once a profile is swiped, it **never** reappears in that event's deck.
3. **Swipe Idempotency**:
   - Double right-swipes on the same target and event do not throw errors or duplicate entries.
4. **Mutual Match Creation**:
   - Right swipe by User 1 is recorded as pending.
   - Reciprocal right swipe by User 2 triggers a `Match` document and live event.
   - Additional swipes do not create duplicate matches.
5. **Chat Security**:
   - Matched users can read and send messages.
   - Non-matched third-party users receive `403 Forbidden` on both GET and POST message endpoints.

---

## 🚀 10. Deployment Guide

### Frontend (Vercel or Netlify)
1. Set the root directory to `client`.
2. Build command: `npm run build`.
3. Output directory: `dist`.
4. Environment variables:
   - `VITE_API_BASE`: `https://your-backend.onrender.com/api`
   - `VITE_SOCKET_URL`: `https://your-backend.onrender.com`

### Backend (Render or Railway)
1. Set the root directory to `server`.
2. Build command: `npm install`.
3. Start command: `node server.js`.
4. Environment variables:
   - `PORT`: `5000`
   - `MONGO_URI`: `mongodb+srv://<username>:<password>@cluster.mongodb.net/hackmate?retryWrites=true&w=majority`
   - `JWT_SECRET`: Your production secret
   - `ALLOWED_EMAIL_DOMAIN`: `yourcollege.edu,thapar.edu`
   - `CLIENT_URL`: `https://your-hackmate.vercel.app`

---

## ✅ 11. Acceptance Criteria Verification

| Acceptance Criterion | Implementation & Verification | Status |
|---|---|:---:|
| **Non-college email cannot register** | Enforced in `server/routes/authRoutes.js` using `validateEmailDomain()`. Verified by Jest test suite (400 Bad Request on gmail/yahoo). | **PASS** ✅ |
| **Pick event, see only event's participants** | `GET /api/events/:id/deck` filters by `EventParticipation` for that specific event ID. Verified in test suite and UI. | **PASS** ✅ |
| **No repeat profiles in deck; double swipes idempotent** | Swipes tracked with unique compound index `(swiper, target, event)`. Swiped IDs excluded via Set lookup. | **PASS** ✅ |
| **Mutual right-swipe creates 1 match & notifies in real time** | Server detects reciprocal right swipe, saves single sorted-pair `Match`, emits `match` socket event. | **PASS** ✅ |
| **Chat impossible between non-matched users** | Verified in REST (`GET/POST /api/matches/:id/messages` checks membership; returns `403`) and socket room join. | **PASS** ✅ |
| **Messages arrive instantly and persist across reloads** | Emitted over WebSockets via Socket.io rooms and persisted to database. Reloads fetch history via REST. | **PASS** ✅ |
| **App usable on a phone screen** | Responsive mobile-first layout with touch/pointer swipe gestures and a fixed bottom tab bar on mobile screens. | **PASS** ✅ |
