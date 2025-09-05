// components/admin/AdminGuard.jsx
import { Navigate } from "react-router-dom";
import { useUser } from "../../contexts/UserContext";

export default function AdminGuard({ children }) {
  const { isAdmin, loading } = useUser();
  if (loading) return null; // o un spinner
  if (!isAdmin) return <Navigate to="/" replace />;
  return children;
}