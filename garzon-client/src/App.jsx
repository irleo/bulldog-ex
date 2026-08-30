import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";

// HomePage Structure
import Layout from "./layouts/Layout";
import ProductPage from "./pages/LandingPages/ProductPage";
import HomePage from "./pages/LandingPages/HomePage";
import AboutPage from "./pages/LandingPages/AboutPage";
import ProductListPage from "./pages/LandingPages/ProductListPage";

// Auth Pages Structure
import AuthLayout from "./layouts/AuthLayout";
import SignInPage from "./pages/AuthPages/SignInPage";
import SignUpPage from "./pages/AuthPages/SignUpPage";

import NotFoundPage from "./pages/NotFoundPage";
import { ProtectedRoute, RoleRoute } from "./auth/RouteGuards.jsx";
import CartPage from "./pages/Customer/CartPage.jsx";
import OrdersPage from "./pages/Customer/OrdersPage.jsx";
import ProfilePage from "./pages/Customer/ProfilePage.jsx";
import AdminConsolePage from "./pages/Admin/AdminConsolePage.jsx";
import AdminLayout from "./layouts/AdminLayout.jsx";
import AdminDashboardPage from "./pages/Admin/AdminDashboardPage.jsx";

const routes = [
  {
    path: "/",
    element: <Layout />,
    errorElement: <NotFoundPage />,
    children: [
      {
        path: "",
        element: <HomePage />,
      },
      {
        path: "about",
        element: <AboutPage />,
      },
      {
        path: "products",
        element: <ProductListPage />,
      },
      {
        path: "products/:id",
        element: <ProductPage />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: "profile",
            element: <ProfilePage />,
          },
          {
            element: <RoleRoute allowedRoles={["customer"]} />,
            children: [
              { path: "cart", element: <CartPage /> },
              { path: "orders", element: <OrdersPage /> },
            ],
          },
        ],
      },
    ],
  },
  {
    path: "admin",
    element: <ProtectedRoute />,
    errorElement: <NotFoundPage />,
    children: [
      {
        element: <RoleRoute allowedRoles={["admin"]} />,
        children: [
          {
            element: <AdminLayout />,
            children: [
              { index: true, element: <AdminDashboardPage /> },
              {
                path: "products",
                element: <AdminConsolePage key="products" section="products" />,
              },
              {
                path: "orders",
                element: <AdminConsolePage key="orders" section="orders" />,
              },
              {
                path: "reviews",
                element: <AdminConsolePage key="reviews" section="reviews" />,
              },
              { path: "users", element: <AdminConsolePage key="users" section="users" /> },
            ],
          },
        ],
      },
    ],
  },
  {
    path: "auth/",
    element: <AuthLayout />,
    errorElement: <NotFoundPage />,
    children: [
      {
        path: "signin",
        element: <SignInPage />,
      },
      {
        path: "signup",
        element: <SignUpPage />,
      },
    ],
  },
];

const router = createBrowserRouter(routes);

function App() {
  return (
    <>
      <Toaster position="top-right" richColors closeButton />
      <RouterProvider router={router} />
    </>
  );
}

export default App;
