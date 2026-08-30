import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/authContext.js";
import NavBar from "../components/NavBar";
import Footer from "../components/Footer";

const Layout = () => {
  const { user } = useAuth();

  if (user?.role === "admin") {
    return <Navigate to="/admin/products" replace />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-page text-default">
      <NavBar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default Layout;
