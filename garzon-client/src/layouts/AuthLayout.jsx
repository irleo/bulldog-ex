import { Link, Outlet } from "react-router-dom";
import nubg from "../assets/img/nu-building.webp";
import logo from "../assets/img/nubdexchange_logo.webp";

const AuthLayout = () => (
  <section className="min-h-screen overflow-hidden bg-[#eef2fb] text-default lg:h-screen">
    <div className="grid min-h-screen lg:h-full lg:grid-cols-[minmax(0,1.05fr)_minmax(32rem,0.95fr)]">
      <aside className="relative hidden min-h-0 overflow-hidden bg-primary lg:flex lg:flex-col lg:justify-between">
        <img
          src={nubg}
          alt="National University campus"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(7,20,58,0.97)_4%,rgba(20,45,114,0.84)_56%,rgba(20,45,114,0.35)_100%)]" />
        <div className="absolute -left-24 top-1/3 h-80 w-80 rounded-full border border-white/10" />
        <div className="absolute -left-8 top-[42%] h-48 w-48 rounded-full border border-[var(--color-accent)]/30" />
        <div className="relative z-10 flex items-center justify-between px-10 py-8 xl:px-14">
          <Link
            to="/"
            className="group flex items-center gap-3"
            aria-label="BulldogEx Shop home"
          >
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-white/20 bg-white/95 shadow-lg shadow-black/20 transition group-hover:-translate-y-0.5">
              <img src={logo} alt="" className="h-10 w-10 object-contain" />
            </span>
            <span>
              <span className="block font-[Sora] text-lg font-bold tracking-tight text-white">
                BulldogEx
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.26em] text-white/60">
                Campus shop
              </span>
            </span>
          </Link>
          <Link
            to="/"
            className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/70 transition hover:text-white"
          >
            Back to store <span aria-hidden="true">↗</span>
          </Link>
        </div>
        <div className="relative z-10 max-w-2xl px-10 pb-8 xl:px-14 xl:pb-12">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#f5d977] backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-[#f5d977] shadow-[0_0_12px_#f5d977]" />{" "}
            Made for the NU community
          </div>
          <h1 className="max-w-xl text-4xl font-semibold leading-[1.12] text-white xl:text-5xl">
            Campus essentials,
            <span className="block text-[#f5d977]">all in one place.</span>
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-7 text-blue-50/75 xl:text-base">
            Sign in to shop official gear, manage your orders, and arrange
            pickup around your class schedule.
          </p>
        </div>
      </aside>
      <main className="relative flex min-h-screen items-start overflow-y-auto px-5 py-8 sm:px-10 lg:min-h-0 lg:px-12 lg:py-8 xl:px-20">
        <div className="absolute -right-28 -top-28 h-80 w-80 rounded-full bg-[var(--color-primary-soft)]/70 blur-3xl" />
        <div className="absolute -bottom-40 left-0 h-96 w-96 rounded-full bg-[#f1d36d]/20 blur-3xl" />
        <div className="relative mx-auto my-auto w-full max-w-[33rem] shrink-0">
          <div className="mb-7 flex items-center justify-between lg:hidden">
            <Link
              to="/"
              className="flex items-center gap-3"
              aria-label="BulldogEx Shop home"
            >
              <img
                src={logo}
                alt=""
                className="h-10 w-10 rounded-xl bg-white object-contain shadow-sm"
              />
              <span className="font-[Sora] text-lg font-bold text-primary">
                BulldogEx
              </span>
            </Link>
            <Link
              to="/"
              className="text-xs font-semibold uppercase tracking-[0.15em] text-primary"
            >
              Store ↗
            </Link>
          </div>
          <div className="rounded-[2rem] border border-white/80 bg-white/85 p-6 shadow-[0_24px_80px_-28px_rgba(20,45,114,0.35)] backdrop-blur-xl sm:p-8">
            <Outlet />
          </div>
          <p className="mt-5 text-center text-xs leading-5 text-slate-500">
            By continuing, you agree to our{" "}
            <button className="font-semibold text-primary hover:underline">
              Terms
            </button>{" "}
            and{" "}
            <button className="font-semibold text-primary hover:underline">
              Privacy Policy
            </button>
            .
          </p>
        </div>
      </main>
    </div>
  </section>
);

export default AuthLayout;
