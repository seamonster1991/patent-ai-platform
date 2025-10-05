import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { Toaster } from "sonner";
import Layout from "@/components/Layout/Layout";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Search from "@/pages/Search";
import PatentDetail from "@/pages/PatentDetail";
import Dashboard from "@/pages/Dashboard";
import Profile from "@/pages/Profile";
import AuthCallback from "@/pages/AuthCallback";
import ProtectedRoute from "@/components/Auth/ProtectedRoute";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import TestReportGeneration from "@/components/TestReportGeneration";
import Reports from "@/pages/Reports";
import TestLogin from "@/pages/TestLogin";
import AdminLayout from "@/components/Layout/AdminLayout";
import AdminHome from "@/pages/Admin/AdminHome";
import AdminStatistics from "@/pages/Admin/AdminStatistics";
import AdminUsers from "@/pages/Admin/AdminUsers";
import AdminBilling from "@/pages/Admin/AdminBilling";
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
        {/* Admin Routes - With AdminLayout wrapper */}
        <Route path="/admin/*" element={
          <AdminLayout>
            <Routes>
              <Route path="/" element={<AdminHome />} />
              <Route path="/statistics" element={<AdminStatistics />} />
              <Route path="/users" element={<AdminUsers />} />
              <Route path="/billing" element={<AdminBilling />} />
            </Routes>
          </AdminLayout>
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
