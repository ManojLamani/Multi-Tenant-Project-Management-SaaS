# TaskForge

**Multi-tenant project management with isolated workspaces, team roles, and task tracking.**

[![Quality checks](https://github.com/ManojLamani/Multi-Tenant-Project-Management-SaaS/actions/workflows/quality.yml/badge.svg?branch=main)](https://github.com/ManojLamani/Multi-Tenant-Project-Management-SaaS/actions/workflows/quality.yml)

[Quick start](#quick-start) · [Features](#features) · [API](#api) · [Deployment](#deployment) · [Contributing](CONTRIBUTING.md)

TaskForge is a full-stack MVP built with React, Express, and MongoDB. Each account belongs to one workspace, and the API scopes project, task, team, invitation, and activity access to that workspace.

## Features

- **Team workspaces:** create a workspace, invite new teammates, and manage owner, manager, and member roles.
- **Projects:** create, edit, archive, restore, or permanently delete projects and their associated tasks/history.
- **Task planning:** assign teammates, set priorities and due dates, search tasks, and filter by status, priority, or assignee.
- **Table and board views:** update task status and review completion progress and overdue tasks.
- **Activity history:** inspect recent task changes with actors, timestamps, and before/after values.
- **Access controls:** JWT authentication, hashed passwords, tenant-scoped queries, and API-enforced role permissions.

| Layer | Stack |
| --- | --- |
| Frontend | React, Vite, React Router, Axios |
| Backend | Node.js, Express, JWT, bcrypt |
| Database | MongoDB replica set, Mongoose |
| Checks | Node.js integration tests, Vitest, Testing Library, ESLint, GitHub Actions |

## Quick start

You need **Node.js 24**, npm, and either **Docker with Compose** or an existing **MongoDB replica set**. The included `.nvmrc` specifies Node.js 24. A standalone MongoDB server cannot run the transactions used by registration, invitations, task changes, and project deletion.

### 1. Clone and configure

```sh
git clone https://github.com/ManojLamani/Multi-Tenant-Project-Management-SaaS.git
cd Multi-Tenant-Project-Management-SaaS
```

Copy the environment templates. PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

macOS/Linux:

```sh
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Generate a signing secret and paste the output into `JWT_SECRET` in `backend/.env`:

```sh
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

### 2. Start the database and API

From the repository root:

```sh
docker compose up -d --wait
cd backend
npm ci
npm run dev
```

Compose starts a local MongoDB replica set at `127.0.0.1:27017` and stores its data in a named volume. To use an existing replica set instead, set `MONGO_URI` in `backend/.env` and skip the Compose command.

The API starts at `http://localhost:5000` after connecting to the database. Startup fails when required configuration is invalid or the database cannot be reached.

### 3. Start the frontend

In another terminal, from the repository root:

```sh
cd frontend
npm ci
npm run dev
```

Open **http://localhost:5173**. The frontend defaults to `http://localhost:5000/api`. If Vite uses another port, add its origin to `CLIENT_ORIGINS` and restart the backend. Restart Vite after changing frontend environment variables.

### 4. Try the team workflow

1. Register with **Create Workspace** to become its owner, then sign in.
2. Create a project and add tasks with assignees, priorities, and due dates.
3. Open **Manage Team → Invite a teammate**, create an email-specific link, and share it privately. The recipient registers with the invited email and then signs in.
4. Promote a member to manager through **Manage Team** when needed.
5. Switch between table and board views, filter tasks, and inspect task activity.
6. Archive a completed project. Use **Project status → Archived projects** to view or restore it.

To stop the local database, run `docker compose down` from the repository root. The named volume preserves data between starts.

## Configuration

| Variable | Where | Value |
| --- | --- | --- |
| `MONGO_URI` | Backend | Required MongoDB replica-set connection string. |
| `JWT_SECRET` | Backend | Required random signing secret of at least 32 characters. Changing it invalidates existing sessions. |
| `PORT` | Backend | API port; defaults to `5000`. |
| `CLIENT_ORIGINS` | Backend | Comma-separated frontend HTTP(S) origins. Defaults to localhost/127.0.0.1 port 5173 in development; required in production. |
| `NODE_ENV` | Backend | Set to `production` for deployments. |
| `VITE_API_URL` | Frontend | API base URL ending in `/api`; embedded at build time. |

Real `.env` files are ignored by Git. Keep database credentials and JWT secrets on the backend; `VITE_*` values are visible to the browser.

## Permissions

| Action | Owner | Manager | Member |
| --- | --- | --- | --- |
| View workspace projects, tasks, team, and activity | Yes | Yes | Yes |
| Create/edit projects; archive/restore projects | Yes | Yes | No |
| Permanently delete projects and their tasks/history | Yes | No | No |
| Create/edit task content, assignment, priority, and due date | Yes | Yes | No |
| Change task status | Yes | Yes | Yes |
| Delete tasks | Yes | Yes | No |
| Change member/manager roles | Yes | No | No |
| Create/list/revoke invitations | Yes | No | No |

Owners cannot be demoted through role management. Task assignees must belong to the current workspace. Update payloads cannot transfer records between workspaces or change a task's project or completion attribution.

### Invitations

Invitations are bound to an email address, expire after **seven days**, and can be accepted once. The owner copies and shares the link manually; the application does not send email. Raw codes are shown only when created, while the database stores their SHA-256 hashes. Accepting an invitation and creating its member account happen in one transaction.

Owners can revoke pending invitations or generate a replacement that invalidates the previous link. The list shows the latest 50 invitations. This flow creates new accounts; an existing account cannot join a second workspace.

**Registration compatibility:** workspace IDs no longer grant membership. Clients joining a workspace must send `inviteToken` instead of `orgId`. Creating a workspace still uses `organizationName`; existing users can sign in normally.

### Archived projects

Archived projects retain their tasks and activity in read-only table and board views. Project edits and all task mutations, including status changes, return HTTP **409** until an owner or manager restores the project. An owner can still permanently delete an archived project after confirmation.

The project list defaults to active projects; choose **Archived projects** or **All projects** to browse the others. Existing projects without archive metadata remain active without a migration.

## API

Protected endpoints require `Authorization: Bearer <token>`. IDs are MongoDB ObjectIds. Due dates use `YYYY-MM-DD`; send `null` to clear an assignee or due date.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Register with `name`, `email`, `password`, and either `organizationName` or `inviteToken`. |
| POST | `/api/auth/login` | Return a token and a user without a password hash. |
| GET | `/api/auth/me` | Current user. |
| GET / POST | `/api/projects` | List/create projects. |
| PUT / DELETE | `/api/projects/:id` | Edit/permanently delete a project. |
| PUT | `/api/projects/:id/archive` | Archive or restore with `{ "archived": true }` or `{ "archived": false }`. |
| GET | `/api/projects/:id/activity` | Latest 50 task events. |
| GET / POST | `/api/tasks` | List/create tasks. |
| PUT / DELETE | `/api/tasks/:id` | Edit/delete a task. |
| GET | `/api/users` | Workspace team. |
| PUT | `/api/users/:id/role` | Set `role` to `manager` or `member`. |
| POST | `/api/invitations` | Create with `{ "email": "teammate@example.com" }`; return metadata and the raw code. |
| GET | `/api/invitations` | Latest 50 invitations, without codes or hashes. |
| DELETE | `/api/invitations/:id` | Revoke a pending invitation; return 204. |
| GET | `/api/ping` | Process liveness. |
| GET | `/api/ready` | Database readiness; return 200 or 503. |

Project listing accepts `archived=false` (default), `archived=true`, or `archived=all`. Task listing combines `projectId`, `status`, `priority`, `assignedTo`, and `q`; search treats text literally. The frontend filters the loaded project/task lists locally.

Existing tasks without planning metadata appear as medium priority, unassigned, and without a due date. Activity history records changes made after activity tracking was introduced.

## Validation

Backend, from the repository root:

```sh
cd backend
npm ci
npm test
npm audit --omit=dev --audit-level=high
```

Frontend, in another terminal from the repository root:

```sh
cd frontend
npm ci
npm run lint
npm test
npm run build
npm audit --omit=dev --audit-level=high
```

Backend integration tests use a disposable MongoDB replica set and do not use `MONGO_URI` or modify the application database. The first run may download a MongoDB binary. Coverage includes authentication, tenant isolation, roles, invitations, archive/restore, concurrent mutations, transaction rollback, validation, and CORS. Frontend tests cover interactions, permissions, loading/retry states, and stale-response handling.

GitHub Actions runs tests, production dependency audits, lint, and the frontend build on pushes and pull requests. Contribution-label checks can also be run from the repository root:

```sh
node --test .github/scripts/contribution-labels.test.cjs
```

## Deployment

- **Frontend:** build `frontend` with `npm run build` and serve `dist`. Set `VITE_API_URL` to the HTTPS backend URL ending in `/api` before building. Configure SPA fallback routing to `index.html` for direct `/register` and `/dashboard` requests, including invitation links.
- **Backend:** install dependencies in `backend`, configure the environment, and run `npm start` with `NODE_ENV=production`. Use a MongoDB replica set and include the deployed frontend origin in `CLIENT_ORIGINS`.
- **Vercel:** use `frontend` as the Root Directory, the Vite preset, and `dist` as the output directory. The included `frontend/vercel.json` rewrites client routes to `index.html`, including `/register#invite=...` invitation links whose fragments are read by the browser after the page loads.
- **Verify:** check `/api/ping` and `/api/ready`, direct page loads, login, and a complete owner/member workflow. Deploy frontend and API changes together when their contracts change.

**Verification status:** the 31 October 2026 audit passed local full-stack checks, but public API health probes timed out and direct frontend routes returned 404. Production end-to-end verification remains pending; passing CI alone does not establish deployment readiness.

## Project structure

```text
backend/src/          API controllers, routes, middleware, models, and utilities
backend/test/         Database-backed integration tests
frontend/src/         React pages, components, API client, and interaction tests
.github/              Quality checks, contribution labels, and issue/PR templates
compose.yaml          Local MongoDB replica set
CONTRIBUTING.md       Contribution workflow, labels, and Project board automation
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for focused pull requests, automatic labels, and GitHub Project workflows.
