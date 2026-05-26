import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./lib/auth";
import { AppLayout } from "./components/Layout";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminCourses from "./pages/admin/Courses";
import AdminCourseEditor from "./pages/admin/CourseEditor";
import AdminSections from "./pages/admin/Sections";
import AdminQuizzes from "./pages/admin/Quizzes";
import AdminQuizPreview from "./pages/admin/QuizPreview";
import QuestionEditor from "./pages/admin/QuestionEditor";
import SscCglMockStudio from "./pages/admin/SscCglMockStudio";
import StudentDashboard from "./pages/student/Dashboard";
import StudentCourse from "./pages/student/Course";
import QuizAttempt from "./pages/student/QuizAttempt";
import SeriousMockTest from "./pages/student/SeriousMockTest";
import SscCglMocksList from "./pages/student/SscCglMocksList";
import DescriptiveWriting from "./pages/student/DescriptiveWriting";
import StudentComingSoon from "./pages/student/ComingSoon";
import AnalyticsOverview from "./pages/analytics/Overview";
import MockAnalytics from "./pages/analytics/MockAnalytics";
import NotFound from "./pages/NotFound";
import Landing from "./pages/Landing";
import F64MockTest from "./pages/f64/MockTest";
import SscCglMocks from "./pages/f64/SscCglMocks";
import SscCglAttempt from "./pages/f64/SscCglAttempt";

function Protected({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RoleGuard({ role, children }: { role: "admin" | "student"; children: JSX.Element }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to="/" replace />;
  return children;
}

function HomeOrApp() {
  const { user } = useAuth();
  if (!user) return <Landing />;
  return <AppLayout />;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route
        path="/mock-test"
        element={
          <Protected>
            <F64MockTest />
          </Protected>
        }
      />
      <Route
        path="/ssc-cgl/mocks"
        element={
          <Protected>
            <SscCglMocks />
          </Protected>
        }
      />
      <Route
        path="/ssc-cgl/attempt/:id"
        element={
          <Protected>
            <SscCglAttempt />
          </Protected>
        }
      />
      {/* Standalone quiz pages - not in AppLayout */}
      <Route
        path="/student/quiz/:id"
        element={
          <Protected>
            <QuizAttempt />
          </Protected>
        }
      />
      <Route
        path="/student/serious-mock/:id"
        element={
          <Protected>
            <SeriousMockTest />
          </Protected>
        }
      />
      <Route
        path="/student/ssc-cgl-mocks"
        element={
          <Protected>
            <SscCglMocksList />
          </Protected>
        }
      />
      <Route
        path="/student/mock-analytics/:id"
        element={
          <Protected>
            <MockAnalytics />
          </Protected>
        }
      />
      <Route path="/" element={<HomeOrApp />}>
        <Route index element={user?.role === "admin" ? <AdminDashboard /> : <StudentDashboard />} />
        <Route path="admin">
          <Route
            path="dashboard"
            element={
              <RoleGuard role="admin">
                <AdminDashboard />
              </RoleGuard>
            }
          />
          <Route
            path="courses"
            element={
              <RoleGuard role="admin">
                <AdminCourses />
              </RoleGuard>
            }
          />
          <Route
            path="courses/new"
            element={
              <RoleGuard role="admin">
                <AdminCourseEditor />
              </RoleGuard>
            }
          />
          <Route
            path="courses/:id/sections"
            element={
              <RoleGuard role="admin">
                <AdminSections />
              </RoleGuard>
            }
          />
          <Route
            path="courses/:id/quizzes"
            element={
              <RoleGuard role="admin">
                <AdminQuizzes />
              </RoleGuard>
            }
          />
          <Route
            path="quizzes/:id/preview"
            element={
              <RoleGuard role="admin">
                <AdminQuizPreview />
              </RoleGuard>
            }
          />
          <Route
            path="quizzes/:quizId/edit-questions"
            element={
              <RoleGuard role="admin">
                <QuestionEditor />
              </RoleGuard>
            }
          />
          <Route
            path="ssc-cgl-mock-studio"
            element={
              <RoleGuard role="admin">
                <SscCglMockStudio />
              </RoleGuard>
            }
          />
        </Route>
        <Route path="student">
          <Route path="ai-assistant" element={<StudentComingSoon />} />
          <Route path="performance" element={<StudentComingSoon />} />
          <Route path="exam-coming-soon" element={<StudentComingSoon />} />
          <Route path="course/:id" element={<StudentCourse />} />
          <Route path="descriptive/:id" element={<DescriptiveWriting />} />
        </Route>
        <Route path="analytics" element={<AnalyticsOverview />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
