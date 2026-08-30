import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import studyKit from "../assets/img/daily_essentials.png";

const apiBaseUrl =
  import.meta.env.VITE_API_URL ?? "http://localhost:5000/api/v1";
const serverOrigin = new URL(apiBaseUrl, window.location.origin).origin;

const resolveImageSource = (source) =>
  source?.startsWith("/uploads/") ? `${serverOrigin}${source}` : source;

const getLocalProductImage = (product) => {
  const searchable = `${product?.sku ?? ""} ${product?.name ?? ""}`.toLowerCase();
  if (searchable.includes("scarf")) return "/products/nu_scarf_v2.png";
  if (searchable.includes("hoodie")) return "/products/nu_hoodie.png";
  if (searchable.includes("sweatshirt") || searchable.includes("sweat shirt")) return "/products/nu_sweatshirt.png";
  if (searchable.includes("varsity") || searchable.includes("jacket")) return "/products/nu_varsity_jacket.png";
  if (searchable.includes("cap")) return "/products/nu_est_cap.png";
  if (searchable.includes("baller")) return "/products/nu_baller.png";
  if (searchable.includes("study") || searchable.includes("-stu-")) return studyKit;
  if (searchable.includes("v2") || searchable.includes("app-002")) return "/products/nu_athletic_v2_tshirt.png";
  if (searchable.includes("-acc-")) return "/products/nu_scarf_v2.png";
  return "/products/nu_athletic_v1_tshirt.png";
};

export const ProductImage = ({ product, className = "", alt = product?.name ?? "Product" }) => {
  const fallback = getLocalProductImage(product);
  const savedSource = resolveImageSource(
    product?.images?.find(
      (image) => typeof image === "string" && image.trim(),
    ),
  );
  const [source, setSource] = useState(savedSource || fallback);

  useEffect(() => setSource(savedSource || fallback), [fallback, savedSource]);

  return <img src={source} alt={alt} className={className} onError={() => source !== fallback && setSource(fallback)} />;
};

const buttonVariants = {
  primary: "border-[#d4af37] bg-[#d4af37] text-[#071230] hover:bg-[#c19c2f]",
  secondary: "border-[#0b1b46] bg-[#0b1b46] text-white hover:bg-[#071230]",
  outline: "border-[#e3e7f0] bg-transparent text-[#0b1b46] hover:bg-[#eef1f8]",
};

export const Button = ({ children, to, type = "button", variant = "secondary", className = "" }) => {
  const classes = `font-body inline-flex items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${buttonVariants[variant] ?? buttonVariants.secondary} ${className}`.trim();
  return to ? <Link to={to} className={classes}>{children}</Link> : <button type={type} className={classes}>{children}</button>;
};

export const PasswordInput = ({ className = "", ...inputProps }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...inputProps}
        type={visible ? "text" : "password"}
        className={`${className} pr-12`}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        aria-controls={inputProps.id}
        className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-slate-500 transition hover:text-[var(--color-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--color-primary)]"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-4.5 w-4.5"
          aria-hidden="true"
        >
          {visible ? (
            <>
              <path d="m3 3 18 18" />
              <path d="M10.6 10.7a2 2 0 0 0 2.7 2.7" />
              <path d="M9.9 4.3A10.5 10.5 0 0 1 12 4c5.5 0 9 8 9 8a18 18 0 0 1-2.1 3.2M6.6 6.6C4.3 8.2 3 12 3 12s3.5 8 9 8a9.8 9.8 0 0 0 4.1-.9" />
            </>
          ) : (
            <>
              <path d="M3 12s3.5-8 9-8 9 8 9 8-3.5 8-9 8-9-8-9-8Z" />
              <circle cx="12" cy="12" r="2.5" />
            </>
          )}
        </svg>
      </button>
    </div>
  );
};

