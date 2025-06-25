
// import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SocketProvider } from "@/hooks/useSocket";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { ConversationsPage } from "./pages/ConversationsPage";
import { OnlineUsersPage } from "./pages/OnlineUsersPage";
import { WidgetGeneratorPage } from "./pages/WidgetGeneratorPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { Toaster } from "sonner";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
  
        <SocketProvider>
          <Toaster />

          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              } />
              <Route path="/conversations" element={
                <ProtectedRoute>
                  <ConversationsPage />
                </ProtectedRoute>
              } />
              <Route path="/online-users" element={
                <ProtectedRoute>
                  <OnlineUsersPage />
                </ProtectedRoute>
              } />
              <Route path="/widget-generator" element={
                <ProtectedRoute>
                  <WidgetGeneratorPage />
                </ProtectedRoute>
              } />
              <Route path="/analytics" element={
                <ProtectedRoute>
                  <AnalyticsPage />
                </ProtectedRoute>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </SocketProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
