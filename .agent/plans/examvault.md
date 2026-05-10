\# ExamVault - Unified Assessment Platform



A comprehensive exam management platform with teacher and student roles, supporting multiple question types, browser-based proctoring, and hybrid grading.



\## Core Concept



Teachers create and manage exams with various question types. Students join via access codes and take exams in a monitored environment. Auto-gradable questions score immediately; subjective responses queue for teacher review.



\## User Roles



\### Teacher

\- Create/manage exams with multiple question types

\- Upload media (audio for listening, passages for reading)

\- Set exam duration, passing scores, and access codes

\- Review subjective answers (writing, speaking, code)

\- View student results and analytics



\### Student

\- Join exams via access code

\- Take exams in proctored fullscreen mode

\- Receive immediate scores for auto-graded portions

\- View results and feedback after grading complete



\## Question Types



1\. \*\*MCQ\*\* - Multiple choice with auto-grading

2\. \*\*Short Text\*\* - Brief text responses (auto-grade against keywords or manual)

3\. \*\*Code\*\* - Syntax-highlighted editor, manual teacher review

4\. \*\*Listening\*\* - Audio playback + MCQ/text questions

5\. \*\*Reading\*\* - Text passage + comprehension questions

6\. \*\*Writing\*\* - Essay prompt + text response (manual grading)

7\. \*\*Speaking\*\* - Audio recording for teacher review (manual grading)



\## Proctoring Features (Browser-Based)



\- Fullscreen enforcement during exam

\- Tab/window switch detection

\- Warning system: 3 violations = auto-submission

\- Time tracking and auto-submit on expiry

\- Camera presence indicator (student sees themselves)



\## Key Screens



\### Teacher Side

\- \*\*Dashboard\*\* - Active exams, pending reviews, recent results

\- \*\*Exam Builder\*\* - Create exam, add sections, configure settings

\- \*\*Question Editor\*\* - Add/edit questions by type with media upload

\- \*\*Grading Queue\*\* - Review subjective answers, assign scores

\- \*\*Results View\*\* - Per-exam analytics, individual student scores



\### Student Side

\- \*\*Join Exam\*\* - Enter access code to begin

\- \*\*Exam Interface\*\* - Question display, navigation, timer, warnings

\- \*\*Results\*\* - Score breakdown, correct answers (if enabled)



\## Data Entities



\- Users (role: teacher/student)

\- Exams (title, duration, access code, settings)

\- Sections (exam grouping: listening, reading, etc.)

\- Questions (type, content, media, correct answer, points)

\- Attempts (student, exam, start time, status, violations)

\- Responses (attempt, question, answer, score, graded status)



\## Grading Logic



\- \*\*Auto-graded\*\*: MCQ, keyword-matched short text

\- \*\*Manual review\*\*: Writing, Speaking, Code

\- \*\*Hybrid display\*\*: Show auto-graded score immediately, update total after teacher completes manual portions



\## Technical Notes



\- Media storage for audio files (listening questions, speaking responses)

\- Code editor with syntax highlighting (Monaco-style or similar)

\- Browser APIs for fullscreen, visibility change detection

\- MediaRecorder API for speaking responses

\- Audio playback controls for listening sections



\## Limitations \& Scope



\- No AI-based cheating detection (would require external ML services)

\- No live code execution/test cases (manual code review only)

\- Camera shows student's face but doesn't analyze it

\- Speaking/Writing require teacher grading (no auto-evaluation)



