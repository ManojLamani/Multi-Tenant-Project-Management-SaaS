# Multi-Tenant Project Management SaaS (TaskForge)

**Student Name:** Manoj Chandrappa Lamani  
**Roll No:** 240410700117  
**Year & Section:** 2024 and 4A  
**Project Type:** Application Developer  
**Stack / Framework:** Node.js, Express.js, MongoDB, React.js + Vite  

---

## 🚀 Getting Started (How to Run Locally)

This project has separate `frontend` and `backend` directories. Follow these instructions to run the application locally.

### 1. Backend Setup
```bash
cd backend
npm install
npm run dev
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 📖 1. Problem Statement

### 1.1 Overview
Organizations require a centralized platform to manage projects, assign tasks, and track team progress efficiently. However, many existing tools are expensive, overly complex, or not customizable for small and medium teams. 

This project builds a scalable **Multi-Tenant Project Management SaaS** platform where multiple organizations can manage their projects independently using a single backend system with strict data isolation and role-based access control.

### 1.2 Why It Matters
Managing projects without structured systems leads to poor task tracking, lack of accountability, missed deadlines, and data confusion across teams. 
A multi-tenant SaaS platform ensures secure data isolation per organization, scalable architecture, cost-effective shared infrastructure, and controlled access via roles.

### 1.3 Key Inputs and Expected Outputs

| Inputs | Process | Expected Outputs |
| :--- | :--- | :--- |
| Organization registration details | Create tenant entry in MongoDB | Isolated organization workspace |
| User signup/login credentials | JWT authentication & bcrypt validation | Secure login token |
| Project details (Name, Description) | Store with tenantId mapping | Project dashboard listing |
| Task details (Title, Status, Priority) | Linked to project & tenant | Updated task board |
| Role assignment (Owner/Manager/Member) | Role middleware validation | Controlled access to resources |

---

## 🎯 2. Functional Scope

### 2.1 Core Features (Must-Haves)
- **Organization Management** (Multi-Tenant Support)
- **User Authentication** (Login/Signup)
- **Role-Based Access Control** (Owner, Manager, Member)
- **Project Management** (CRUD operations)
- **Task Management** (CRUD with status tracking)
- **Tenant-Based Data Isolation**
- **Dashboard View** for project tracking

### 2.2 Stretch Goals (If Time Permits)
- Activity Logs (Track task changes)
- Project progress analytics
- Soft delete implementation
- Subscription logic (Free / Pro plans)
- API documentation using Swagger
- Search & filtering system

### 2.3 Libraries / Tools
- **Backend:** Node.js & Express.js
- **Database:** MongoDB & Mongoose
- **Frontend:** React.js, Vite
- **Security:** JWT (jsonwebtoken) & bcrypt
- **Tools:** Postman (API testing), Git & GitHub (Version control)

---

## ⚙️ 3. System & Design Thinking

### 3.1 App Flow / Pipeline
1. **Organization Registration:** Owner creates an organization and a `tenantId` is generated.
2. **User Authentication:** Users sign up/login and receive a JWT containing `userId`, `tenantId`, and `role`.
3. **Middleware Processing:** Every API request passes through authentication and tenant isolation middleware.
4. **Project Creation:** Projects are created with a `tenantId` reference.
5. **Task Assignment:** Tasks are linked to projects and filtered by `tenantId`.
6. **Role Validation:** Middleware ensures only authorized users can modify resources (Owner / Manager / Member).
7. **Dashboard Rendering:** React frontend fetches tenant-specific data via secure APIs.

### 3.2 Testing Strategy
- Test JWT authentication and token validation.
- Verify tenant isolation between organizations.
- Test CRUD operations for projects and tasks.
- Validate role-based restrictions.
- Test error handling and response time.

---

## 📅 4. Timeline & Milestones (8 Weeks)

| Week | Deliverables |
| :--- | :--- |
| **Week 1** | Learn MERN fundamentals, JWT authentication, and project architecture planning. |
| **Week 2** | Design multi-tenant database schema (Organizations, Users, Projects, Tasks). |
| **Week 3** | Implement authentication APIs (Signup/Login) and tenant middleware. |
| **Week 4** | Develop Organization & User management APIs with role-based access control. |
| **Week 5** | Implement Project CRUD APIs with tenant isolation. |
| **Week 6** | Implement Task CRUD APIs with role validation. |
| **Week 7** | Integrate React frontend with backend APIs and build dashboard UI. |
| **Week 8** | Testing, debugging, performance optimization, and final deployment demo. |

---

## ⚠️ 5. Risks & Dependencies

### 5.1 Hardest Part Technically
- Ensuring strict tenant-based data isolation.
- Implementing secure role-based access control.
- Preventing unauthorized cross-organization access.
- Designing a scalable MongoDB indexing strategy.

### 5.2 Mentor Support Needed
- Guidance on multi-tenant database structure.
- Best practices for JWT security.
- MongoDB indexing optimization.
- Scaling SaaS architecture advice.

---

## 🏆 6. Evaluation Readiness

### 6.1 How Will You Prove It Works?
- Postman API collection screenshots.
- Demonstration of isolated organizations.
- Role-based access testing.
- React dashboard demo.
- GitHub repository with documentation.

### 6.2 Success Metrics
- 100% tenant data isolation verified.
- Secure JWT authentication.
- All CRUD operations functioning.
- Dashboard loads under 500ms.
- Zero cross-tenant data leakage.

---

## 📋 7. Responsibilities

| Task | Student |
| :--- | :--- |
| **Database Setup** | Configure MongoDB schema for Organizations, Users, Projects, Tasks |
| **Auth & Security** | Implement JWT authentication & bcrypt hashing |
| **Tenant Middleware** | Develop tenant isolation middleware |
| **Role Management** | Implement RBAC logic |
| **API Development** | Build Project & Task CRUD APIs |
| **Frontend Integration** | Connect React dashboard with backend APIs |
| **Testing & Deployment** | Perform system testing and deploy application |
