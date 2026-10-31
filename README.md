# TaskForge — Multi-Tenant Project Management

TaskForge is a React and Express application for teams to manage projects in isolated organization workspaces. MongoDB stores users, projects, tasks, and task activity history.

## Features

- Workspace registration and joining with a workspace ID.
- JWT authentication with password hashes excluded from API responses.
- Owner, manager, and member permissions enforced by the API.
- Project creation, editing, and transactional deletion of associated tasks/history.
- Project archive/restore with active, archived, and all-project views and read-only task history.
- Tasks with assignees, priorities, due dates, status, and completion attribution.
- Task editing/deletion, search, and status/priority/assignee filters.
- Table and Kanban views with project completion and overdue-task metrics.
- Recent task activity with actors, timestamps, and before/after changes.
- Automated backend integration tests and frontend interaction, lint, and build checks.

## Requirements

- Node.js 24 and npm (the repository includes `.nvmrc`).
- A MongoDB replica set, such as MongoDB Atlas, or Docker with Compose for the local database below. Transactions are required for task mutations and project deletion; a standalone MongoDB server is insufficient.

## Run locally

### 1. Start MongoDB

From the repository root:

```sh
docker compose up -d --wait
```

Compose initializes a single-node replica set, binds the database to `127.0.0.1:27017`, and persists data in a named volume. This database configuration is for local development. An existing Atlas replica set can be used instead by setting its connection string in `MONGO_URI`.

### 2. Configure and start the backend

Copy `backend/.env.example` to `backend/.env`. PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
```

macOS/Linux:

```sh
cp backend/.env.example backend/.env
```

Generate a JWT secret and paste it into the `JWT_SECRET` value in `backend/.env`:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Then run:

```sh
cd backend
npm ci
npm run dev
```

The backend starts at `http://localhost:5000` after connecting to MongoDB. Startup fails if required configuration is missing or the database cannot be reached. Changing the JWT secret invalidates existing sessions.

### 3. Start the frontend

In a second terminal:

```sh
cd frontend
npm ci
npm run dev
```

Open `http://localhost:5173`. The frontend defaults to `http://localhost:5000/api`. To change it, copy `frontend/.env.example` to `frontend/.env` and set `VITE_API_URL`, including `/api`. Restart Vite after changing frontend environment variables. If Vite selects another port, add that origin to backend `CLIENT_ORIGINS` or free port 5173.

### 4. Try the workflow

1. Register and choose **Create Workspace** to become its owner.
2. Create a project and add tasks with a priority, assignee, and due date.
3. Share the workspace ID with a teammate, who registers using **Join Existing**. The workspace ID currently acts as the join credential; share it only with intended team members.
4. Use **Manage Team** to promote a member to manager.
5. Switch between table and board views, filter tasks, change status, and inspect recent activity.

### Stop the local database

```sh
docker compose down
```

The named volume preserves data between starts.

## Configuration

| Variable | Location | Purpose |
| --- | --- | --- |
| `MONGO_URI` | Backend | Required MongoDB replica-set connection string. |
| `JWT_SECRET` | Backend | Required randomly generated signing secret of at least 32 characters. |
| `PORT` | Backend | API port; defaults to `5000`. |
| `CLIENT_ORIGINS` | Backend | Comma-separated HTTP(S) frontend origins. Defaults to localhost/127.0.0.1 port 5173 in development; required in production. |
| `NODE_ENV` | Backend | Set to `production` for deployed environments. |
| `VITE_API_URL` | Frontend | API base URL including `/api`; baked into the frontend at build time. |

Never put database credentials or JWT signing secrets in frontend variables. Real `.env` files are ignored by Git; `.env.example` templates contain no credentials. Production deployments should use HTTPS and their actual frontend origin.

## Permissions

| Action | Owner | Manager | Member |
| --- | --- | --- | --- |
| View workspace projects, tasks, team, activity | Yes | Yes | Yes |
| Create/edit projects | Yes | Yes | No |
| Archive/restore projects | Yes | Yes | No |
| Delete projects and associated tasks/history | Yes | No | No |
| Create/edit task content, assignment, priority, due date | Yes | Yes | No |
| Change task status | Yes | Yes | Yes |
| Delete tasks | Yes | Yes | No |
| Change member/manager roles | Yes | No | No |

