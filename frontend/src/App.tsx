import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import ProtectedRoute from "@/components/ProtectedRoute";
import { AuthProvider, useAuth } from "@/services/authContext";
import DashboardPage from "@/pages/Dashboard";
import LoginPage from "@/pages/Login";
import ProjectDetailPage from "@/pages/ProjectDetail";
import ProjectsPage from "@/pages/Projects";
import SignupPage from "@/pages/Signup";
import TasksPage from "@/pages/Tasks";

function HomeRedirect() {
  const { token } = useAuth();
  return <Navigate to={token ? "/dashboard" : "/login"} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/tasks" element={<TasksPage />} />
        </Route>
      </Route>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ErrorBoundary>
  );
}
