import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext.js";

const navigation = [
  { label: "Dashboard", to: "/admin", icon: "chart" },
  { label: "Products", to: "/admin/products", icon: "box" },
  { label: "Orders", to: "/admin/orders", icon: "receipt" },
  { label: "Reviews", to: "/admin/reviews", icon: "star" },
  { label: "Users", to: "/admin/users", icon: "users" },
];

const icons = {
  chart: <path d="M4 20V10m6 10V4m6 16v-7m4 7H2" />,
  box: (
    <path d="m3.5 7.5 8.5 4.7 8.5-4.7M12 12.2V21M5 8.3v7.9L12 20l7-3.8V8.3L12 4.5 5 8.3Z" />
  ),
  receipt: <path d="M6 3.5h12v17l-3-2-3 2-3-2-3 2v-17Zm3 5h6m-6 4h6" />,
  star: (
    <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.8-5.4 2.8 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
  ),
  users: (
    <path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20m6.5-9.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm7-1a3 3 0 0 1 0 5.8m4.5 4.2V18a3.5 3.5 0 0 0-2.6-3.4" />
  ),
  logout: <path d="M10 4H5v16h5m6-4 4-4-4-4m4 4H9" />,
};

const Icon = ({ name }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-5 w-5 shrink-0"
    aria-hidden="true"
  >
    {icons[name]}
  </svg>
);

const AdminLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const initials =
    `${user?.firstName?.[0] ?? "A"}${user?.lastName?.[0] ?? ""}`.toUpperCase();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/auth/signin");
    } catch (error) {
      console.error("Unable to log out:", error);
    }
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div
        className={`flex h-20 items-center border-b border-white/10 ${collapsed ? "justify-center px-3" : "justify-between px-5"}`}
      >
        <NavLink
          to="/admin"
          className="flex min-w-0 items-center gap-3"
          aria-label="BulldogEx admin home"
        >
          <span className="font-display grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#d4af37] text-xs font-extrabold text-[#071230]">
            NU
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate font-[Sora] text-base font-bold text-white">
                BulldogEx
              </span>
              <span className="block text-[9px] font-bold uppercase tracking-[0.22em] text-[#e6c756]">
                Admin portal
              </span>
            </span>
          )}
        </NavLink>
        {!collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            className="hidden rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white lg:block"
            aria-label="Collapse sidebar"
          >
            ←
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 px-3 py-6" aria-label="Admin navigation">
        {!collapsed && (
          <p className="mb-3 px-3 text-[9px] font-bold uppercase tracking-[0.22em] text-white/35">
            Store management
          </p>
        )}
        {navigation.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/admin"}
            onClick={() => setMobileOpen(false)}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `group flex items-center rounded-xl py-3 text-sm font-semibold transition ${collapsed ? "justify-center px-2" : "gap-3 px-3"} ${isActive ? "bg-[#d4af37] text-[#0b1b46] shadow-lg shadow-black/15" : "text-blue-100/65 hover:bg-white/10 hover:text-white"}`
            }
          >
            <Icon name={item.icon} />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-1 border-t border-white/10 p-3">
        <button
          type="button"
          onClick={handleLogout}
          title={collapsed ? "Log out" : undefined}
          className={`flex w-full items-center rounded-xl py-3 text-sm font-semibold text-blue-100/65 transition hover:bg-red-400/10 hover:text-red-200 ${collapsed ? "justify-center px-2" : "gap-3 px-3"}`}
        >
          <Icon name="logout" />
          {!collapsed && <span>Log out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f3f5fa] text-default">
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden bg-[#0b1b46] shadow-2xl transition-[width] duration-300 lg:block ${collapsed ? "w-20" : "w-64"}`}
      >
        {sidebar}
        {collapsed && (
          <button
            type="button"
            onClick={() => setCollapsed(false)}
            className="absolute -right-3 top-7 grid h-7 w-7 place-items-center rounded-full border border-slate-200 bg-white text-xs font-bold text-primary shadow-md"
            aria-label="Expand sidebar"
          >
            →
          </button>
        )}
      </aside>

      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0b1b46] shadow-2xl transition-transform duration-300 lg:hidden ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {sidebar}
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="absolute right-4 top-6 rounded-lg p-2 text-white/70"
          aria-label="Close navigation"
        >
          ✕
        </button>
      </aside>

      <div
        className={`min-h-screen transition-[margin] duration-300 ${collapsed ? "lg:ml-20" : "lg:ml-64"}`}
      >
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-slate-200/80 bg-white/85 px-4 backdrop-blur-xl sm:px-7">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-primary lg:hidden"
              aria-label="Open navigation"
            >
              <span className="text-xl">☰</span>
            </button>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--color-accent-hover)]">
                Administration
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-700">
                Store operations
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-right sm:block">
              <span className="block text-xs font-semibold text-slate-700">
                {user?.firstName} {user?.lastName}
              </span>
              <span className="block text-[10px] text-slate-400">
                Administrator
              </span>
            </span>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-xs font-bold text-white">
              {initials}
            </span>
          </div>
        </header>
        <main className="px-4 py-7 sm:px-7 lg:px-9">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
