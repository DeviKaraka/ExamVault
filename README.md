# ExamVault

**AI-Powered Unified Assessment Platform**

ExamVault is a centralized, cloud-based examination platform built with **React / TypeScript** and powered by **Azure OpenAI Service**. It brings together coding tests, MCQs, aptitude exams, descriptive assessments, and interview rounds — all within a single secure, AI-driven environment.

---

## Table of Contents

- [Overview](#overview)
- [Key AI Capabilities](#key-ai-capabilities)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Role-Based Access](#role-based-access)
- [Security and Examination Integrity](#security-and-examination-integrity)
- [Scope](#scope)
- [Future Enhancements](#future-enhancements)
- [Documentation](#documentation)

---

## Overview

ExamVault is developed using **TypeScript/TSX + React** with **Azure OpenAI Service** to automate question generation, answer evaluation, malpractice detection, and student performance analysis in real time.

### The Problem it Solves

- Multiple examination platforms create complexity for students and faculty
- Manual question creation and evaluation consume significant time
- Lack of real-time AI proctoring increases malpractice risk
- Traditional systems offer limited analytics and performance insights
- Existing solutions struggle with scalability and concurrent users
- Delayed evaluation affects student feedback and learning

> **"ExamVault is not just integrated with AI — it is built around AI-driven intelligence and automation."**

---

## Key AI Capabilities

| AI Capability | Implementation |
|---|---|
| **AI Question Generation** | Azure OpenAI GPT-4o via `ai-question-generator.tsx` — generates MCQs, coding, aptitude, descriptive questions |
| **AI Answer Evaluation** | Azure OpenAI called via `/api/evaluate-answer` proxy in `grading.ts` — scores descriptive answers with rubric-based feedback |
| **AI Proctoring** | Real-time webcam, audio, tab-switch, fullscreen monitoring via `use-proctoring.ts` |
| **AI Analytics Summary** | Natural language cohort performance summaries via `/api/analytics/summarize` in `analytics.tsx` |
| **Adaptive Difficulty** | IRT-inspired difficulty adjustment engine in `adaptive-difficulty.ts` |

---

## Architecture

### System Layers

| Layer | Technologies | Responsibility |
|---|---|---|
| Presentation | React + TypeScript/TSX + Tailwind CSS | Responsive, role-based UI for admins, faculty, and students |
| Authentication | Azure Active Directory (MSAL) + JWT (httpOnly cookies) | Secure auth and role-based access control — `auth-service.ts` |
| Backend & Automation | Azure Functions (TypeScript) | API proxy for AI evaluation, auth endpoints, notifications |
| Database | Azure Cosmos DB / SharePoint Lists (configurable) | Exam records, question banks, submissions, user data |
| AI Integration | Azure OpenAI Service (GPT-4o) | Question generation, answer evaluation, analytics summaries |
| Proctoring Engine | WebRTC + MediaDevices API + Web Audio API | Webcam, microphone, tab-switch, audio level monitoring |
| Analytics Dashboard | Power BI Embedded + in-app charts | Performance dashboards, cohort analytics, score distributions |

### Architecture Flow

```
React Frontend (TypeScript/TSX)
        ↓
Azure AD (MSAL) Authentication Layer
        ↓
Azure Functions API Layer  ──── Azure OpenAI Service (GPT-4o)
        ↓
Data Layer (SharePoint Lists / Azure Cosmos DB)
        ↓
AI Proctoring Engine (WebRTC + MediaDevices)
        ↓
Analytics (Power BI Embedded + in-app charts)
```

### Examination Data Flow

1. Teacher creates and configures examinations via `exam-builder.tsx`
2. AI generates questions using Azure OpenAI Service (`ai-question-generator.tsx`)
3. Students authenticate via Azure AD and enter the exam (`join.tsx`)
4. AI proctoring activates: webcam, microphone, tab-switch, audio (`use-proctoring.ts`)
5. Student responses are stored via the services layer (`response-service.ts`)
6. AI evaluation scores descriptive answers; automated grading for MCQ/coding (`grading.ts`)
7. Results and notifications are sent via `email-service.ts`
8. Analytics dashboards update with performance insights (`analytics.tsx`)

---

## Tech Stack

### Frontend & UI

- **React 18 + TypeScript/TSX** — component-based, hooks-first architecture
- **Tailwind CSS** — utility-first styling
- **shadcn/ui** — accessible, composable component library

### State & Data

- **React Query (TanStack Query)** — server state, caching, and data fetching
- **Zustand** — global client-side state (`store.ts`)
- **Custom Hooks** — `use-user.ts`, `use-proctoring.ts`, `use-mobile.ts`

### Backend

- **Azure Functions (TypeScript)** — serverless API endpoints
  - `POST /api/evaluate-answer` — Azure OpenAI descriptive answer evaluation
  - `POST /api/auth/login` — JWT authentication with httpOnly cookies
  - `POST /api/analytics/summarize` — AI performance summary generation

### Authentication & Security

- **Azure Active Directory (MSAL)** — enterprise SSO and role-based access
- **JWT in httpOnly cookies** — XSS-resistant token storage (replaces localStorage)
- **bcrypt** — password hashing for local development fallback

### AI & Machine Learning

- **Azure OpenAI Service (GPT-4o)** — question generation, answer evaluation
- **Adaptive Difficulty Engine** — IRT-inspired algorithm (`adaptive-difficulty.ts`)
- **Behavioral Biometrics scaffold** — WebAuthn + keystroke dynamics (`biometric-auth.ts`)

### Database

- **SharePoint Lists** — configurable structured data store for exam records
- **In-Memory Fallback** — development mode data layer

### Analytics

- **Power BI Embedded** — enterprise dashboards (configure via `VITE_POWERBI_EMBED_URL`)
- **In-app score distribution + topic mastery charts** — `analytics.tsx`

### Proctoring

- **WebRTC** — live video and audio capture
- **MediaDevices API** — webcam and microphone access
- **Page Visibility API** — tab-switch and focus-loss detection
- **Web Audio API** — background noise and audio level analysis

---

## Features

### Authentication & Access Control

- Separate login and signup flows for teachers and students
- Azure Active Directory MSAL integration for institutional SSO
- Secure JWT sessions via httpOnly cookies (`auth-service.ts`)
- Password recovery flows for both roles

### AI-Powered Exam Creation

- Faculty specify subject, topic, difficulty, type, and count
- Azure OpenAI GPT-4o returns a complete question paper in under 60 seconds
- Supports MCQ, Coding, Descriptive, Aptitude, and Verbal question types
- Editable AI drafts before publishing (`exam-builder.tsx`)

### Secure Examination Environment

- Webcam and microphone with student consent (`use-proctoring.ts`)
- Voice and background noise detection
- Fullscreen enforcement with warning alerts on exit
- Tab-switch detection via Page Visibility API
- Countdown timer with automatic submission on expiry
- Configurable violation threshold with auto-termination

### Automated AI Evaluation

| Exam Type | Method |
|---|---|
| MCQ / Objective | Instant automated grading with optional negative marking |
| Coding Answers | Test-case-based scoring with per-case weights |
| Descriptive Answers | Azure OpenAI rubric-based semantic evaluation via `/api/evaluate-answer` |
| Aptitude Tests | Automated numerical and logical answer evaluation |

### Analytics & Reporting

- Score distribution charts and topic mastery heatmaps (`analytics.tsx`)
- AI-generated natural language performance summaries
- Power BI Embedded dashboard support
- Exam audit report with proctoring flags and timestamps
- Exportable reports (PDF / Excel)

### Admin Dashboard

- Live platform stats: exams, students, teachers, active exams (`organization-settings.tsx`)
- User management with suspend/reactivate controls
- Full audit log with severity classification
- Institution configuration panel

---

## Role-Based Access

| Role | Key Pages | Permissions |
|---|---|---|
| **Super Administrator** | `admin/organization-settings.tsx` | Full platform control, user management, audit logs, Power BI |
| **Faculty / Examiner** | `teacher/dashboard.tsx`, `exam-builder.tsx`, `analytics.tsx` | Create, schedule, monitor exams; view analytics; override AI grades |
| **Student** | `student/exam.tsx`, `join.tsx`, `result.tsx` | Attend exams in secure environment; view personal results |

---

## Security and Examination Integrity

- **Azure AD MSAL** — enterprise-grade SSO and role enforcement
- **httpOnly JWT cookies** — XSS-resistant session management (`auth-service.ts`)
- **AI Key Protection** — Azure OpenAI key never exposed client-side; calls routed through `/api/evaluate-answer` Azure Function
- **AI Proctoring** — webcam, audio, tab-switch, fullscreen monitoring (`use-proctoring.ts`)
- **Audit Logging** — every exam action, submission, and violation logged with timestamps
- **WebAuthn scaffold** — device biometric authentication stub (`biometric-auth.ts`)

---

## Scope

### In Scope

- Unified platform for MCQ, coding, aptitude, descriptive, and interview assessments
- AI-powered question generation and automated evaluation (Azure OpenAI)
- Real-time AI proctoring with webcam, audio, and tab monitoring
- Role-based access for administrators, faculty, and students
- Adaptive difficulty engine with IRT-inspired algorithm
- Automated workflows, notifications, and report generation
- Power BI Embedded analytics dashboard
- Secure cloud-based examination management

### Out of Scope

- Offline examination support without internet connectivity
- Native mobile application for iOS and Android
- Biometric authentication (fingerprint / iris scanning) — WebAuthn scaffold only
- Blockchain-based certificate generation
- VR/AR examination environments
- Advanced multilingual AI interview evaluation

---

## Future Enhancements

| Enhancement | Foundation in Current Codebase |
|---|---|
| Advanced AI Proctoring | `use-proctoring.ts` — extensible hook architecture |
| Adaptive Examination System | `adaptive-difficulty.ts` — IRT algorithm ready for integration with `exam.tsx` |
| Behavioral Biometric Verification | `biometric-auth.ts` — WebAuthn + keystroke dynamics scaffold |
| Enhanced NLP Evaluation | `/api/evaluate-answer` — Azure OpenAI pipeline already wired |
| Predictive Power BI Dashboards | `VITE_POWERBI_EMBED_URL` env var already consumed in `analytics.tsx` and `organization-settings.tsx` |
| Blockchain Result Integrity | Out of scope for current implementation |
| Mobile Application | Out of scope for current implementation |
| Enterprise Cloud Scalability | Azure Functions architecture supports horizontal scaling |

---

## Environment Variables

```env
# Azure OpenAI (server-side only — used by Azure Functions, NEVER in frontend)
AZURE_OPENAI_ENDPOINT=https://<your-resource>.openai.azure.com
AZURE_OPENAI_API_KEY=<your-key>
AZURE_OPENAI_DEPLOYMENT=gpt-4o

# Azure Active Directory
VITE_AZURE_AD_CLIENT_ID=<your-client-id>
VITE_AZURE_AD_TENANT_ID=<your-tenant-id>

# Power BI Embedded (optional — activates dashboard in analytics.tsx)
VITE_POWERBI_EMBED_URL=https://app.powerbi.com/reportEmbed?reportId=...
```

---

## Documentation

| File | Description |
|---|---|
| `docs/overview.md` | High-level project overview |
| `docs/storage-setup-guide.md` | Storage configuration and setup guide |
| `data-model/full-data-model.json` | Complete data schema definition |
| `.agent/plans/examvault.md` | Agent planning and task breakdown |

---

## License

*Confidential — For Academic & Institutional Use*

---

**ExamVault — Unified AI-Powered Assessment Platform**
