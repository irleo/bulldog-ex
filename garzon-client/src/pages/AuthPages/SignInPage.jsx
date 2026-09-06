import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/authContext.js";
import { PasswordInput } from "../../components/StoreUI.jsx";

const inputClasses =
  "w-full rounded-xl border border-slate-200 bg-[#f8faff] px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[var(--color-primary)] focus:bg-white focus:ring-4 focus:ring-[var(--color-primary-soft)]/60";

const SignInPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const form = new FormData(event.currentTarget);

    try {
      const user = await login(
        { email: form.get("email"), password: form.get("password") },
        form.get("remember") === "on",
      );
      const destination =
        user.role === "admin"
          ? "/admin"
          : (location.state?.from?.pathname ?? "/products");
      navigate(destination, { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--color-accent-hover)]">
            Welcome back
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-[2.15rem]">
            Sign in to BulldogEx
          </h2>
        </div>
        <span
          className="hidden h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-xl sm:grid"
          aria-hidden="true"
        >
          🐾
        </span>
      </div>
      <p className="mb-6 text-sm leading-6 text-slate-500">
        Access your orders, pickup details, and store tools.
      </p>
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label
            htmlFor="signin-email"
            className="mb-2 block text-xs font-semibold text-slate-700"
          >
            Email address
          </label>
          <input
            id="signin-email"
            name="email"
            type="email"
            required
            placeholder="student@national-u.edu.ph"
            autoComplete="email"
            className={inputClasses}
          />
        </div>
        <div>
          <label
            htmlFor="signin-password"
            className="mb-2 block text-xs font-semibold text-slate-700"
          >
            Password
          </label>
          <PasswordInput
            id="signin-password"
            name="password"
            required
            placeholder="Enter your password"
            autoComplete="current-password"
            className={inputClasses}
          />
        </div>
        <label className="flex w-fit cursor-pointer items-center gap-2.5 text-xs text-slate-600">
          <input
            name="remember"
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 accent-[var(--color-primary)]"
          />{" "}
          Keep me signed in
        </label>
        <button
          disabled={submitting}
          type="submit"
          className="group flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-white shadow-[0_12px_24px_-12px_rgba(20,45,114,0.8)] transition hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        New to BulldogEx?{" "}
        <Link
          to="/auth/signup"
          className="font-bold text-primary hover:underline"
        >
          Create an account
        </Link>
      </p>
    </>
  );
};

export default SignInPage;
