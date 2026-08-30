import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./authContext.js";

export const ProtectedRoute = () => {
  const { loading, user } = useAuth();
  const location = useLocation();

  if (loading) return <div className="px-6 py-24 text-center text-soft">Loading session…</div>;
  if (!user) return <Navigate to="/auth/signin" replace state={{ from: location }} />;
  return <Outlet />;
};

export const RoleRoute = ({ allowedRoles }) => {
  const { user } = useAuth();
  return user && allowedRoles.includes(user.role) ? <Outlet /> : <Navigate to="/" replace />;
};
