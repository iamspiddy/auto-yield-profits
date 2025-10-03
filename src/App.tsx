import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { useEffect } from "react";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import Dashboard from "./pages/Dashboard";
import Deposit from "./pages/Deposit";
import Withdraw from "./pages/Withdraw";
import History from "./pages/History";
import Referrals from "./pages/Referrals";
import Profile from "./pages/Profile";
import Investments from "./pages/Investments";
import Calculator from "./pages/Calculator";

import NotFound from "./pages/NotFound";

// Admin pages
import AdminLogin from "./pages/admin/AdminLogin";
import AdminLayout from "./components/admin/AdminLayout";
import AdminRouteGuard from "./components/admin/AdminRouteGuard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminDeposits from "./pages/admin/AdminDeposits";
import AdminWithdrawals from "./pages/admin/AdminWithdrawals";
import AdminProfits from "./pages/admin/AdminProfits";
import AdminInvestments from "./pages/admin/AdminInvestments";
import AdminPins from "./pages/admin/AdminPins";

import AdminReferrals from "./pages/admin/AdminReferrals";
import AdminLogs from "./pages/admin/AdminLogs";
import AdminSetup from "./pages/admin/AdminSetup";
import AdminInvestmentPlans from "./pages/admin/AdminInvestmentPlans";
import AdminUserInvestments from "./pages/admin/AdminUserInvestments";

// Components
import FloatingChatButton from "./components/FloatingChatButton";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    document.title = "Forexcomplex - Automated Crypto Trading Platform";
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <AuthProvider>
        <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/deposit" element={<Deposit />} />
            <Route path="/withdraw" element={<Withdraw />} />
            <Route path="/history" element={<History />} />
            <Route path="/referrals" element={<Referrals />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/investments" element={<Investments />} />
            <Route path="/calculator" element={<Calculator />} />

            
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/setup" element={<AdminSetup />} />
            <Route 
              path="/admin" 
              element={
                <AdminRouteGuard>
                  <AdminLayout />
                </AdminRouteGuard>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="deposits" element={<AdminDeposits />} />
              <Route path="withdrawals" element={<AdminWithdrawals />} />
              <Route path="profits" element={<AdminProfits />} />
              <Route path="investment-plans" element={<AdminInvestmentPlans />} />
              <Route path="user-investments" element={<AdminUserInvestments />} />
              <Route path="investments" element={<AdminInvestments />} />
              <Route path="pins" element={<AdminPins />} />

              <Route path="referrals" element={<AdminReferrals />} />
              <Route path="logs" element={<AdminLogs />} />
            </Route>
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          
          {/* Floating Chat Button - Available on all pages */}
          <FloatingChatButton />
        </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
  );
};

export default App;
