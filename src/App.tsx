import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { toast } from "sonner";
import Layout from "@/components/Layout/Layout";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import Dashboard from "@/pages/Dashboard/index";
import Search from "@/pages/Search";
import PatentDetail from "@/pages/PatentDetail";
import Profile from "@/pages/Profile";
import PaymentPage from "@/pages/PaymentPage";
import PaymentSuccess from "@/pages/Payment/PaymentSuccess";
import PaymentFailure from "@/pages/Payment/PaymentFailure";
import PaymentHistory from "@/pages/Payment/PaymentHistory";
import PointTest from "@/pages/PointTest";
import AuthCallback from "@/pages/AuthCallback";
import ProtectedRoute from "@/components/Auth/ProtectedRoute";
import { useAuthStore } from "@/store/authStore";
import { useThemeStore } from "@/store/themeStore";

// Admin Pages
import AdminProtectedRoute from "@/components/Auth/AdminProtectedRoute";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminDashboardSimple from "@/pages/AdminDashboardSimple";
import TestPage from "@/pages/TestPage";
import UserManagement from "@/pages/UserManagement";
import PaymentManagement from "@/pages/PaymentManagement";
import SystemMonitoring from "@/pages/SystemMonitoring";
import Analytics from "@/pages/Analytics";
import AdminSettings from "@/pages/AdminSettings";
export default function App() {
  // Zustand store hooks를 안전하게 호출
  const authStore = useAuthStore();
  const themeStore = useThemeStore();
  
  const { initialize } = authStore;
  const { isDark } = themeStore;

  useEffect(() => {
    console.log('[App] 애플리케이션 초기화 시작');
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  // 월간 무료 포인트 지급 알림 처리
  useEffect(() => {
    const handleMonthlyPointsGranted = (event: CustomEvent) => {
      const { points, message } = event.detail;
      toast.success(message, {
        description: `${points}P가 계정에 추가되었습니다.`,
        duration: 5000,
      });
    };

    window.addEventListener('monthlyPointsGranted', handleMonthlyPointsGranted as EventListener);
    
    return () => {
      window.removeEventListener('monthlyPointsGranted', handleMonthlyPointsGranted as EventListener);
    };
  }, []);

  return (
    <div>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Layout><Home /></Layout>} />
          <Route path="/login" element={<Layout><Login /></Layout>} />
          <Route path="/register" element={<Layout><Register /></Layout>} />
          <Route path="/forgot-password" element={<Layout><ForgotPassword /></Layout>} />
          <Route path="/reset-password" element={<Layout><ResetPassword /></Layout>} />
          <Route path="/auth/callback" element={<Layout><AuthCallback /></Layout>} />
          
          {/* Protected Routes */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/search" element={
            <ProtectedRoute>
              <Layout>
                <Search />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/patent/:applicationNumber" element={
            <ProtectedRoute>
              <Layout>
                <PatentDetail />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Layout>
                <Profile />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/billing" element={
            <ProtectedRoute>
              <Layout>
                <PaymentPage />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/payment/success" element={
            <ProtectedRoute>
              <Layout>
                <PaymentSuccess />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/payment/failure" element={
            <ProtectedRoute>
              <Layout>
                <PaymentFailure />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/payment/history" element={
            <ProtectedRoute>
              <Layout>
                <PaymentHistory />
              </Layout>
            </ProtectedRoute>
          } />
          <Route path="/point-test" element={
            <ProtectedRoute>
              <Layout>
                <PointTest />
              </Layout>
            </ProtectedRoute>
          } />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={
            <AdminProtectedRoute>
              <AdminDashboard />
            </AdminProtectedRoute>
          } />
          <Route 
              path="/admin/dashboard" 
              element={
                <AdminProtectedRoute>
                  <AdminDashboard />
                </AdminProtectedRoute>
              } 
            />
          <Route path="/admin/test" element={
            <AdminProtectedRoute>
              <AdminDashboardSimple />
            </AdminProtectedRoute>
          } />
          <Route path="/test" element={<TestPage />} />
          <Route path="/admin/users" element={
            <AdminProtectedRoute>
              <UserManagement />
            </AdminProtectedRoute>
          } />
          <Route path="/admin/payments" element={
            <AdminProtectedRoute>
              <PaymentManagement />
            </AdminProtectedRoute>
          } />
          <Route path="/admin/monitoring" element={
            <AdminProtectedRoute>
              <SystemMonitoring />
            </AdminProtectedRoute>
          } />
          <Route path="/admin/analytics" element={
            <AdminProtectedRoute>
              <Analytics />
            </AdminProtectedRoute>
          } />
          <Route path="/admin/settings" element={
            <AdminProtectedRoute>
              <AdminSettings />
            </AdminProtectedRoute>
          } />

        </Routes>
      </Router>
    </div>
  );
}