Owners cannot be demoted through role management. Workspace IDs, project membership, creator IDs, and completion attribution cannot be changed through update payloads. Task assignees must belong to the current workspace.

## API overview

Protected routes require `Authorization: Bearer <token>`. IDs are MongoDB ObjectIds. Due dates use `YYYY-MM-DD`; send `null` to clear a due date or assignee.

| Method | Route | Description |
| --- | --- | --- |
| POST | `/api/auth/register` | Register with `name`, `email`, `password`, and either `organizationName` or `orgId`. |
| POST | `/api/auth/login` | Sign in with email/password; receive a token and sanitized user. |
| GET | `/api/auth/me` | Current user. |
| GET / POST | `/api/projects` | List/create workspace projects. |
| PUT / DELETE | `/api/projects/:id` | Edit/delete a workspace project. |
| PUT | `/api/projects/:id/archive` | Owner/manager archives or restores a project with `{ "archived": true }` or `{ "archived": false }`. |
| GET | `/api/projects/:id/activity` | Latest 50 task events for an accessible project. |
| GET / POST | `/api/tasks` | List/create tasks. |
| PUT / DELETE | `/api/tasks/:id` | Edit/delete an accessible task. |
| GET | `/api/users` | Workspace team. |
| PUT | `/api/users/:id/role` | Set `role` to `manager` or `member`. |
| GET | `/api/ping` | Process liveness. |
| GET | `/api/ready` | Database connection readiness (200 or 503). |

Task listing accepts combined `projectId`, `status`, `priority`, `assignedTo`, and `q` query parameters. Search treats text literally. The interface filters the loaded project's tasks locally. Existing tasks without planning metadata appear as medium priority, unassigned, and without a due date. Activity history starts with changes made after the feature is installed.

## Archive completed projects

Owners and managers can choose **Archive** on a project card. Archived projects leave the default active view; use **Project status → Archived projects** to open them or restore them. All workspace roles can still read their tasks and task activity. Project edits and task creation, editing, status changes, and deletion return HTTP 409 while the project is archived. Table and board controls are read only. Restore the project to resume those operations under the usual role permissions.

Archiving preserves all tasks and history. A task transaction that loses a race with archiving is rolled back, including any activity entry. An owner can still choose **Delete** to permanently remove an archived project and its associated data after confirmation.

`GET /api/projects` returns active projects by default. Use `?archived=true` for archived projects, `?archived=false` for active projects, or `?archived=all` for both. Unsupported or repeated archive filter values return HTTP 400. The interface loads both groups and filters locally. Existing projects without `archivedAt` remain active without a data migration. Deploy the frontend and backend together so the interface can access the archive/restore endpoint and display read-only controls.

## Validation

Backend:

```sh
cd backend
npm ci
npm test
```

Tests launch a disposable single-node MongoDB replica set; they do not use `MONGO_URI` or modify your application database. The first run may download a MongoDB binary and requires network access. Coverage includes authentication, tenant isolation, role restrictions, planning validation, transactional cleanup, activity rollback, configuration, and CORS.

Frontend:

```sh
cd frontend
npm ci
npm run lint
npm test
npm run build
```

GitHub Actions runs these checks for pushes and pull requests. For production, serve `frontend/dist` with SPA fallback routing to `index.html`, set the production API URL before building, and run `npm start` in `backend` with the configured environment.

## Project layout

```text
backend/src/config       Environment, database, and token configuration
backend/src/controllers Request handlers
backend/src/middleware  Authentication and role checks
backend/src/models      Workspace, user, project, task, and activity models
backend/src/routes      API routes
backend/src/utils       Input validation and transactional activity helpers
backend/test            Database-backed integration tests
frontend/src/components Project/task views, forms, board, progress, and history
frontend/src/pages      Authentication and dashboard pages
.github/workflows       Automated quality checks
compose.yaml            Local MongoDB replica set
```
