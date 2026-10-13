import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "../../api/apiClient.js";
import { useAuth } from "../../auth/authContext.js";
import { notify } from "../../utils/toast.js";
import ProductImageInput from '../../components/ProductImageInput.jsx';
import {
  useConfirmation,
  LoadingState,
  useUnsavedForm,
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
  const { confirm, confirmation } = useConfirmation();
  const { formRef, onFormChange, markSaved, guardDiscard } = useUnsavedForm(confirm);
  const inFlight = useRef(false);
  const [saving, setSaving] = useState(false);
  const [records, setRecords] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoriesError, setCategoriesError] = useState("");
  const [selected, setSelected] = useState(null);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
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
  const [loading, setLoading] = useState(true);
  const [loadedEndpoint, setLoadedEndpoint] = useState("");
  const requestVersion = useRef(0);
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
  const pending = loading || loadedEndpoint !== endpoint;
  const visibleRecords = pending || error ? [] : records;

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
    const version = ++requestVersion.current;
    setLoading(true);
    setError("");
    try {
      const payload = await apiRequest(endpoint);
      if (version === requestVersion.current) applyRecordsPayload(payload);
    } catch (requestError) {
      if (version === requestVersion.current) setError(requestError.message);
    } finally {
      if (version === requestVersion.current) {
        setLoadedEndpoint(endpoint);
        setLoading(false);
      }
    }
  }, [applyRecordsPayload, endpoint]);

  useEffect(() => {
    void load();
    return () => { requestVersion.current += 1; };
  }, [load]);

  useEffect(() => {
    let active = true;
    if (section === "products") {
      apiRequest("/categories?limit=100")
        .then((payload) => { if (active) { setCategories(payload.data); setCategoriesError(""); } })
        .catch((requestError) => { if (active) setCategoriesError(requestError.message); });
    }
    return () => { active = false; };
  }, [section]);

  const closeEditor = useCallback(() => {
    if (inFlight.current) return;
    guardDiscard(() => {
      setProductModalOpen(false);
      setUserModalOpen(false);
      setReviewModalOpen(false);
      setSelected(null);
    });
  }, [guardDiscard]);

  useEffect(() => {
    if (!productModalOpen && !userModalOpen && !reviewModalOpen) return;
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !document.querySelector("dialog[open]")) closeEditor();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [productModalOpen, userModalOpen, reviewModalOpen, closeEditor]);

  const mutate = async (path, options, successMessage) => {
    if (inFlight.current) return false;
    const [, resource, id, action] = path.split("/");
    const record = records.find((entry) => entry._id === id);
    const body = typeof options.body === "string" ? JSON.parse(options.body) : {};
    let question;
    if (resource === "products" && action === "status") {
      question = {
        title: body.isActive ? "Reactivate product?" : "Deactivate product?",
        message: `${body.isActive ? "Make" : "Remove"} "${record?.name ?? id}" (${record?.sku ?? "product"}) ${body.isActive ? "available to customers again" : "from the customer catalog"}? You can reverse this by changing its status again.`,
        confirmLabel: body.isActive ? "Reactivate product" : "Deactivate product", destructive: !body.isActive,
      };
    } else if (resource === "orders" && action === "status") {
      const label = record?.orderNumber ?? id;
      const next = body.status;
      question = {
        title: next === "cancelled" ? `Cancel order ${label}?` : next === "confirmed" ? `Confirm order ${label}?` : `Mark order ${label} as ready?`,
        message: next === "cancelled" ? "This permanently cancels the order and restores reserved inventory when applicable. The cancellation cannot be undone."
          : next === "confirmed" ? "Confirm this order and reserve its inventory? It cannot return to pending; it may still be cancelled before it is ready for pickup."
          : "Confirm that this order is prepared for customer pickup. The customer will see it as ready, and it can no longer be cancelled or returned to preparing.",
        cancelLabel: next === "cancelled" ? "Keep order" : "Cancel",
        confirmLabel: next === "cancelled" ? "Cancel order" : next === "confirmed" ? "Confirm order" : "Mark as ready", destructive: next === "cancelled",
      };
    } else if (resource === "users" && (options.method === "DELETE" || (action === "status" && !body.isActive))) {
      const deleting = options.method === "DELETE";
      question = { title: deleting ? "Archive user?" : "Suspend user?",
        message: `${deleting ? "Archive" : "Suspend"} ${record?.firstName ?? "this"} ${record?.lastName ?? "user"} (${record?.email ?? id})? ${deleting ? "Access will be revoked. Order history, reviews, profile details, and the cart are retained for recordkeeping." : "They will lose access to their account. An administrator can reactivate it later."}`,
        confirmLabel: deleting ? "Archive user" : "Suspend user", destructive: true };
    } else if (resource === "users" && body.email && body.email !== record?.email) {
      question = { title: "Change sign-in email?", message: `Change ${record?.firstName ?? "this user"}'s sign-in email from ${record?.email} to ${body.email}? They must use the new address to sign in. An administrator can change it back.`, confirmLabel: "Change email" };
    }
    const execute = async () => {
      if (inFlight.current) return false;
      inFlight.current = true;
      setSaving(true);
      try {
        const result = await apiRequest(path, options);
        markSaved();
        setSelected(null);
        notify.success(successMessage);
        if (result.warning) notify.info(result.warning);
        await load();
        return true;
      } finally { inFlight.current = false; setSaving(false); }
    };
    if (question) return confirm({ ...question, onConfirm: execute });
    try { return await execute(); }
    catch (requestError) { notify.error(requestError.message); return false; }
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
    const image = form.get('image');
    if (image instanceof File && !image.name) form.delete('image');
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

  const saveUser = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const saved = await mutate(
      `/users/${selected._id}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          firstName: form.get("firstName"),
          lastName: form.get("lastName"),
          email: form.get("email"),
          studentNumber: form.get("studentNumber") || undefined,
          course: form.get("course") || undefined,
          yearLevel: form.get("yearLevel") || undefined,
          phone: form.get("phone") || undefined,
        }),
      },
      "User updated.",
    );
    if (saved) setUserModalOpen(false);
  };

  const deleteUser = async (account) => {
    if (String(account._id) === String(user?._id)) return;
    await mutate(
      `/users/${account._id}`,
      { method: "DELETE" },
      "User deleted.",
    );
  };

  const saveReview = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const saved = await mutate(
      `/reviews/${selected._id}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          rating: Number(form.get("rating")),
          content: form.get("content"),
        }),
      },
      "Review updated.",
    );
    if (saved) setReviewModalOpen(false);
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
                closeEditor();
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
                    closeEditor();
                  }}
                  className="grid h-9 w-9 place-items-center rounded-lg border border-[#e3e7f0] text-[#64748b]"
                  aria-label="Close product form"
                >
                  <StoreIcon name="close" className="h-4 w-4" />
                </button>
              </div>
              <form
                key={selected?._id ?? "new"}
                ref={formRef} onChange={onFormChange} onSubmit={saveProduct}
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
                  min="0.01"
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
                <ProductImageInput key={selected?._id ?? "new"} product={selected} className={fieldClass} />
                <div className="flex justify-end gap-2 border-t border-[#e3e7f0] pt-4 md:col-span-2">
                  <button
                    type="button"
                    onClick={() => {
                      closeEditor();
                    }}
                    className="rounded-lg border border-[#e3e7f0] px-5 py-2.5 text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button disabled={saving} className="rounded-lg bg-[#0b1b46] px-5 py-2.5 text-sm font-semibold text-white">
                    {saving ? "Saving…" : selected ? "Save changes" : "Create product"}
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
        {visibleRecords.map((product) => (
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
                  {peso.format(product.price)} ·{" "}
                  <span className={product.stock === 0 ? "font-semibold text-red-700" : undefined}>
                    {product.stock === 0 ? "Out of Stock" : `${product.stock} in stock`}
                  </span>
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
        {!pending && !error && records.length === 0 && (
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
        total={pending || error ? 0 : pagination.total}
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
        {pending || error ? null : records.length === 0 ? (
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
            {visibleRecords.map((order, index) => {
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
          total={pending || error ? 0 : pagination.total}
          onPageChange={setPage}
        />
      </>
    );
  };

  const renderReviews = () => {
    return (
      <>
        {reviewModalOpen && selected && (
          <div className="fixed inset-0 z-[70] grid place-items-center bg-[#071230]/55 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#e3e7f0] bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#e3e7f0] px-6 py-5">
                <h2 className="font-display text-lg font-extrabold">Edit review</h2>
                <button type="button" onClick={closeEditor} className="rounded-lg border border-[#e3e7f0] px-3 py-1.5 text-sm">Close</button>
              </div>
              <form ref={formRef} onChange={onFormChange} onSubmit={saveReview} className="grid gap-4 p-6">
                <label className="grid gap-1.5 text-sm font-semibold">
                  Rating
                  <input name="rating" type="number" min="1" max="5" required defaultValue={selected.rating} className={fieldClass} />
                </label>
                <label className="grid gap-1.5 text-sm font-semibold">
                  Review
                  <textarea name="content" minLength="10" maxLength="1000" required defaultValue={selected.content} className={`${fieldClass} min-h-32`} />
                </label>
                <div className="flex justify-end gap-2 border-t border-[#e3e7f0] pt-4">
                  <button type="button" onClick={closeEditor} className="rounded-lg border border-[#e3e7f0] px-5 py-2.5 text-sm font-semibold">Cancel</button>
                  <button disabled={saving} className="rounded-lg bg-[#0b1b46] px-5 py-2.5 text-sm font-semibold text-white">{saving ? "Saving…" : "Save changes"}</button>
                </div>
              </form>
            </div>
          </div>
        )}
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
          {visibleRecords.map((review) => (
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
                    onClick={() => {
                      setSelected(review);
                      setReviewModalOpen(true);
                    }}
                    className="rounded-lg border border-[#e3e7f0] px-3 py-2 text-xs font-semibold text-[#0b1b46]"
                  >
                    Edit
                  </button>
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
          {!pending && !error && records.length === 0 && (
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
          total={pending || error ? 0 : pagination.total}
          onPageChange={setPage}
        />
      </>
    );
  };

  const renderUsers = () => {
    return (
      <>
        {userModalOpen && selected && (
          <div className="fixed inset-0 z-[70] grid place-items-center bg-[#071230]/55 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#e3e7f0] bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-[#e3e7f0] px-6 py-5">
                <h2 className="font-display text-lg font-extrabold">Edit user</h2>
                <button
                  type="button"
                  onClick={() => {
                    closeEditor();
                  }}
                  className="rounded-lg border border-[#e3e7f0] px-3 py-1.5 text-sm"
                >
                  Close
                </button>
              </div>
              <form ref={formRef} onChange={onFormChange} onSubmit={saveUser} className="grid gap-4 p-6">
                <input name="firstName" required defaultValue={selected.firstName} className={fieldClass} placeholder="First name" />
                <input name="lastName" required defaultValue={selected.lastName} className={fieldClass} placeholder="Last name" />
                <input name="email" type="email" required defaultValue={selected.email} className={fieldClass} placeholder="Email address" />
                <label className="grid gap-1.5 text-xs font-semibold">
                  Student number
                  <input name="studentNumber" type="text" required={Boolean(selected.studentNumber)} pattern="[0-9]{4}[-][0-9]{6}" minLength="11" maxLength="11" defaultValue={selected.studentNumber ?? ""} className={fieldClass} placeholder="2023-123456" title="Use the format ####-######" />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold">
                  Course
                  <input name="course" required={Boolean(selected.course)} minLength="2" maxLength="120" defaultValue={selected.course ?? ""} className={fieldClass} placeholder="BSIT" />
                </label>
                <label className="grid gap-1.5 text-xs font-semibold">
                  Year level
                  <input name="yearLevel" required={Boolean(selected.yearLevel)} minLength="1" maxLength="30" defaultValue={selected.yearLevel ?? ""} className={fieldClass} placeholder="4th Year" />
                </label>
                <input name="phone" defaultValue={selected.phone ?? ""} className={fieldClass} placeholder="Phone number" />
                <div className="flex justify-end gap-2 border-t border-[#e3e7f0] pt-4">
                  <button type="button" onClick={closeEditor} className="rounded-lg border border-[#e3e7f0] px-5 py-2.5 text-sm font-semibold">Cancel</button>
                  <button disabled={saving} className="rounded-lg bg-[#0b1b46] px-5 py-2.5 text-sm font-semibold text-white">{saving ? "Saving…" : "Save changes"}</button>
                </div>
              </form>
            </div>
          </div>
        )}
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
        {pending || error ? null : records.length === 0 ? (
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
                      <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e3e7f0]">
                {visibleRecords.map((account) => (
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
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            setSelected(account);
                            setUserModalOpen(true);
                          }}
                          className="rounded-lg border border-[#e3e7f0] px-3 py-1.5 text-xs font-semibold text-[#0b1b46]"
                        >
                          Edit
                        </button>
                        {account.role !== "admin" && (
                          <button
                            onClick={() =>
                              mutate(
                                `/users/${account._id}/status`,
                                {
                                  method: "PATCH",
                                  body: JSON.stringify({ isActive: !account.isActive }),
                                },
                                `User ${account.isActive ? "deactivated" : "activated"}.`,
                              )
                            }
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${account.isActive ? "bg-red-50 text-red-700" : "border border-[#e3e7f0] text-[#0b1b46]"}`}
                          >
                            {account.isActive ? "Suspend" : "Reactivate"}
                          </button>
                        )}
                        {String(account._id) !== String(user?._id) && (
                          <button
                            onClick={() => deleteUser(account)}
                            className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"
                          >
                            Delete
                          </button>
                        )}
                      </div>
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
          total={pending || error ? 0 : pagination.total}
          onPageChange={setPage}
        />
      </>
    );
  };

  return (
    <div className="w-full">
      {confirmation}
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
                {pending || error ? "—" : pagination.total}
              </span>
              <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-[#64748b]">
                Total records
              </span>
            </StoreCard>
          </div>
        }
      />
      {error && (
        <div role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-red-700">
          {error} <button type="button" onClick={() => void load()} className="ml-3 font-semibold underline">Retry</button>
        </div>
      )}
      {section === "products" && categoriesError && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-red-700">Categories could not be loaded: {categoriesError}</p>}

      {pending && <LoadingState label={`Loading ${section}…`} />}
      {saving && <p role="status" className="my-3 text-sm text-[#64748b]">Saving changes…</p>}
      <fieldset disabled={saving} className="min-w-0" aria-busy={pending || saving}>
      {section === "products" && renderProducts()}
      {section === "orders" && renderOrders()}
      {section === "reviews" && renderReviews()}
      {section === "users" && renderUsers()}
      </fieldset>
    </div>
  );
};

export default AdminConsolePage;
