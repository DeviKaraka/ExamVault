\# ExamVault 🏛️



> \*\*AI-Powered Unified Assessment Platform\*\*



ExamVault is a centralized, cloud-based examination platform that brings together coding tests, MCQs, aptitude exams, descriptive assessments, and interview rounds — all within a single secure, AI-driven environment.



\---



\## Table of Contents



\- \[Overview](#overview)

\- \[Key AI Capabilities](#key-ai-capabilities)

\- \[Project Structure](#project-structure)

\- \[Architecture](#architecture)

\- \[Features](#features)

\- \[Tech Stack](#tech-stack)

\- \[Role-Based Access](#role-based-access)

\- \[Security \& Examination Integrity](#security--examination-integrity)

\- \[Scope](#scope)

\- \[Future Enhancements](#future-enhancements)

\- \[Documentation](#documentation)



\---



\## Overview



ExamVault is developed using \*\*TypeScript/TSX\*\* and \*\*Azure OpenAI Service\*\* to automate question generation, answer evaluation, malpractice detection, and student performance analysis in real time.



\### The Problem it Solves



\- Multiple examination platforms create complexity for students and faculty

\- Manual question creation and evaluation consume significant time

\- Lack of real-time AI proctoring increases malpractice risk

\- Traditional systems offer limited analytics and performance insights

\- Existing solutions struggle with scalability and concurrent users

\- Delayed evaluation affects student feedback and learning



> \*"ExamVault is not just integrated with AI — it is built around AI-driven intelligence and automation."\*



\---



\## Key AI Capabilities



| AI Capability | Description |

|---|---|

| \*\*AI Question Generation\*\* | Generates MCQs, coding, aptitude, and descriptive questions using Azure OpenAI Service |

| \*\*AI Evaluation Engine\*\* | Automatically evaluates objective, coding, and descriptive answers with AI-based scoring |

| \*\*AI Proctoring\*\* | Real-time face, audio, tab-switch, and activity monitoring during examinations |

| \*\*AI Analytics\*\* | Dashboards with AI-based performance insights and analytics |

| \*\*Adaptive Difficulty\*\* | Dynamically adjusts question difficulty based on student performance patterns |



\---



\## Project Structure



```

examvault/

│   project.json              # Project configuration

│   README.md

│

├───.agent/

│   └───plans/

│           examvault.md      # Agent planning document

│

├───apps/

│   └───exam-vault/

│       │   power.config.json

│       │

│       └───src/

│           │   app.tsx               # Root application component

│           │   index.css             # Global styles

│           │   main.tsx              # Entry point

│           │

│           ├───components/

│           │   │   ai-question-generator.tsx   # AI-powered question generation UI

│           │   │   role-selector.tsx            # Role-based entry point selector

│           │   │

│           │   ├───system/

│           │   │       error-boundary.tsx       # Global error handling

│           │   │

│           │   └───ui/                          # Reusable UI component library

│           │           accordion.tsx            button.tsx

│           │           alert.tsx                card.tsx

│           │           alert-dialog.tsx         chart.tsx

│           │           avatar.tsx               checkbox.tsx

│           │           badge.tsx                dialog.tsx

│           │           breadcrumb.tsx           form.tsx

│           │           calendar.tsx             input.tsx

│           │           carousel.tsx             select.tsx

│           │           collapsible.tsx          sidebar.tsx

│           │           command.tsx              skeleton.tsx

│           │           drawer.tsx               table.tsx

│           │           dropdown-menu.txt        tabs.tsx

│           │           empty.tsx                textarea.tsx

│           │           field.tsx                toggle.tsx

│           │           hover-card.tsx           tooltip.tsx

│           │           pagination.tsx           sonner.tsx

│           │           progress.tsx             spinner.tsx

│           │           radio-group.tsx          ... and more

│           │

│           ├───generated/             # Auto-generated data layer

│           │   ├───components/

│           │   │       in-memory-data-banner.tsx   # Dev-mode in-memory data indicator

│           │   │

│           │   ├───hooks/             # Reactive data-fetching hooks

│           │   │       use-attempt.ts

│           │   │       use-exam.ts

│           │   │       use-question-bank.ts

│           │   │       use-question.ts

│           │   │       use-response.ts

│           │   │       use-section.ts

│           │   │

│           │   ├───models/            # TypeScript data models

│           │   │       attempt-model.ts

│           │   │       exam-model.ts

│           │   │       question-model.ts

│           │   │       question-bank-model.ts

│           │   │       response-model.ts

│           │   │       section-model.ts

│           │   │       common-models.ts

│           │   │

│           │   ├───services/          # Data access \& API services

│           │   │       attempt-service.ts

│           │   │       exam-service.ts

│           │   │       question-service.ts

│           │   │       question-bank-service.ts

│           │   │       response-service.ts

│           │   │       section-service.ts

│           │   │

│           │   └───validators/        # Input validation schemas

│           │           attempt-validator.ts

│           │           exam-validator.ts

│           │           question-validator.ts

│           │           question-bank-validator.ts

│           │           response-validator.ts

│           │           section-validator.ts

│           │

│           ├───hooks/                 # Custom React hooks

│           │       use-mobile.ts      # Responsive/mobile detection

│           │       use-proctoring.ts  # AI proctoring integration

│           │       use-user.ts        # User session \& auth state

│           │

│           ├───lib/                   # Shared utilities \& core logic

│           │       email-service.ts   # Email notification service

│           │       grading.ts         # Grading logic \& scoring engine

│           │       query-client.ts    # API/query client configuration

│           │       store.ts           # Global state store

│           │       utils.ts           # General utility functions

│           │

│           └───pages/                 # Application pages organized by role

│               │   index.tsx              # Landing / home page

│               │   not-found.tsx          # 404 page

│               │   student-login.tsx

│               │   student-signup.tsx

│               │   teacher-login.tsx

│               │   teacher-signup.tsx

│               │   \_layout.tsx            # Shared layout wrapper

│               │

│               ├───admin/

│               │       organization-settings.tsx   # Admin org config panel

│               │

│               ├───student/

│               │       exam.tsx            # Live exam-taking interface

│               │       join.tsx            # Join exam via code/link

│               │       result.tsx          # Individual result \& AI feedback

│               │       profile.tsx         # Student profile

│               │       login.tsx

│               │       forgot-password.tsx

│               │

│               └───teacher/

│                       dashboard.tsx       # Teacher overview \& stats

│                       exam-builder.tsx    # Create \& configure exams

│                       question-bank.tsx   # Manage question library

│                       grading.tsx         # Batch grading interface

│                       grade-attempt.tsx   # Individual attempt grading

│                       analytics.tsx       # Performance analytics

│                       email-settings.tsx  # Notification configuration

│                       login.tsx

│                       forgot-password.tsx

│

├───data-model/

│       full-data-model.json    # Complete data schema definition

│

└───docs/

&#x20;       overview.md             # Project overview documentation

&#x20;       storage-setup-guide.md  # Storage configuration guide

```



\---



\## Architecture



\### System Layers



| Layer | Technologies | Responsibility |

|---|---|---|

| Presentation | TypeScript + TSX + React | Responsive, role-based UI for admins, faculty, and students |

| Authentication | Microsoft Azure Active Directory | Secure auth and role-based access control |

| Backend \& Automation | TypeScript + Microsoft Power Automate | Automated workflows, notifications, and exam processing |

| Database | SharePoint | Secure storage for exams, submissions, and records |

| AI Integration | Azure OpenAI Service | Question generation, evaluation, and intelligent processing |

| Proctoring | WebRTC + MediaDevices API + AI Monitoring | Real-time webcam, audio, and activity monitoring |

| Analytics | Microsoft Power BI | Real-time dashboards and performance reporting |



\### Architecture Flow



```

Frontend Layer (TypeScript / TSX / React)

&#x20;                       ↓

Authentication Layer (Microsoft Azure Active Directory)

&#x20;                       ↓

Backend \& Automation Layer (TypeScript + Microsoft Power Automate)

&#x20;                       ↓

Database Layer (SharePoint)

&#x20;                       ↓

AI Integration Layer (Azure OpenAI Service)

&#x20;                       ↓

Monitoring \& Proctoring Engine (WebRTC + AI-Based Monitoring APIs)

&#x20;                       ↓

Analytics Dashboard (Microsoft Power BI)

```



\### Examination Data Flow



1\. Admin creates and schedules examinations via the exam builder (`exam-builder.tsx`)

2\. AI generates and manages examination questions using Azure OpenAI Service (`ai-question-generator.tsx`)

3\. Students securely authenticate and enter the examination environment (`join.tsx`)

4\. AI proctoring activates webcam, microphone, and tab monitoring (`use-proctoring.ts`)

5\. Student responses are securely stored and processed via the services layer (`response-service.ts`)

6\. AI-based evaluation automatically scores answers using the grading engine (`grading.ts`)

7\. Results and reports are generated with automated notifications (`email-service.ts`)

8\. Analytics dashboards update with performance insights (`analytics.tsx`)



\---



\## Features



\### Authentication \& Access Control

\- Separate login and signup pages for teachers and students

\- Microsoft Azure Active Directory-based secure authentication

\- Secure session management handled via `use-user.ts`

\- Password recovery flows for both roles (`forgot-password.tsx`)



\### AI-Powered Exam Creation

\- Faculty provide subject, topic, difficulty, question type, and count (`ai-question-generator.tsx`)

\- AI engine returns a complete question paper with answer key within 60 seconds

\- Supports MCQ, Coding, Descriptive, Aptitude, and Verbal question types

\- Editable AI drafts — faculty can modify before publishing (`exam-builder.tsx`)

\- Question bank seeded from AI-generated content for reuse (`question-bank.tsx`)



\### Secure Examination Environment

\- Webcam and microphone access with explicit student consent (`use-proctoring.ts`)

\- Voice and background noise detection for suspicious audio activity

\- Full-screen enforcement with instant warning alerts on exit detection

\- Tab-switch and focus-loss detection using Page Visibility API

\- Countdown timer with automatic exam submission on expiry (`exam.tsx`)

\- Configurable warning system — repeated violations can auto-terminate the exam



\### Automated Evaluation



| Exam Type | AI Evaluation Method |

|---|---|

| MCQ / Objective | Instant automated grading with negative marking support |

| Coding Answers | Code execution with hidden test cases and performance-based scoring |

| Descriptive Answers | AI-powered semantic evaluation and rubric-based scoring |

| Aptitude Tests | Automated numerical and logic-based answer evaluation |

| Interview Assessments | AI-based communication and response analysis \*(Future Enhancement)\* |



\### Analytics \& Reporting

\- Student individual performance dashboard with historical trends (`result.tsx`)

\- Cohort-level analytics: average, distribution, topic mastery heatmaps (`analytics.tsx`)

\- AI-generated natural language performance summary per student

\- Exam audit report including proctoring flags and timestamps

\- Exportable reports in PDF and Excel formats



\### Notifications \& Communication

\- Exam schedule notifications via email and in-app alerts (`email-service.ts`)

\- Real-time admin alerts on proctoring violations

\- Result publication notifications to students

\- Configurable email settings per teacher (`email-settings.tsx`)



\---



\## Tech Stack



\### Frontend \& UI

\- \*\*TypeScript + TSX\*\* — type-safe frontend development

\- \*\*React\*\* — component-based UI with hooks-first architecture

\- \*\*Tailwind CSS\*\* — utility-first styling

\- \*\*shadcn/ui\*\* — accessible, composable component library (`/components/ui/`)



\### Core Libraries \& State

\- \*\*React Query\*\* — server state and data fetching (`query-client.ts`)

\- \*\*Global Store\*\* — client-side state management (`store.ts`)

\- \*\*Custom Hooks\*\* — `use-user.ts`, `use-proctoring.ts`, `use-mobile.ts`



\### Generated Data Layer

\- \*\*Models\*\* — typed contracts for Exam, Question, Attempt, Response, Section, QuestionBank

\- \*\*Services\*\* — data access abstraction for each entity

\- \*\*Validators\*\* — input validation schemas for all operations

\- \*\*Hooks\*\* — reactive data-fetching hooks per entity



\### Backend \& Automation

\- \*\*Microsoft Power Automate\*\* — automated workflows and notifications

\- \*\*Azure OpenAI Service\*\* — AI-powered evaluation and question generation

\- \*\*Email Service\*\* — notification delivery (`email-service.ts`)



\### Database

\- \*\*SharePoint Lists\*\* — structured data management for exam records and workflows

\- \*\*In-Memory Fallback\*\* — development mode data layer (`in-memory-data-banner.tsx`)



\### AI \& Machine Learning

\- \*\*Azure OpenAI Service\*\* — answer evaluation and question processing

\- \*\*NLP Processing\*\* — semantic answer checking and intelligent response evaluation

\- \*\*Grading Engine\*\* — custom scoring logic with rubric support (`grading.ts`)



\### Monitoring \& Proctoring

\- \*\*WebRTC\*\* — live video and audio streaming during examinations

\- \*\*MediaDevices \& Page Visibility APIs\*\* — webcam, microphone, and tab-switch detection

\- \*\*Web Audio API\*\* — suspicious audio and background noise analysis



\---



\## Role-Based Access



| Role | Key Pages | Permissions |

|---|---|---|

| \*\*Super Administrator\*\* | `admin/organization-settings.tsx` | Full platform control: institution onboarding, system config, audit logs |

| \*\*Faculty / Examiner\*\* | `teacher/dashboard.tsx`, `exam-builder.tsx`, `question-bank.tsx`, `grading.tsx`, `analytics.tsx` | Create, schedule, and monitor exams; view cohort analytics; override AI evaluations |

| \*\*Student\*\* | `student/exam.tsx`, `join.tsx`, `result.tsx`, `profile.tsx` | Attend assigned exams in the secure monitored environment; view personal results |



\---



\## Security \& Examination Integrity



\- \*\*Secure Authentication\*\* — role-based access using Microsoft Azure Active Directory

\- \*\*Encrypted Cloud Communication\*\* — protected data transfer between the app, AI services, and databases

\- \*\*AI-Based Proctoring\*\* — real-time malpractice detection via `use-proctoring.ts` (webcam, audio, activity)

\- \*\*Audit \& Activity Logging\*\* — secure tracking of exam activities, submissions, and admin actions

\- \*\*Secure Data Storage\*\* — protected storage of examination records and candidate information

\- \*\*Tab-Switch \& Device Monitoring\*\* — Page Visibility API integration to detect suspicious activity

\- \*\*Automated Security Workflows\*\* — real-time alerts and monitoring using AI and Power Automate



\---



\## Scope



\### In Scope

\- Unified platform for MCQ, coding, aptitude, and interview assessments

\- AI-powered automated evaluation and performance analysis

\- Real-time AI proctoring with webcam, audio, and tab monitoring

\- Role-based access for administrators, faculty, and students

\- Integration with Azure OpenAI Service

\- Automated workflows, notifications, and report generation

\- Secure cloud-based examination management and data storage

\- Real-time analytics and assessment tracking



\### Out of Scope

\- Offline examination support without internet connectivity

\- Native mobile application development for iOS and Android

\- Biometric authentication (fingerprint or iris scanning)

\- Blockchain-based certificate generation

\- VR/AR-based examination environments

\- Advanced multilingual AI interview evaluation systems



\---



\## Future Enhancements



| Enhancement | Description |

|---|---|

| Advanced AI Proctoring | Enhanced AI monitoring with improved malpractice and behavioural detection |

| Adaptive Examination System | AI-based difficulty adjustment according to candidate performance |

| Real-Time Interview Evaluation | Automated AI scoring and analysis during technical interviews |

| Multi-Language Support | Support for regional language-based examinations and evaluations |

| Advanced Analytics Dashboard | Deeper performance insights and predictive student analysis |

| Mobile Application Integration | Cross-platform mobile access for students and administrators |

| Cloud Scalability Enhancements | Improved scalability and performance using advanced cloud services |

| AI-Based Report Generation | Automated generation of detailed assessment and performance reports |



\---



\## Documentation



| File | Description |

|---|---|

| `docs/overview.md` | High-level project overview |

| `docs/storage-setup-guide.md` | Storage configuration and setup guide |

| `data-model/full-data-model.json` | Complete data schema definition |

| `.agent/plans/examvault.md` | Agent planning and task breakdown |



\---



\## License



\*Confidential — For Academic \& Institutional Use\*



\---



<p align="center">

&#x20; <strong>ExamVault — Unified AI-Powered Assessment Platform</strong>

</p>



