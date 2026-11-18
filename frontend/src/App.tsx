import { Route, Routes } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./layouts/AdminLayout";
import DashboardLayout from "./layouts/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import DisputesPage from "./pages/DisputesPage";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import MessagesPage from "./pages/MessagesPage";
import NotFound from "./pages/NotFound";
import Register from "./pages/Register";
import SecurityPage from "./pages/SecurityPage";
import SellersPage from "./pages/SellersPage";
import SettingsPage from "./pages/SettingsPage";
import TrustPage from "./pages/TrustPage";
import AdminDisputes from "./pages/admin/AdminDisputes";
import AdminOverview from "./pages/admin/AdminOverview";
import AdminSecurity from "./pages/admin/AdminSecurity";
import AdminUsers from "./pages/admin/AdminUsers";

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/sellers" element={<SellersPage />} />

      {/* Buyer & Seller Workspace */}
      <Route element={<ProtectedRoute allowedRoles={["buyer", "seller"]} />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/dashboard/messages" element={<MessagesPage />} />
          <Route path="/dashboard/messages/:id" element={<MessagesPage />} />
          <Route path="/dashboard/trust" element={<TrustPage />} />
          <Route path="/dashboard/security" element={<SecurityPage />} />
          <Route path="/dashboard/disputes" element={<DisputesPage />} />
          <Route path="/dashboard/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      {/* Administrator Console */}
      <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin" element={<AdminOverview />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/security" element={<AdminSecurity />} />
          <Route path="/admin/disputes" element={<AdminDisputes />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
