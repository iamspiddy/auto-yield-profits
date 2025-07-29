import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminLayout } from "@/components/admin/AdminLayout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
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
            <Route path="/admin/*" element={
              <AdminGuard>
                <AdminLayout>
                  <Suspense fallback={<div className="p-8 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div></div>}>
                    <Routes>
                      <Route path="/" element={<AdminDashboard />} />
                      <Route path="/users" element={<UsersManagement />} />
                      <Route path="/deposits" element={<DepositsManagement />} />
                      <Route path="/withdrawals" element={<WithdrawalsManagement />} />
                      <Route path="/profits" element={<ProfitDistribution />} />
                      <Route path="/referrals" element={<ReferralsManagement />} />
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
