import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import AdminGuard from "@/components/admin/AdminGuard";
import { AdminLayout } from "@/components/admin/AdminLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Deposit from "./pages/Deposit";
import Withdraw from "./pages/Withdraw";
import History from "./pages/History";
import Referrals from "./pages/Referrals";
import Profile from "./pages/Profile";
import KYC from "./pages/KYC";
import AdminLogin from "./pages/admin/AdminLogin";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import NotFound from "./pages/NotFound";
import { Suspense, lazy } from "react";

// Lazy load admin pages
const UsersManagement = lazy(() => import('./pages/admin/UsersManagement'));
const DepositsManagement = lazy(() => import('./pages/admin/DepositsManagement'));
const WithdrawalsManagement = lazy(() => import('./pages/admin/WithdrawalsManagement'));
const ProfitDistribution = lazy(() => import('./pages/admin/ProfitDistribution'));
const ReferralsManagement = lazy(() => import('./pages/admin/ReferralsManagement'));
const ActivityLog = lazy(() => import('./pages/admin/ActivityLog'));
const KYCManagement = lazy(() => import('./pages/admin/KYCManagement'));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/deposit" element={<Deposit />} />
            <Route path="/withdraw" element={<Withdraw />} />
            <Route path="/history" element={<History />} />
            <Route path="/referrals" element={<Referrals />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/kyc" element={<KYC />} />
            
            {/* Admin Routes */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/*" element={
              <AdminGuard>
                <AdminLayout>
                  <Suspense fallback={<div className="p-8 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div></div>}>
                    <Routes>
                      <Route path="/dashboard" element={<AdminDashboard />} />
                      <Route path="/users" element={<UsersManagement />} />
                      <Route path="/deposits" element={<DepositsManagement />} />
                      <Route path="/withdrawals" element={<WithdrawalsManagement />} />
                      <Route path="/profits" element={<ProfitDistribution />} />
                      <Route path="/referrals" element={<ReferralsManagement />} />
                      <Route path="/kyc" element={<KYCManagement />} />
                      <Route path="/activity" element={<ActivityLog />} />
                    </Routes>
                  </Suspense>
                </AdminLayout>
              </AdminGuard>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
