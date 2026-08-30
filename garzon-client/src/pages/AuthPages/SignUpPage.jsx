import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../auth/authContext.js";
import { PasswordInput } from "../../components/StoreUI.jsx";
import { notify } from "../../utils/toast.js";

const inputClasses =
  "w-full rounded-xl border border-slate-200 bg-[#f8faff] px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-[var(--color-primary)] focus:bg-white focus:ring-4 focus:ring-[var(--color-primary-soft)]/60";

const SignUpPage = () => {
  const { register } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    try {
      await register({
        firstName: form.get("firstName"),
        lastName: form.get("lastName"),
        email: form.get("email"),
        password: form.get("password"),
      });
      formElement.reset();
      notify.success("Account created successfully. You can now sign in.");
    } catch (requestError) {
      notify.error(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--color-accent-hover)]">
            Join the community
          </p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-primary sm:text-[2.15rem]">
            Create your account
          </h2>
        </div>
        <span
          className="hidden h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-xl sm:grid"
          aria-hidden="true"
        >
          🐾
        </span>
      </div>
      <p className="mb-5 text-sm leading-6 text-slate-500">
        Register as a customer to shop and arrange campus pickup.
      </p>
      <form className="space-y-3.5" onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              htmlFor="first-name"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              First name
            </label>
            <input
              id="first-name"
              name="firstName"
              type="text"
              required
              minLength="2"
              autoComplete="given-name"
              className={inputClasses}
            />
          </div>
          <div>
            <label
              htmlFor="last-name"
              className="mb-1.5 block text-xs font-semibold text-slate-700"
            >
              Last name
            </label>
            <input
              id="last-name"
              name="lastName"
              type="text"
              required
              minLength="2"
              autoComplete="family-name"
              className={inputClasses}
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="signup-email"
            className="mb-1.5 block text-xs font-semibold text-slate-700"
          >
            Email address
          </label>
          <input
            id="signup-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={inputClasses}
          />
        </div>
        <div>
          <label
            htmlFor="signup-password"
            className="mb-1.5 block text-xs font-semibold text-slate-700"
          >
            Password
          </label>
          <PasswordInput
            id="signup-password"
            name="password"
            required
            minLength="8"
            placeholder="At least 8 characters"
            autoComplete="new-password"
            className={inputClasses}
          />
        </div>
        <button
          disabled={submitting}
          type="submit"
          className="flex w-full items-center justify-center rounded-xl bg-primary px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="mt-5 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link
          to="/auth/signin"
          className="font-bold text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </>
  );
};

export default SignUpPage;
