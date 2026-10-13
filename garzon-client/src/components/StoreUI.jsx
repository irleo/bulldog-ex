import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link, useBlocker } from "react-router-dom";
import { API_BASE_URL } from "../api/config.js";

/** @typedef {{title: string, message: string, confirmLabel: string, cancelLabel?: string, destructive?: boolean, onConfirm: () => unknown | Promise<unknown>, onCancel?: () => void}} ConfirmationOptions */

/** @param {{options: ConfirmationOptions, onClose: (confirmed: boolean) => void}} props */
const ConfirmationDialog = ({ options, onClose }) => {
  const dialog = useRef(/** @type {HTMLDialogElement|null} */ (null));
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    element.showModal();
    return () => {
      element.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus();
    };
  }, []);

  const cancel = () => {
    if (inFlight.current) return;
    options.onCancel?.();
    onClose(false);
  };
  const submit = async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError("");
    try {
      const result = await options.onConfirm();
      if (result === false)
        throw new Error("The action could not be completed. Please try again.");
      onClose(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "The action could not be completed. Please try again.",
      );
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={pending}
      onCancel={(event) => {
        event.preventDefault();
        cancel();
      }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-2xl border border-[#e3e7f0] bg-white p-0 text-[#101828] shadow-2xl backdrop:bg-[#071230]/55 backdrop:backdrop-blur-sm"
    >
      <div className="p-6">
        <h2 id={titleId} className="font-display text-lg font-extrabold">
          {options.title}
        </h2>
        <p
          id={descriptionId}
          className="mt-2 whitespace-pre-line text-sm leading-6 text-[#64748b]"
        >
          {options.message}
        </p>
        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700"
          >
            {error}
          </p>
        )}
      </div>
      <div className="flex justify-end gap-2 border-t border-[#e3e7f0] bg-[#f8f9fc] px-6 py-4">
        <button
          type="button"
          autoFocus
          disabled={pending}
          onClick={cancel}
          className="rounded-lg border border-[#e3e7f0] bg-white px-4 py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {options.cancelLabel ?? "Cancel"}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className={`rounded-lg px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 ${options.destructive ? "bg-red-700" : "bg-[#0b1b46]"}`}
        >
          {pending ? "Processing…" : options.confirmLabel}
        </button>
      </div>
    </dialog>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useConfirmation = () => {
  const [options, setOptions] = useState(
    /** @type {ConfirmationOptions|null} */ (null),
  );
  const opened = useRef(false);
  const resolve = useRef(
    /** @type {((confirmed: boolean) => void)|null} */ (null),
  );
  const confirm = useCallback(
    /** @param {ConfirmationOptions} next */ (next) => {
      if (opened.current) return Promise.resolve(false);
      opened.current = true;
      return new Promise((done) => {
        resolve.current = done;
        setOptions(next);
      });
    },
    [],
  );
  const close = useCallback((confirmed) => {
    opened.current = false;
    setOptions(null);
    resolve.current?.(confirmed);
    resolve.current = null;
  }, []);
  useEffect(
    () => () => {
      resolve.current?.(false);
    },
    [],
  );
  return {
    confirm,
    confirmation: options && (
      <ConfirmationDialog options={options} onClose={close} />
    ),
  };
};

/** @param {HTMLFormElement} form */
const formSnapshot = (form) =>
  JSON.stringify(
    Array.from(new FormData(form), ([key, value]) => [
      key,
      value instanceof File
        ? value.name
          ? [value.name, value.size, value.lastModified]
          : null
        : value,
    ]),
  );

/** @param {(options: ConfirmationOptions) => void} confirm */
// eslint-disable-next-line react-refresh/only-export-components
export const useUnsavedForm = (confirm) => {
  const form = useRef(/** @type {HTMLFormElement|null} */ (null));
  const baseline = useRef("");
  const dirty = useRef(false);
  const formRef = useCallback(
    /** @param {HTMLFormElement|null} element */ (element) => {
      form.current = element;
      if (element) {
        baseline.current = formSnapshot(element);
        dirty.current = false;
      }
    },
    [],
  );
  const onFormChange = useCallback(() => {
    if (form.current)
      dirty.current = formSnapshot(form.current) !== baseline.current;
  }, []);
  const markSaved = useCallback(() => {
    dirty.current = false;
    if (form.current) baseline.current = formSnapshot(form.current);
  }, []);
  const guardDiscard = useCallback(
    /** @param {() => void} action */ (action) => {
      if (!dirty.current) {
        action();
        return;
      }
      confirm({
        title: "Discard changes?",
        message:
          "You have unsaved changes. Leaving this form will permanently discard those edits.",
        cancelLabel: "Stay",
        confirmLabel: "Discard changes",
        destructive: true,
        onConfirm: () => {
          markSaved();
          action();
        },
      });
    },
    [confirm, markSaved],
  );
  const blocker = useBlocker(useCallback(() => dirty.current, []));
  useEffect(() => {
    if (blocker.state !== "blocked") return;
    confirm({
      title: "Discard changes?",
      message:
        "You have unsaved changes. Leaving this page will permanently discard those edits.",
      cancelLabel: "Stay",
      confirmLabel: "Discard changes",
      destructive: true,
      onCancel: () => blocker.reset(),
      onConfirm: () => {
        markSaved();
        blocker.proceed();
      },
    });
  }, [blocker, confirm, markSaved]);
  useEffect(() => {
    const warn = (event) => {
      if (!dirty.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  return { formRef, onFormChange, markSaved, guardDiscard };
};

const serverOrigin = new URL(API_BASE_URL, window.location.origin).origin;

const resolveImageSource = (source) =>
  source?.startsWith("/uploads/") ? `${serverOrigin}${source}` : source;

export const ProductImage = ({
  product,
  className = "",
  alt = product?.name ?? "Product",
}) => {
  const savedSource = resolveImageSource(
    product?.images?.find((image) => typeof image === "string" && image.trim()),
  );
  const [failedSource, setFailedSource] = useState(null);
  if (!savedSource || failedSource === savedSource) {
    return (
      <span
        role="img"
        aria-label={`${alt}: image unavailable`}
        className={`flex items-center justify-center bg-slate-100 p-3 text-center text-xs text-slate-500 ${className}`}
      >
        Image unavailable
      </span>
    );
  }
  return (
    <img
      src={savedSource}
      alt={alt}
      className={className}
      onError={() => setFailedSource(savedSource)}
    />
  );
};

const buttonVariants = {
  primary: "border-[#d4af37] bg-[#d4af37] text-[#071230] hover:bg-[#c19c2f]",
  secondary: "border-[#0b1b46] bg-[#0b1b46] text-white hover:bg-[#071230]",
  outline: "border-[#e3e7f0] bg-transparent text-[#0b1b46] hover:bg-[#eef1f8]",
};

export const Button = ({
  children,
  to,
  type = "button",
  variant = "secondary",
  className = "",
}) => {
  const classes =
    `font-body inline-flex items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-semibold transition ${buttonVariants[variant] ?? buttonVariants.secondary} ${className}`.trim();
  return to ? (
    <Link to={to} className={classes}>
      {children}
    </Link>
  ) : (
    <button type={type} className={classes}>
      {children}
    </button>
  );
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
