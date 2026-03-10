import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import Dashboard from "./pages/admin/Dashboard";
import POS from "./pages/admin/POS";
import Attendance from "./pages/admin/Attendance";
import ServicesManagement from "./pages/admin/ServicesManagement";
import Employees from "./pages/admin/Employees";
import ExpensesPage from "./pages/admin/Expenses";
import BookingsPage from "./pages/admin/Bookings";
import Settings from "./pages/admin/Settings";

const queryClient = new QueryClient();

const App = () => {
  const { i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.dir = i18n.language === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);
  

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin" element={<Dashboard />} />
              <Route path="/admin/pos" element={<POS />} />
              <Route path="/admin/attendance" element={<Attendance />} />
              <Route path="/admin/expenses" element={<ExpensesPage />} />
              <Route path="/admin/bookings" element={<BookingsPage />} />
              <Route path="/admin/services" element={<ServicesManagement />} />
              <Route path="/admin/employees" element={<Employees />} />
              <Route path="/admin/settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
