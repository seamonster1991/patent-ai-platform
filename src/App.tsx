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
import AdminRoute from "@/components/Auth/AdminRoute";
import ProtectedRoute from "@/components/Auth/ProtectedRoute";
import AdminDashboard from "@/pages/Admin/AdminDashboard";
import SystemStatus from "@/pages/Admin/SystemStatus";
import UserActivity from "@/pages/Admin/UserActivity";
import PatentStatistics from "@/pages/Admin/PatentStatistics";
import LLMQuality from "@/pages/Admin/LLMQuality";
import UserManagement from "@/pages/Admin/UserManagement";
import BillingManagement from "@/pages/Admin/BillingManagement";
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
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
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
          
          {/* Admin Routes */}
          <Route path="/admin" element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          } />
          <Route path="/admin/system" element={
            <AdminRoute>
              <SystemStatus />
            </AdminRoute>
          } />
          <Route path="/admin/users" element={
            <AdminRoute>
              <UserActivity />
            </AdminRoute>
          } />
          <Route path="/admin/patents" element={
            <AdminRoute>
              <PatentStatistics />
            </AdminRoute>
          } />
          <Route path="/admin/quality" element={
            <AdminRoute>
              <LLMQuality />
            </AdminRoute>
          } />
          <Route path="/admin/management" element={
            <AdminRoute>
              <UserManagement />
            </AdminRoute>
          } />
          <Route path="/admin/billing" element={
            <AdminRoute>
              <BillingManagement />
            </AdminRoute>
          } />
        </Routes>
      </Layout>
      <Toaster position="top-right" richColors />
    </Router>
  );
}
