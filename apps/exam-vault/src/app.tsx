import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { Provider as JotaiProvider } from 'jotai';
import { initialize } from '@microsoft/power-apps/app';

import Layout from '@/pages/_layout';
import { queryClient } from '@/lib/query-client';
import { Toaster } from '@/components/ui/sonner';
import ErrorBoundary from '@/components/system/error-boundary';

// Pages
import HomePage from '@/pages/index';
import NotFoundPage from '@/pages/not-found';
import TeacherLogin from '@/pages/teacher-login';
import StudentLogin from '@/pages/student-login';
import TeacherSignup from '@/pages/teacher-signup';
import StudentSignup from '@/pages/student-signup';

// Teacher pages
import TeacherDashboard from '@/pages/teacher/dashboard';
import ExamBuilder from '@/pages/teacher/exam-builder';
import GradingQueue from '@/pages/teacher/grading';
import AnalyticsDashboard from '@/pages/teacher/analytics';
import GradeAttempt from '@/pages/teacher/grade-attempt';
import QuestionBank from '@/pages/teacher/question-bank';
import EmailSettings from '@/pages/teacher/email-settings';
import OrganizationSettings from '@/pages/admin/organization-settings';

// Student pages
import StudentJoin from '@/pages/student/join';
import StudentExam from '@/pages/student/exam';
import StudentResult from '@/pages/student/result';
import StudentProfile from '@/pages/student/profile';
function App() {
  useEffect(() => {
    initialize();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary resetQueryCache>
        <JotaiProvider>
          <Toaster richColors />
          <Router>
            <Routes>
              {/* Home / Role Selection */}
              <Route path="/" element={<Layout />}>
                <Route index element={<HomePage />} />
              </Route>

              {/* Auth Routes */}
              <Route path="/teacher/login" element={<TeacherLogin />} />
              <Route path="/teacher/signup" element={<TeacherSignup />} />
              <Route path="/student/login" element={<StudentLogin />} />
              <Route path="/student/signup" element={<StudentSignup />} />

              {/* Teacher Routes */}
              <Route path="/teacher">
                <Route index element={<TeacherDashboard />} />
                <Route path="dashboard" element={<TeacherDashboard />} />
                <Route path="exam/:id" element={<ExamBuilder />} />
                <Route path="analytics" element={<AnalyticsDashboard />} />
                <Route path="grading" element={<GradingQueue />} />
                <Route path="question-bank" element={<QuestionBank />} />
                <Route path="grade/:id" element={<GradeAttempt />} />
                <Route path="email-settings" element={<EmailSettings />} />
              </Route>

              {/* Admin Routes */}
              <Route path="/admin/organization" element={<OrganizationSettings />} />

              {/* Student Routes */}
              <Route path="/student">
                <Route index element={<StudentJoin />} />
                <Route path="join" element={<StudentJoin />} />
                <Route path="profile" element={<StudentProfile />} />
                <Route path="exam/:id" element={<StudentExam />} />
                <Route path="result/:id" element={<StudentResult />} />
              </Route>

              {/* 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Router>
        </JotaiProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  );
}

export default App;
