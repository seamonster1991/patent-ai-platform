import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { Toaster } from "sonner";
import Layout from "@/components/Layout/Layout";
import AdminLayout from "@/components/Layout/AdminLayout";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Search from "@/pages/Search";
import PatentDetail from "@/pages/PatentDetail";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import AuthCallback from "@/pages/AuthCallback";
import AdminRoute from "@/components/Auth/AdminRoute";
import ProtectedRoute from "@/components/Auth/ProtectedRoute";
import AdminLogin from "@/pages/Admin/AdminLogin";
import AdminDashboard from "@/pages/Admin/AdminDashboard";
import UserManagement from "@/pages/Admin/UserManagement";
import UsageStatistics from "@/pages/Admin/UsageStatistics";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import TestReportGeneration from "@/components/TestReportGeneration";
import Reports from "@/pages/Reports";
import TestLogin from "@/pages/TestLogin";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";

export default function App() {
  const { initialize } = useAuthStore();
  const { isDark } = useThemeStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    // Initialize theme on app load
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <Router>
      <Routes>
        {/* Admin Login - No Layout wrapper */}
        <Route path="/admin/login" element={<AdminLogin />} />
        
        {/* Admin Routes - AdminLayout applied at route level */}
        <Route path="/admin/*" element={
          <AdminRoute>
            <AdminLayout>
              <Routes>
                <Route path="/" element={<AdminDashboard />} />
                <Route path="/dashboard" element={<AdminDashboard />} />
                <Route path="/users" element={<UserManagement />} />
                <Route path="/statistics" element={<UsageStatistics />} />
              </Routes>
            </AdminLayout>
          </AdminRoute>
        } />
        
        {/* Regular Routes - With Layout wrapper */}
        <Route path="/*" element={
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/search" element={
                <ProtectedRoute>
                  <Search />
                </ProtectedRoute>
              } />
              <Route path="/patent/:applicationNumber" element={
                <ProtectedRoute>
                  <PatentDetail />
                </ProtectedRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } />
              <Route path="/reports" element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              } />
              <Route path="/test-report" element={<TestReportGeneration />} />
              <Route path="/test-login" element={<TestLogin />} />
            </Routes>
          </Layout>
        } />
      </Routes>
      <Toaster position="top-right" richColors />
    </Router>
  );
}
