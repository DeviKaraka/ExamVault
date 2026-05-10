\# ExamVault Storage Setup Guide



This guide explains how to enable persistent database storage for ExamVault so that exam data survives page refreshes, logouts, and is instantly visible to both Faculty and Student portals.



\## Current State



By default, ExamVault uses \*\*In-Memory tables\*\* (demo/testing mode). This means:

\- Data is lost when the browser refreshes or closes

\- Each session starts with empty data

\- Changes are not synchronized between Faculty and Student portals



\## Enabling Persistent Storage



To enable permanent storage, an administrator must provision either \*\*Dataverse\*\* or \*\*SharePoint\*\* tables, then connect them to the app.



\### Option 1: Dataverse (Recommended)



Dataverse provides enterprise-grade relational database storage with:

\- Full ACID compliance

\- Role-based security

\- Automatic backups

\- Real-time sync



\#### Steps:



1\. \*\*Open Power Platform Admin Center\*\*

&#x20;  - Go to https://admin.powerplatform.microsoft.com

&#x20;  - Select your environment



2\. \*\*Create Tables\*\*

&#x20;  

&#x20;  Create the following tables with matching schemas:



&#x20;  \*\*Exam Table\*\*

&#x20;  - `title` (Text, Required)

&#x20;  - `description` (Multiline Text)

&#x20;  - `durationMinutes` (Number, Required)

&#x20;  - `totalPoints` (Number)

&#x20;  - `accessCode` (Text, Required, Unique)

&#x20;  - `statusKey` (Choice: Draft, Published, Archived)

&#x20;  - `startDateTime` (DateTime)

&#x20;  - `endDateTime` (DateTime)

&#x20;  - `shuffleQuestions` (Boolean)

&#x20;  - `showResults` (Boolean)

&#x20;  - `passingScore` (Number)

&#x20;  - `createdAt` (DateTime, Auto)

&#x20;  - `updatedAt` (DateTime, Auto)



&#x20;  \*\*Section Table\*\*

&#x20;  - `examId` (Lookup → Exam)

&#x20;  - `title` (Text, Required)

&#x20;  - `description` (Multiline Text)

&#x20;  - `orderIndex` (Number)



&#x20;  \*\*Question Table\*\*

&#x20;  - `sectionId` (Lookup → Section)

&#x20;  - `questionTypeKey` (Choice: MultipleChoice, TrueFalse, ShortAnswer, Essay, Matching, Listening, Speaking, Reading, Writing)

&#x20;  - `questionText` (Multiline Text, Required)

&#x20;  - `points` (Number)

&#x20;  - `orderIndex` (Number)

&#x20;  - `options` (Multiline Text - JSON array)

&#x20;  - `correctAnswer` (Text)

&#x20;  - `mediaUrl` (URL)

&#x20;  - `rubric` (Multiline Text)



&#x20;  \*\*Attempt Table\*\*

&#x20;  - `examId` (Lookup → Exam)

&#x20;  - `studentName` (Text, Required)

&#x20;  - `studentEmail` (Text, Required)

&#x20;  - `studentId` (Text)

&#x20;  - `startedAt` (DateTime)

&#x20;  - `submittedAt` (DateTime)

&#x20;  - `score` (Number)

&#x20;  - `statusKey` (Choice: InProgress, Submitted, Graded)

&#x20;  - `totalPoints` (Number)

&#x20;  - `percentageScore` (Decimal)

&#x20;  - `passed` (Boolean)

&#x20;  - `teacherFeedback` (Multiline Text)



&#x20;  \*\*Response Table\*\*

&#x20;  - `attemptId` (Lookup → Attempt)

&#x20;  - `questionId` (Lookup → Question)

&#x20;  - `answerText` (Multiline Text)

&#x20;  - `isCorrect` (Boolean)

&#x20;  - `pointsAwarded` (Number)

&#x20;  - `teacherComment` (Multiline Text)

&#x20;  - `gradedAt` (DateTime)



&#x20;  \*\*QuestionBank Table\*\*

&#x20;  - `questionTypeKey` (Choice: MultipleChoice, TrueFalse, ShortAnswer, Essay, Matching, Listening, Speaking, Reading, Writing)

&#x20;  - `questionText` (Multiline Text, Required)

&#x20;  - `options` (Multiline Text - JSON array)

&#x20;  - `correctAnswer` (Text)

&#x20;  - `points` (Number)

&#x20;  - `difficultyKey` (Choice: Easy, Medium, Hard)

&#x20;  - `category` (Text)

&#x20;  - `tags` (Text)

&#x20;  - `mediaUrl` (URL)

&#x20;  - `rubric` (Multiline Text)



3\. \*\*Update Data Model Configuration\*\*

&#x20;  - In the app's data model settings, change each table's `type` from `"InMemory"` to `"Dataverse"`

&#x20;  - Map each table to its corresponding Dataverse table

&#x20;  - Regenerate the data layer code



\### Option 2: SharePoint Lists



SharePoint Lists provide simpler storage suitable for:

\- Smaller data volumes

\- Teams already using SharePoint

\- Quick setup without Dataverse licensing



\#### Steps:



1\. \*\*Open SharePoint Site\*\*

&#x20;  - Navigate to your SharePoint site

&#x20;  - Go to Site Contents



2\. \*\*Create Lists\*\*

&#x20;  

&#x20;  Create lists matching the schemas above. Use:

&#x20;  - Single line of text → Text columns

&#x20;  - Multiple lines of text → Multiline Text columns

&#x20;  - Number → Number columns

&#x20;  - Yes/No → Boolean columns

&#x20;  - Date and Time → DateTime columns

&#x20;  - Choice → Choice/dropdown columns

&#x20;  - Lookup → Lookup columns for relationships



3\. \*\*Update Data Model Configuration\*\*

&#x20;  - In the app's data model settings, change each table's `type` from `"InMemory"` to `"SharePointList"`

&#x20;  - Provide the SharePoint site URL and list names

&#x20;  - Regenerate the data layer code



\## Verification



After enabling persistent storage:



1\. \*\*Create an Exam\*\* in the Faculty Dashboard

2\. \*\*Refresh the page\*\* - the exam should still appear

3\. \*\*Open Student Portal\*\* in another tab - the exam should be visible

4\. \*\*Complete an attempt\*\* - the submission should appear in Faculty grading



\## Troubleshooting



| Issue | Solution |

|-------|----------|

| Data not appearing after save | Check browser console for API errors; verify table permissions |

| "Access denied" errors | Ensure users have read/write permissions on the tables |

| Sync delays between portals | Dataverse syncs instantly; SharePoint may have \~30s delay |

| Schema mismatch errors | Verify column names match exactly (case-sensitive) |



\## Support



For help enabling persistent storage, contact your Power Platform administrator or IT support team.



