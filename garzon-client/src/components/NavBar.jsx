import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext.js";
import { StoreIcon } from "./StoreUI.jsx";

const guestLinks = [
  ["Home", "/"],
  ["About", "/about"],
  ["Products", "/products"],
];
const customerLinks = [
  ["Home", "/"],
  ["About", "/about"],
  ["Products", "/products"],
  ["Orders", "/orders"],
  ["Profile", "/profile"],
];

const navLinkClassName = ({ isActive }) =>
  `rounded-full px-3.5 py-2 text-[13px] font-semibold transition ${isActive ? "bg-[#0b1b46] text-white" : "text-[#101828] hover:bg-[#eef1f8]"}`;

const NavBar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isCustomer = user?.role === "customer";
  const links = isCustomer ? customerLinks : guestLinks;

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/");
    } catch (error) {
      console.error("Unable to log out:", error);
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[#e3e7f0] bg-white">
      <div className="h-[3px] bg-[#d4af37]" />
      <div className="flex h-16 w-full items-center justify-between gap-3 px-4 sm:px-8 lg:px-10 xl:px-14">
        <NavLink
          to={isCustomer ? "/products" : "/"}
          className="flex shrink-0 items-center gap-2"
        >
          <div
            className="font-display flex h-8 w-8 items-center justify-center rounded-full bg-[#0b1b46] text-xs font-extrabold text-[#d4af37]"
            aria-hidden="true"
          >
            NU
          </div>
          <span className="font-display hidden text-[15px] font-extrabold text-[#0b1b46] sm:block">
            BulldogEx Shop
          </span>
        </NavLink>

        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Store navigation"
        >
          {links.map(([label, to]) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={navLinkClassName}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {isCustomer && (
            <NavLink
              to="/cart"
              className={({ isActive }) =>
                `relative grid h-10 w-10 place-items-center rounded-full ${isActive ? "bg-[#d4af37] text-[#071230]" : "bg-[#eef1f8] text-[#0b1b46]"}`
              }
              aria-label="Cart"
            >
            
                <StoreIcon name="cart" className="h-5 w-5" /> 
    
            </NavLink>
          )}
          {user ? (
            <button
              onClick={handleLogout}
              className="rounded-lg border border-[#e3e7f0] px-3 py-2 text-xs font-semibold text-[#0b1b46] transition hover:bg-[#eef1f8]"
            >
              Log out
            </button>
          ) : (
            <NavLink
              to="/auth/signin"
              className="rounded-lg bg-[#0b1b46] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#071230]"
            >
              Sign in
            </NavLink>
          )}
        </div>
      </div>
    </header>
  );
};

export default NavBar;
