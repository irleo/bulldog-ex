import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../../api/apiClient.js";
import { useAuth } from "../../auth/authContext.js";
import { notify } from "../../utils/toast.js";
import {
  ProductImage,
  StatusPill,
  StoreCard,
  StoreIcon,
  StorePagination,
  StorePageHeader,
} from "../../components/StoreUI.jsx";

const fieldClass =
  "rounded-lg border border-[#e3e7f0] bg-white px-3 py-2.5 text-sm outline-none transition focus:border-[#d4af37] focus:ring-2 focus:ring-[#f6ecc9]";
const pageSizes = { products: 5, orders: 7, reviews: 5, users: 7 };
const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});
const humanizeStatus = (status) =>
  String(status || "pending").replaceAll("_", " ");
const SortableHeader = ({ label, sortKey, sortConfig, onSort }) => {
  const active = sortConfig?.key === sortKey;
  const direction = active ? sortConfig.direction : null;

  return (
    <th
      className="px-4 py-3"
      aria-sort={
        direction === "asc"
          ? "ascending"
          : direction === "desc"
            ? "descending"
            : "none"
      }
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1.5 rounded text-left hover:text-[#0b1b46] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]"
      >
        {label}
        <span aria-hidden="true" className="text-xs">
          {direction === "asc" ? "↑" : direction === "desc" ? "↓" : "↕"}
        </span>
      </button>
    </th>
  );
};
const FilterBar = ({ query, onQueryChange, placeholder, children }) => (
  <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-[#e3e7f0] bg-white p-3">
    <label className="min-w-52 flex-1">
      <span className="sr-only">Search</span>
      <input
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder={placeholder}
        className={`${fieldClass} w-full`}
      />
    </label>
    {children}
  </div>
);
const ReviewStars = ({ rating }) => (
  <span className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((value) => (
      <StoreIcon
        key={value}
        name="star"
        className={`h-3.5 w-3.5 ${value <= Number(rating) ? "fill-[#d4af37] text-[#d4af37]" : "text-[#d7dce7]"}`}
      />
    ))}
  </span>
);

const getResponseRecords = (payload) => {
  if (!Array.isArray(payload?.data)) {
    throw new Error("The server returned an invalid records response.");
  }
  return payload.data;
};

const sectionDetails = {
  products: {
    eyebrow: "Catalog management",
    title: "Products",
    description:
      "Create products, update inventory, and control storefront availability.",
  },
  orders: {
    eyebrow: "Order fulfillment",
    title: "Orders",
    description:
      "Review incoming orders and move each purchase through the pickup workflow.",
  },
  reviews: {
    eyebrow: "Community moderation",
    title: "Reviews",
    description:
      "Review customer feedback, flag concerns, and control storefront visibility.",
  },
  users: {
    eyebrow: "Account management",
    title: "Users",
    description:
      "Manage customer records and account access from one workspace.",
  },
};

const AdminConsolePage = ({ section }) => {
  const { user } = useAuth();
  const [records, setRecords] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [tableSort, setTableSort] = useState(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: pageSizes[section],
    total: 0,
    pages: 0,
  });
  const [filters, setFilters] = useState({
    query: "",
    status: "all",
    category: "all",
    moderation: "all",
    role: "all",
  });
  const [error, setError] = useState("");
  const details = sectionDetails[section];

  const params = new URLSearchParams({
    page: String(page),
    limit: String(pageSizes[section]),
  });
  const query = filters.query.trim();
  if (query) params.set("q", query);
  if (section === "products") {
    if (filters.category !== "all")
      params.set("categoryId", filters.category);
    if (filters.status !== "all") params.set("isActive", filters.status);
  }
  if (section === "orders") {
    if (filters.status !== "all") params.set("status", filters.status);
    if (tableSort) {
      params.set("sort", tableSort.key);
      params.set("direction", tableSort.direction);
    }
  }
  if (section === "reviews") {
    if (filters.moderation === "visible") params.set("isHidden", "false");
    if (filters.moderation === "hidden") params.set("isHidden", "true");
    if (filters.moderation === "flagged") params.set("isFlagged", "true");
  }
  if (section === "users") {
    if (filters.role !== "all") params.set("role", filters.role);
    if (filters.status !== "all") params.set("isActive", filters.status);
    if (tableSort) {
      params.set("sort", tableSort.key);
      params.set("direction", tableSort.direction);
    }
  }
  const endpointBase = {
    products: "/products/admin",
    orders: "/orders",
    reviews: "/reviews/admin",
    users: "/users",
  }[section];
  const endpoint = `${endpointBase}?${params.toString()}`;

  const applyRecordsPayload = useCallback(
    (payload) => {
      setError("");
      setRecords(getResponseRecords(payload));
      const nextPagination = payload.pagination ?? {
        page,
        limit: pageSizes[section],
        total: payload.data.length,
        pages: payload.data.length ? 1 : 0,
      };
      setPagination(nextPagination);
      if (
        nextPagination.pages > 0 &&
        nextPagination.page > nextPagination.pages
      ) {
        setPage(nextPagination.pages);
      }
      setSelected(null);
    },
    [page, section],
  );

  const load = useCallback(async () => {
    try {
      const payload = await apiRequest(endpoint);
      applyRecordsPayload(payload);
    } catch (requestError) {
      setError(requestError.message);
    }
  }, [applyRecordsPayload, endpoint]);

  useEffect(() => {
    apiRequest(endpoint)
      .then(applyRecordsPayload)
      .catch((requestError) => setError(requestError.message));
  }, [applyRecordsPayload, endpoint]);

  useEffect(() => {
    if (section === "products") {
      apiRequest("/categories?limit=100")
        .then((payload) => setCategories(payload.data))
        .catch((requestError) => setError(requestError.message));
    }
  }, [section]);

  useEffect(() => {
    if (!productModalOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setProductModalOpen(false);
        setSelected(null);
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [productModalOpen]);

  const mutate = async (path, options, successMessage) => {
    try {
      await apiRequest(path, options);
      setSelected(null);
      notify.success(successMessage);
      await load();
      return true;
    } catch (requestError) {
      notify.error(requestError.message);
      return false;
    }
  };

  const toggleTableSort = (key) => {
    setTableSort((current) => ({
      key,
      direction:
        current?.key === key && current.direction === "asc"
          ? "desc"
          : current?.key === key
            ? "asc"
            : key === "createdAt"
              ? "desc"
              : "asc",
    }));
    setPage(1);
  };

  const updateFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  };

  const saveProduct = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (!form.get("supplier")) form.set("supplier", "Bulldogs Exchange");
    const saved = await mutate(
      selected ? `/products/${selected._id}` : "/products",
      {
        method: selected ? "PATCH" : "POST",
        body: form,
      },
      selected ? "Product updated." : "Product created.",
    );
    if (saved) setProductModalOpen(false);
  };

  const renderProducts = () => {
    return (
      <>
        {productModalOpen && (
          <div
            className="fixed inset-0 z-[70] grid place-items-center bg-[#071230]/55 p-4 backdrop-blur-sm"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                setProductModalOpen(false);
                setSelected(null);
              }
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="product-dialog-title"
              className="w-full max-w-3xl overflow-hidden rounded-2xl border border-[#e3e7f0] bg-white shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-[#e3e7f0] px-6 py-5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a9841f]">
                    Catalog management
                  </p>
                  <h2
                    id="product-dialog-title"
                    className="font-display mt-1 text-lg font-extrabold"
                  >
                    {selected ? `Edit ${selected.name}` : "Create product"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setProductModalOpen(false);
                    setSelected(null);
                  }}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-[#e3e7f0] text-[#64748b]"
                  aria-label="Close product form"
                >
                  <StoreIcon name="close" className="h-4 w-4" />
                </button>
              </div>
              <form
                key={selected?._id ?? "new"}
                onSubmit={saveProduct}
                className="grid gap-4 p-6 md:grid-cols-2"
              >
                <input
                  name="name"
                  required
                  minLength="2"
                  defaultValue={selected?.name ?? ""}
                  className={fieldClass}
                  placeholder="Product name"
                />
                <input
                  name="sku"
                  required
                  minLength="3"
                  defaultValue={selected?.sku ?? ""}
                  className={fieldClass}
                  placeholder="SKU"
                />
                <select
                  name="categoryId"
                  required
                  defaultValue={selected?.categoryId?._id ?? ""}
                  className={fieldClass}
                >
                  <option value="" disabled>
                    Category
                  </option>
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
                </select>
                <input
                  name="supplier"
                  defaultValue={selected?.supplier ?? "Bulldogs Exchange"}
                  className={fieldClass}
                  placeholder="Supplier"
                />
                <input
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  defaultValue={selected?.price ?? ""}
                  className={fieldClass}
                  placeholder="Price"
                />
                <input
                  name="stock"
                  type="number"
                  min="0"
                  step="1"
                  required
                  defaultValue={selected?.stock ?? ""}
                  className={fieldClass}
                  placeholder="Stock"
                />
                <label className="md:col-span-2">
                  <span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">
                    Product image
                  </span>
                  <input
                    name="image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className={`${fieldClass} w-full file:mr-4 file:rounded-md file:border-0 file:bg-[#0b1b46] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white`}
                  />
                  <span className="mt-1.5 block text-xs text-[#64748b]">
                    Choose a JPG, PNG, or WebP image up to 5 MB.
                    {selected?.images?.length
                      ? " Leave this empty to keep the current image."
                      : " A local product image is used as the fallback."}
                  </span>
                </label>
                <div className="flex justify-end gap-2 border-t border-[#e3e7f0] pt-4 md:col-span-2">
                  <button
                    type="button"
                    onClick={() => {
                      setProductModalOpen(false);
                      setSelected(null);
                    }}
                    className="rounded-lg border border-[#e3e7f0] px-5 py-2.5 text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button className="rounded-lg bg-[#0b1b46] px-5 py-2.5 text-sm font-semibold text-white">
                    {selected ? "Save changes" : "Create product"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        <FilterBar
          query={filters.query}
          onQueryChange={(value) => updateFilter("query", value)}
          placeholder="Search product, SKU, or supplier"
        >
          <select
            value={filters.category}
            onChange={(event) => updateFilter("category", event.target.value)}
            className={fieldClass}
            aria-label="Filter products by category"
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(event) => updateFilter("status", event.target.value)}
            className={fieldClass}
            aria-label="Filter products by status"
          >
            <option value="all">All statuses</option>
            <option value="true">Active</option>
            <option value="false">Deactivated</option>
          </select>
        </FilterBar>
        <div className="grid gap-2.5">
        {records.map((product) => (
            <StoreCard
              key={product._id}
              accent={false}
              className={`flex flex-wrap items-center gap-4 p-4 ${product.isActive ? "" : "border-slate-300 bg-slate-50"}`}
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[#eef1f8]">
                <ProductImage
                  product={product}
                  className={`h-full w-full object-contain p-1 ${product.isActive ? "" : "grayscale opacity-55"}`}
                />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-display truncate text-sm font-bold">
                  {product.name}
                </h3>
                <p className="mt-0.5 text-xs text-[#64748b]">
                  {product.sku} · {product.categoryId?.name} ·{" "}
                  {peso.format(product.price)} · {product.stock} in stock
                </p>
              </div>
              <StatusPill status={product.isActive ? "active" : "inactive"} />
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelected(product);
                    setProductModalOpen(true);
                  }}
                  className="rounded-lg border border-[#e3e7f0] px-3 py-1.5 text-xs font-semibold text-[#0b1b46]"
                >
                  Edit
                </button>
                <button
                  onClick={() =>
                    mutate(
                      `/products/${product._id}/status`,
                      {
                        method: "PATCH",
                        body: JSON.stringify({ isActive: !product.isActive }),
                      },
                      `Product ${product.isActive ? "deactivated" : "activated"}.`,
                    )
                  }
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${product.isActive ? "border-red-100 bg-red-50 text-red-700 hover:bg-red-100" : "border-green-200 bg-green-100 text-green-800 hover:bg-green-200"}`}
                >
                  {product.isActive ? "Deactivate" : "Reactivate"}
                </button>
              </div>
            </StoreCard>
          ))}
        {records.length === 0 && (
            <StoreCard
              accent={false}
              className="p-10 text-center text-sm text-[#64748b]"
            >
              No products match the selected filters.
            </StoreCard>
          )}
        </div>
      <StorePagination
        page={pagination.page}
        pageSize={pageSizes.products}
        total={pagination.total}
          onPageChange={setPage}
        />
      </>
    );
  };

  const renderOrders = () => {
    const nextStatus = {
      pending: "confirmed",
      confirmed: "ready_for_claiming",
    };
    return (
      <>
        <FilterBar
          query={filters.query}
          onQueryChange={(value) => updateFilter("query", value)}
          placeholder="Search order number"
        >
          <select
            value={filters.status}
            onChange={(event) => updateFilter("status", event.target.value)}
            className={fieldClass}
            aria-label="Filter orders by status"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="ready_for_claiming">Ready for claiming</option>
            <option value="claimed">Claimed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </FilterBar>
        {records.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
            <h2 className="text-lg font-bold text-slate-700">
              No orders found
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              No orders match the selected filters.
            </p>
          </div>
        ) : (
          <StoreCard accent={false} className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead className="bg-[#eef1f8] text-left text-[10px] uppercase tracking-wide text-[#64748b]">
                <tr>
                  <th className="px-4 py-3">Order</th>
                  <SortableHeader
                    label="Date"
                    sortKey="createdAt"
                    sortConfig={tableSort}
                    onSort={toggleTableSort}
                  />
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Items</th>
                  <th className="px-4 py-3">Total</th>
                  <SortableHeader
                    label="Status"
                    sortKey="status"
                    sortConfig={tableSort}
                    onSort={toggleTableSort}
                  />
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e3e7f0]">
            {records.map((order, index) => {
                  const status =
                    typeof order?.status === "string" && order.status
                      ? order.status
                      : "pending";
                  const followingStatus = nextStatus[status];
                  const customerName =
                    [order?.userId?.firstName, order?.userId?.lastName]
                      .filter(Boolean)
                      .join(" ") || "Unknown customer";
                  const total = Number.isFinite(Number(order?.totalAmount))
                    ? Number(order.totalAmount)
                    : 0;
                  const itemCount = Array.isArray(order?.items)
                    ? order.items.reduce(
                        (sum, item) => sum + Number(item.quantity || 0),
                        0,
                      )
                    : 0;

                  return (
                    <tr key={order?._id ?? `order-${index}`}>
                      <td className="px-4 py-3 font-semibold">
                        {order?.orderNumber || "Unavailable"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-[#64748b]">
                        {order?.createdAt
                          ? new Date(order.createdAt).toLocaleDateString(
                              "en-PH",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )
                          : "Unavailable"}
                      </td>
                      <td className="px-4 py-3">{customerName}</td>
                      <td className="px-4 py-3 text-[#64748b]">{itemCount}</td>
                      <td className="px-4 py-3 font-semibold">
                        {peso.format(total)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill status={status} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {followingStatus && order?._id && (
                            <button
                              onClick={() =>
                                mutate(
                                  `/orders/${order._id}/status`,
                                  {
                                    method: "PATCH",
                                    body: JSON.stringify({
                                      status: followingStatus,
                                    }),
                                  },
                                  "Order status updated.",
                                )
                              }
                              className="rounded-lg bg-[#0b1b46] px-3 py-1.5 text-xs font-semibold text-white"
                            >
                              Mark {humanizeStatus(followingStatus)}
                            </button>
                          )}
                          {["pending", "confirmed"].includes(status) &&
                            order?._id && (
                              <button
                                onClick={() =>
                                  mutate(
                                    `/orders/${order._id}/status`,
                                    {
                                      method: "PATCH",
                                      body: JSON.stringify({
                                        status: "cancelled",
                                      }),
                                    },
                                    "Order cancelled.",
                                  )
                                }
                                className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"
                              >
                                Cancel
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </StoreCard>
        )}
        <StorePagination
          page={pagination.page}
          pageSize={pageSizes.orders}
          total={pagination.total}
          onPageChange={setPage}
        />
      </>
    );
  };

  const renderReviews = () => {
    return (
      <>
        <FilterBar
          query={filters.query}
          onQueryChange={(value) => updateFilter("query", value)}
          placeholder="Search review text"
        >
          <select
            value={filters.moderation}
            onChange={(event) => updateFilter("moderation", event.target.value)}
            className={fieldClass}
            aria-label="Filter reviews by moderation status"
          >
            <option value="all">All reviews</option>
            <option value="visible">Visible</option>
            <option value="flagged">Flagged</option>
            <option value="hidden">Hidden</option>
          </select>
        </FilterBar>
        <div className="grid gap-3">
          {records.map((review) => (
            <StoreCard
              key={review._id}
              accent={review.isFlagged}
              className="p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-sm font-bold">
                      {review.productId?.name ?? "Unknown product"}
                    </h2>
                    {review.isFlagged && (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                        FLAGGED
                      </span>
                    )}
                    {review.isHidden && (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        HIDDEN
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <ReviewStars rating={review.rating} />
                    <span className="text-xs text-[#64748b]">
                      by {review.userId?.firstName} {review.userId?.lastName}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#101828]">
                    {review.content}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      mutate(
                        `/reviews/${review._id}`,
                        {
                          method: "PATCH",
                          body: JSON.stringify({
                            isFlagged: !review.isFlagged,
                          }),
                        },
                        `Review ${review.isFlagged ? "unflagged" : "flagged"}.`,
                      )
                    }
                    className={`rounded-lg px-3 py-2 text-xs font-semibold ${review.isFlagged ? "border border-[#e3e7f0] text-[#0b1b46]" : "bg-amber-50 text-amber-800"}`}
                  >
                    {review.isFlagged ? "Unflag" : "Flag"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      mutate(
                        `/reviews/${review._id}`,
                        {
                          method: "PATCH",
                          body: JSON.stringify({ isHidden: !review.isHidden }),
                        },
                        `Review ${review.isHidden ? "shown" : "hidden"}.`,
                      )
                    }
                    className={`rounded-lg px-3 py-2 text-xs font-semibold ${review.isHidden ? "bg-[#0b1b46] text-white" : "bg-red-50 text-red-700"}`}
                  >
                    {review.isHidden ? "Show review" : "Hide review"}
                  </button>
                </div>
              </div>
            </StoreCard>
          ))}
          {records.length === 0 && (
            <StoreCard
              accent={false}
              className="p-10 text-center text-sm text-[#64748b]"
            >
              No reviews match the selected filters.
            </StoreCard>
          )}
        </div>
        <StorePagination
          page={pagination.page}
          pageSize={pageSizes.reviews}
          total={pagination.total}
          onPageChange={setPage}
        />
      </>
    );
  };

  const renderUsers = () => {
    return (
      <>
        <FilterBar
          query={filters.query}
          onQueryChange={(value) => updateFilter("query", value)}
          placeholder="Search name or email"
        >
          <select
            value={filters.role}
            onChange={(event) => updateFilter("role", event.target.value)}
            className={fieldClass}
            aria-label="Filter users by role"
          >
            <option value="all">All roles</option>
            <option value="customer">Customers</option>
            <option value="admin">Administrators</option>
          </select>
          <select
            value={filters.status}
            onChange={(event) => updateFilter("status", event.target.value)}
            className={fieldClass}
            aria-label="Filter users by status"
          >
            <option value="all">All statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </FilterBar>
        {records.length === 0 ? (
          <StoreCard
            accent={false}
            className="p-10 text-center text-sm text-[#64748b]"
          >
            No users match the selected filters.
          </StoreCard>
        ) : (
          <StoreCard accent={false} className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead className="bg-[#eef1f8] text-left text-[10px] uppercase tracking-wide text-[#64748b]">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <SortableHeader
                    label="Status"
                    sortKey="status"
                    sortConfig={tableSort}
                    onSort={toggleTableSort}
                  />
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e3e7f0]">
                {records.map((account) => (
                  <tr key={account._id}>
                    <td className="px-4 py-3 font-semibold">
                      {account.firstName} {account.lastName}
                    </td>
                    <td className="px-4 py-3 text-[#64748b]">
                      {account.email}
                    </td>
                    <td className="px-4 py-3 capitalize">{account.role}</td>
                    <td className="px-4 py-3">
                      <StatusPill
                        status={account.isActive ? "active" : "inactive"}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {account.role === "admin" ? (
                        <span className="text-xs font-semibold text-[#64748b]">
                          {String(account._id) === String(user?._id)
                            ? "Current account"
                            : "Protected"}
                        </span>
                      ) : (
                        <button
                          onClick={() =>
                            mutate(
                              `/users/${account._id}/status`,
                              {
                                method: "PATCH",
                                body: JSON.stringify({
                                  isActive: !account.isActive,
                                }),
                              },
                              `User ${account.isActive ? "deactivated" : "activated"}.`,
                            )
                          }
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${account.isActive ? "bg-red-50 text-red-700" : "border border-[#e3e7f0] text-[#0b1b46]"}`}
                        >
                          {account.isActive ? "Suspend" : "Reactivate"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </StoreCard>
        )}
        <StorePagination
          page={pagination.page}
          pageSize={pageSizes.users}
          total={pagination.total}
          onPageChange={setPage}
        />
      </>
    );
  };

  return (
    <div className="w-full">
      <StorePageHeader
        eyebrow={details.eyebrow}
        title={details.title}
        description={details.description}
        action={
          <div className="flex items-center gap-5">
            {section === "products" && (
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setProductModalOpen(true);
                }}
                className="flex items-center gap-2 rounded-lg bg-[#0b1b46] px-4 py-2.5 text-sm font-semibold text-white ms-auto mb-3"
              >
                <StoreIcon name="plus" className="h-4 w-4" />
                Create product
              </button>
            )}
            <StoreCard className="px-5 py-3">
              <span className="font-display block text-2xl font-extrabold text-[#0b1b46]">
                {pagination.total}
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#64748b]">
                Total records
              </span>
            </StoreCard>
          </div>
        }
      />
      {error && (
        <p className="mb-5 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>
      )}

      {section === "products" && renderProducts()}
      {section === "orders" && renderOrders()}
      {section === "reviews" && renderReviews()}
      {section === "users" && renderUsers()}
    </div>
  );
};

export default AdminConsolePage;
