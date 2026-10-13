import { Link } from "react-router-dom";
import background from "../assets/img/notfound-bg.webp";

const NotFoundPage = () => {
  return (
    <main
      className="relative flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-cover bg-center"
      style={{ backgroundImage: `url(${background})` }}
    >
      <section className="w-full max-w-2xl rounded-3xl border-2 border-primary bg-surface px-6 py-10 text-center shadow-sm sm:px-10">
        <p className="text-[20px] font-semibold uppercase tracking-[0.28em] text-accent">
          Error 404
        </p>

        <h1 className="mt-3 text-3xl font-bold text-default sm:text-4xl">
          Page not found
        </h1>

        <p className="mt-4 text-sm leading-7 text-muted sm:text-base">
          The page you are looking for does not exist or may have been moved.
          You can go back to the homepage or continue browsing the shop.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full border-2 border-primary bg-primary px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-white transition hover:bg-[var(--color-primary-hover)] focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Go Home
          </Link>

          <Link
            to="/products"
            className="inline-flex items-center justify-center rounded-full border-2 border-accent bg-accent px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-default transition hover:bg-[var(--color-accent-hover)] focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
          >
            Browse Products
          </Link>
        </div>
      </section>
    </main>
  );
};

export default NotFoundPage;
