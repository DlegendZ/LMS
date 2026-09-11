import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import DashboardLayout from "@/components/DashboardLayout";

// Auth pages
import LoginPage from "./pages/LoginPage";
import DashboardRedirect from "./pages/DashboardRedirect";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import UsersPage from "./pages/admin/UsersPage";
import BooksPage from "./pages/admin/BooksPage";
import CategoriesPage from "./pages/admin/CategoriesPage";
import BorrowRecordsPage from "./pages/admin/BorrowRecordsPage";
import FineRecordsPage from "./pages/admin/FineRecordsPage";
import RegisterAdminPage from "./pages/admin/RegisterAdminPage";
import RegisterLibrarianPage from "./pages/admin/RegisterLibrarianPage";

// Librarian pages
import LibrarianDashboard from "./pages/librarian/LibrarianDashboard";
import MembersPage from "./pages/librarian/MembersPage";
import AddBookPage from "./pages/librarian/AddBookPage";
import LibrarianBorrowRecordsPage from "./pages/librarian/BorrowRecordsPage";
import LibrarianFineRecordsPage from "./pages/librarian/FineRecordsPage";
import RegisterMemberPage from "./pages/librarian/RegisterMemberPage";

// Member pages
import MemberDashboard from "./pages/member/MemberDashboard";
import BrowseBooksPage from "./pages/member/BrowseBooksPage";
import MyBorrowsPage from "./pages/member/MyBorrowsPage";
import MyFinesPage from "./pages/member/MyFinesPage";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            
            {/* Dashboard redirect */}
            <Route path="/" element={<DashboardRedirect />} />
            <Route path="/dashboard" element={<DashboardRedirect />} />

            {/* Admin routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={[1]}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="books" element={<BooksPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="borrow-records" element={<BorrowRecordsPage />} />
              <Route path="fine-records" element={<FineRecordsPage />} />
              <Route path="register-admin" element={<RegisterAdminPage />} />
              <Route path="register-librarian" element={<RegisterLibrarianPage />} />
            </Route>

            {/* Librarian routes */}
            <Route
              path="/librarian"
              element={
                <ProtectedRoute allowedRoles={[2]}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<LibrarianDashboard />} />
              <Route path="members" element={<MembersPage />} />
              <Route path="add-book" element={<AddBookPage />} />
              <Route path="borrow-records" element={<LibrarianBorrowRecordsPage />} />
              <Route path="fine-records" element={<LibrarianFineRecordsPage />} />
              <Route path="register-member" element={<RegisterMemberPage />} />
            </Route>

            {/* Member routes */}
            <Route
              path="/member"
              element={
                <ProtectedRoute allowedRoles={[3]}>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<MemberDashboard />} />
              <Route path="books" element={<BrowseBooksPage />} />
              <Route path="my-borrows" element={<MyBorrowsPage />} />
              <Route path="my-fines" element={<MyFinesPage />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
