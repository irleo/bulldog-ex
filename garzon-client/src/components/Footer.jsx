import { Link } from "react-router-dom";
import { useAuth } from "../auth/authContext.js";

const Footer = () => {
  const { user } = useAuth();
  const isCustomer = user?.role === "customer";
  const accountLinks = isCustomer
    ? [
        ["Cart", "/cart"],
        ["Orders", "/orders"],
        ["Profile", "/profile"],
      ]
    : [
        ["Sign in", "/auth/signin"],
        ["Create account", "/auth/signup"],
      ];

  return (
    <footer className="mt-4 bg-[#0b1b46] text-white">
      <div className="flex w-full flex-col gap-10 px-6 py-12 sm:px-8 md:flex-row md:items-start md:justify-between lg:px-14 xl:px-24">
        <div className="max-w-md">
          <div className="flex items-center gap-3">
            <p className="font-display text-2xl font-extrabold">
              BulldogEx Shop
            </p>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[#a9b4d6]">
            Campus essentials, simple ordering, and easy access to store pages
            for students and staff.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-x-16 gap-y-8 sm:gap-x-24 md:shrink-0">
          <nav aria-label="Explore">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#d4af37]">
              Explore
            </p>
            <div className="flex flex-col items-start gap-2 text-sm text-[#c7d1ea]">
              <Link to="/" className="hover:text-white">
                Home
              </Link>
              <Link to="/about" className="hover:text-white">
                About
              </Link>
              <Link to="/products" className="hover:text-white">
                Products
              </Link>
            </div>
          </nav>
          <nav aria-label="Account">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#d4af37]">
              Account
            </p>
            <div className="flex flex-col items-start gap-2 text-sm text-[#c7d1ea]">
              {accountLinks.map(([label, to]) => (
                <Link key={to} to={to} className="hover:text-white">
                  {label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="w-full px-6 py-4 text-xs text-[#7c88ad] sm:px-8 lg:px-14 xl:px-24">
          © {new Date().getFullYear()} BulldogEx Shop. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
