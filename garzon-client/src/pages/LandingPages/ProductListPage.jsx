import { isPrice, isStock } from "../../utils/numbers.js";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../api/apiClient.js";
import {
  ProductImage,
  StoreCard,
  StoreIcon,
  StorePage,
  StorePageHeader,
  StorePagination,
} from "../../components/StoreUI.jsx";

const peso = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

const ProductCard = ({ product }) => (
  <StoreCard className="group flex flex-col p-3 transition hover:-translate-y-0.5 hover:shadow-md">
    <Link to={`/products/${product._id}`} className="flex flex-1 flex-col">
      <div className="flex h-36 items-center justify-center overflow-hidden rounded-xl bg-[linear-gradient(135deg,#eef1f8,#f8fafc)]">
        <ProductImage product={product} className="h-full w-full object-contain p-2 transition duration-300 group-hover:scale-105" />
      </div>
      <p className="mt-3 text-[10px] font-semibold uppercase tracking-wide text-[#64748b]">{product.categoryId?.name ?? "Campus merchandise"}</p>
      <h2 className="font-display mt-0.5 text-sm font-bold leading-snug text-[#101828]">{product.name}</h2>
      <p className={`mt-1 text-[11px] ${product.stock === 0 ? "font-semibold text-red-700" : "text-[#64748b]"}`}>{!isStock(product.stock) ? "Stock unavailable" : product.stock === 0 ? "Out of Stock" : `${product.stock} in stock`}</p>
      <div className="mt-auto flex items-center justify-between pt-3"><strong className="font-display text-sm font-extrabold text-[#0b1b46]">{isPrice(product.price) ? peso.format(product.price) : "Price unavailable"}</strong><span className="grid h-8 w-8 place-items-center rounded-lg bg-[#f6ecc9] text-[#a9841f]"><StoreIcon name={product.stock === 0 ? "arrow-right" : "plus"} className="h-4 w-4" /></span></div>
    </Link>
  </StoreCard>
);

const ProductListPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    apiRequest("/categories?limit=100")
      .then((payload) =>
        setCategories(Array.isArray(payload.data) ? payload.data : []),
      )
      .catch((requestError) => setError(requestError.message));
  }, []);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const query = new URLSearchParams({
        page: String(page),
        limit: "12",
      });
      if (search.trim()) query.set("search", search.trim());
      if (category) query.set("category", category);
      setLoading(true);
      setError("");
      try {
        const payload = await apiRequest(`/products?${query}`);
        setProducts(Array.isArray(payload.data) ? payload.data : []);
        setPagination(payload.pagination ?? { total: 0, pages: 0 });
      } catch (requestError) {
        setError(requestError.message);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [category, page, search]);

  return (
    <StorePage>
      <StorePageHeader
        eyebrow="Campus marketplace"
        title="Browse products"
        description="Search the full BulldogEx catalog by name or category."
      />
      <div className="relative mb-5">
        <StoreIcon
          name="search"
          className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748b]"
        />
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search products, SKU, or supplier"
          className="w-full rounded-xl border border-[#e3e7f0] bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[#d4af37] focus:ring-2 focus:ring-[#f6ecc9]"
        />
      </div>
      <div className="mb-7 flex flex-wrap gap-2">
        <button
          onClick={() => {
            setCategory("");
            setPage(1);
          }}
          className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition ${category === "" ? "border-[#0b1b46] bg-[#0b1b46] text-white" : "border-[#e3e7f0] bg-white text-[#101828]"}`}
        >
          All
        </button>
        {categories.map((item) => (
          <button
            key={item._id}
            onClick={() => {
              setCategory(item._id);
              setPage(1);
            }}
            className={`rounded-full border px-3.5 py-2 text-xs font-semibold transition ${category === item._id ? "border-[#0b1b46] bg-[#0b1b46] text-white" : "border-[#e3e7f0] bg-white text-[#101828]"}`}
          >
            {item.name}
          </button>
        ))}
      </div>
      {error && (
        <p
          role="alert"
          className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700"
        >
          {error}
        </p>
      )}
      <p className="mb-3 text-xs text-[#64748b]">
        {loading
          ? "Loading catalog…"
          : `${pagination.total} item${pagination.total === 1 ? "" : "s"} found`}
      </p>
      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-64 animate-pulse rounded-2xl bg-slate-200"
            />
          ))}
        </div>
      ) : products.length ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product) => <ProductCard key={product._id} product={product} />)}
        </div>
      ) : (
        <div className="py-16 text-center text-sm text-[#64748b]">
          No products match your search or category.
        </div>
      )}
      {!loading && (
        <StorePagination
          page={page}
          pageSize={12}
          total={pagination.total}
          onPageChange={setPage}
        />
      )}
    </StorePage>
  );
};

export default ProductListPage;