const iconPaths = {
  bag: (
    <>
      <path d="M5 8h14l-1 12H6L5 8Z" />
      <path d="M9 9V6a3 3 0 0 1 6 0v3" />
    </>
  ),
  box: (
    <>
      <path d="m4 7 8 4 8-4-8-4-8 4Z" />
      <path d="M4 7v10l8 4 8-4V7M12 11v10" />
    </>
  ),
  cart: (
    <>
      <path d="M3 4h2l2 11h10l2-8H6" />
      <circle cx="9" cy="19" r="1" />
      <circle cx="17" cy="19" r="1" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  chevron: <path d="m9 6 6 6-6 6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  close: <path d="m6 6 12 12M18 6 6 18" />,
  edit: (
    <>
      <path d="m4 16-1 5 5-1L19 9l-4-4L4 16Z" />
      <path d="m13 7 4 4" />
    </>
  ),
  location: (
    <>
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  minus: <path d="M5 12h14" />,
  package: (
    <>
      <path d="m4 8 8 4 8-4M12 12v9M5 8v9l7 4 7-4V8l-7-4-7 4Z" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 4 4" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  star: (
    <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.8-5.4 2.8 1-6.1-4.4-4.3 6.1-.9L12 3Z" />
  ),
  trash: (
    <>
      <path d="M4 7h16M9 7V4h6v3m3 0-1 14H7L6 7" />
      <path d="M10 11v6m4-6v6" />
    </>
  ),
  truck: (
    <>
      <path d="M3 6h11v11H3V6Zm11 4h4l3 3v4h-7v-7Z" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="18" cy="18" r="2" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
};

export const StoreIcon = ({ name, className = "h-5 w-5" }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {iconPaths[name]}
  </svg>
);

export const StoreCard = ({ children, className = "", accent = true }) => (
  <div
    className={`rounded-2xl border border-[#e3e7f0] bg-white ${accent ? "border-t-[3px] border-t-[#d4af37]" : ""} ${className}`}
  >
    {children}
  </div>
);

export const StorePage = ({ children, className = "" }) => (
  <div
    className={`w-full px-6 py-8 sm:px-8 lg:px-10 xl:px-14 ${className}`.trim()}
  >
    {children}
  </div>
);

export const StorePagination = ({ page, pageSize, total, onPageChange }) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  if (total <= pageSize) return null;

  return (
    <nav
      className="mt-5 flex flex-wrap items-center justify-between gap-3"
      aria-label="Pagination"
    >
      <p className="text-xs text-[#64748b]">
        Showing {(currentPage - 1) * pageSize + 1}–
        {Math.min(currentPage * pageSize, total)} of {total}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="rounded-lg border border-[#e3e7f0] bg-white px-3 py-2 text-xs font-semibold disabled:opacity-45"
        >
          Previous
        </button>
        {Array.from({ length: totalPages }, (_, index) => index + 1).map(
          (pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => onPageChange(pageNumber)}
              aria-current={pageNumber === currentPage ? "page" : undefined}
              className={`h-8 min-w-8 rounded-lg px-2 text-xs font-semibold ${pageNumber === currentPage ? "bg-[#0b1b46] text-white" : "border border-[#e3e7f0] bg-white text-[#0b1b46]"}`}
            >
              {pageNumber}
            </button>
          ),
        )}
        <button
          type="button"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="rounded-lg border border-[#e3e7f0] bg-white px-3 py-2 text-xs font-semibold disabled:opacity-45"
        >
          Next
        </button>
      </div>
    </nav>
  );
};

export const StorePageHeader = ({ eyebrow, title, description, action }) => (
  <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
    <div>
      <p className="font-body text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a9841f]">
        {eyebrow}
      </p>
      <h1 className="font-display mt-1.5 text-[26px] font-extrabold leading-tight text-[#101828]">
        {title}
      </h1>
      {description && (
        <p className="font-body mt-1 max-w-2xl text-sm text-[#64748b]">
          {description}
        </p>
      )}
    </div>
    {action}
  </header>
);

const statusStyles = {
  pending: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  ready_for_claiming: "bg-[#f6ecc9] text-[#a9841f]",
  claimed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  active: "bg-green-100 text-green-700",
  inactive: "bg-red-100 text-red-700",
};

export const StatusPill = ({ status }) => {
  const normalized = String(status || "pending").toLowerCase();
  const label = normalized.replaceAll("_", " ");
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[normalized] ?? "bg-slate-100 text-slate-600"}`}
    >
      <StoreIcon
        name={
          normalized === "cancelled" || normalized === "inactive"
            ? "close"
            : normalized === "pending"
              ? "clock"
              : "check"
        }
        className="h-3 w-3"
      />
      {label}
    </span>
  );
};
