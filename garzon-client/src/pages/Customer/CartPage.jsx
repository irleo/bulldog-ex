import { isPrice } from "../../utils/numbers.js";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../api/apiClient.js";
import { useAuth } from "../../auth/authContext.js";
import { notify } from "../../utils/toast.js";
import { cartItemId, canCheckoutItem, selectedCartItems, selectedCartTotal } from "../../utils/cartSelection.js";
import {
  useConfirmation,
  LoadingState,
  ProductImage,
  StoreCard,
  StoreIcon,
  StorePage,
  StorePageHeader,
} from "../../components/StoreUI.jsx";

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

const CartPage = () => {
  const [cart, setCart] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [operation, setOperation] = useState("");
  const [selectedIds, setSelectedIds] = useState(/** @type {string[]} */ ([]));
  const [lastOrder, setLastOrder] = useState(null);
  const selectableItems = (cart?.items ?? []).filter(canCheckoutItem);
  const selectedItems = selectedCartItems(cart?.items ?? [], selectedIds);
  const selectedProductIds = selectedItems.map(cartItemId).sort();
  const total = selectedCartTotal(selectedItems);
  const { user } = useAuth();
  const { confirm, confirmation } = useConfirmation();
  const inFlight = useRef(false);
  // Keep the key across reloads and ambiguous network responses for this cart revision.
  const checkoutKey = () => {
    const key = `checkout:${user._id}:${cart._id}:${cart.revision ?? 0}:${selectedProductIds.join(',')}`;
    const saved = sessionStorage.getItem(key) ?? crypto.randomUUID();
    sessionStorage.setItem(key, saved);
    return saved;
  };
  useEffect(() => {
    let active = true;
    apiRequest("/carts")
      .then((payload) => { if (active) { setCart(payload.data); setSelectedIds(payload.data.items.filter(canCheckoutItem).map(cartItemId)); } })
      .catch((requestError) => { if (active) setLoadError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const refreshCart = async () => {
    if (inFlight.current || loading) return;
    setLoading(true);
    try {
      const payload = await apiRequest("/carts");
      setCart(payload.data);
      setSelectedIds(current => current.filter(id => payload.data.items.some(item => cartItemId(item) === id && canCheckoutItem(item))));
      setLoadError("");
      setError("");
    } catch (requestError) {
      setLoadError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const mutate = async (path, options, reportError = true) => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setSubmitting(true);
    setOperation("Updating cart…");
    try {
      const payload = await apiRequest(path, options);
      setCart(payload.data);
      setSelectedIds(current => current.filter(id => payload.data.items.some(item => cartItemId(item) === id && canCheckoutItem(item))));
      setError("");
      return true;
    } catch (requestError) {
      if (!reportError) throw requestError;
      notify.error(requestError.message);
      return false;
    } finally {
      inFlight.current = false;
      setSubmitting(false);
      setOperation("");
    }
  };

  const removeItem = (item) => confirm({
    title: "Remove item?", message: `Remove "${(item.productId?.name ?? "Unavailable product")}" from your cart? You can add it again while it remains available.`,
    cancelLabel: "Keep item", confirmLabel: "Remove item", destructive: true,
    onConfirm: async () => {
      const removed = await mutate(`/carts/items/${item.productRef ?? item.productId?._id}`, { method: "DELETE" }, false);
      if (removed) notify.success(`${(item.productId?.name ?? "Unavailable product")} was removed from your cart.`);
      return removed;
    },
  });

  const checkout = () => {
    if (inFlight.current) return;
    if (!cart?.items.length) { setError("Your cart is empty."); return; }
    if (!selectedItems.length) {
      setError("Select at least one available product to check out.");
      return;
    }
    if (!user.phone || !user.address?.street || !user.address.city || !user.address.province || !user.address.postalCode) {
      setError("Complete your phone number and address in your profile before placing an order.");
      return;
    }
    setError("");
    confirm({ title: "Place order?", confirmLabel: "Place order", cancelLabel: "Review order",
      message: "Review your selected products and pickup details before confirming.",
      content: (
        <div className="space-y-5">
          <section aria-label="Selected products">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-[#64748b]">Selected products ({selectedItems.length})</h3>
            <ul className="mt-2 max-h-56 divide-y divide-[#e3e7f0] overflow-y-auto overscroll-contain">
              {selectedItems.map(item => (
                <li key={cartItemId(item)} className="flex items-start justify-between gap-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="break-words font-semibold">{item.productId.name}</p>
                    <p className="mt-1 text-xs text-[#64748b]">{item.quantity} × {peso.format(item.productId.price)}</p>
                  </div>
                  <span className="shrink-0 font-semibold">{peso.format(selectedCartTotal([item]))}</span>
                </li>
              ))}
            </ul>
            <div className="mt-2 flex items-center justify-between gap-4 rounded-lg bg-[#eef1f8] px-4 py-3 font-bold text-[#0b1b46]">
              <span>Total</span><span className="text-lg">{peso.format(total)}</span>
            </div>
          </section>
          <section aria-label="Pickup details">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#64748b]">Pickup details</h3>
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
              <dt className="text-[#64748b]">Customer</dt><dd className="min-w-0 break-words font-medium">{user.firstName} {user.lastName}</dd>
              <dt className="text-[#64748b]">Phone</dt><dd className="font-medium">{user.phone}</dd>
              <dt className="text-[#64748b]">Location</dt><dd className="font-medium">Main campus booth</dd>
            </dl>
          </section>
          <ul className="list-disc space-y-2 rounded-lg bg-amber-50 py-3 pl-7 pr-3 text-xs leading-5 text-amber-900">
            <li>Unselected products stay in your cart.</li>
            <li>Stock is reserved when the store confirms your order. You can cancel while the order is pending.</li>
          </ul>
        </div>
      ),
      onConfirm: async () => {
        if (inFlight.current) return false;
        inFlight.current = true;
        setSubmitting(true);
        setOperation("Placing order…");
        try {
          const payload = await apiRequest("/orders", { method: "POST", headers: { "Idempotency-Key": checkoutKey() }, body: JSON.stringify({ cartId: cart._id, revision: cart.revision ?? 0, productIds: selectedProductIds }) });
          setCart(current => ({ ...current, revision: (current.revision ?? 0) + 1, items: current.items.filter(item => !selectedProductIds.includes(cartItemId(item))) }));
          setSelectedIds([]);
          setLastOrder(payload.data);
          notify.success(`Order ${payload.data.orderNumber} was placed successfully.`);
          try {
            const refreshed = await apiRequest("/carts");
            setCart(refreshed.data);
          } catch (requestError) {
            notify.info(`Your order was placed, but the cart could not be refreshed. ${requestError.message}`);
          }
        } finally { inFlight.current = false; setSubmitting(false); setOperation(""); }
      },
    });
  };

  return (
    <StorePage>
      {confirmation}
      <StorePageHeader
        eyebrow="Bag"
        title="Your cart"
        description="Select products and review quantities before placing your campus pickup order. Unselected products stay in your cart."
        action={<button type="button" onClick={() => void refreshCart()} disabled={loading || submitting} className="rounded-lg border border-[#e3e7f0] px-4 py-2 text-sm font-semibold disabled:opacity-50">Refresh cart</button>}
      />
      {error && (
        <p className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}
      {submitting && <p role="status" className="mb-4 text-sm text-[#64748b]">{operation}</p>}
      {lastOrder && <p role="status" className="mb-4 rounded-xl bg-green-50 p-4 text-sm text-green-800">Order {lastOrder.orderNumber} was placed. <Link to={`/orders?order=${lastOrder._id}`} className="font-semibold underline">View order</Link></p>}
      {!loading && !loadError && cart?.items.length > 0 && (
        <label className="mb-4 flex items-center gap-3 text-sm font-semibold">
          <input type="checkbox" disabled={submitting || !selectableItems.length}
            checked={selectableItems.length > 0 && selectedItems.length === selectableItems.length}
            ref={input => { if (input) input.indeterminate = selectedItems.length > 0 && selectedItems.length < selectableItems.length; }}
            onChange={event => { setSelectedIds(event.target.checked ? selectableItems.map(cartItemId) : []); setError(""); }} />
          Select all available products ({selectedItems.length}/{selectableItems.length})
        </label>
      )}
      <div className="grid gap-8 md:grid-cols-3">
        <div className="space-y-3 md:col-span-2">
          {loading ? (
            <LoadingState label="Loading cart…" />
          ) : loadError ? (
            <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{loadError}</p>
          ) : !cart ? null : cart.items.length === 0 ? (
            <StoreCard accent={false} className="p-10 text-center">
              <StoreIcon
                name="cart"
                className="mx-auto h-8 w-8 text-[#a9b4d6]"
              />
              <p className="mt-3 text-sm text-[#64748b]">
                Your cart is empty.{" "}
                <Link to="/products" className="font-semibold text-[#0b1b46]">
                  Browse products
                </Link>{" "}
                to add items.
              </p>
            </StoreCard>
          ) : (
            cart.items.map((item) => {
              const product = item.productId;
              return (
                <StoreCard
                  key={item.productRef ?? product?._id}
                  accent={false}
                  className="flex flex-wrap items-center gap-4 p-4"
                >
                  <input type="checkbox" checked={selectedProductIds.includes(cartItemId(item))}
                    disabled={submitting || !canCheckoutItem(item)}
                    aria-label={`Select ${product?.name ?? "unavailable product"} for checkout`}
                    onChange={event => { setSelectedIds(current => event.target.checked ? [...current, cartItemId(item)] : current.filter(id => id !== cartItemId(item))); setError(""); }} />
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#eef1f8]">
                    <ProductImage
                      product={product}
                      alt=""
                      className="h-full w-full object-contain p-1"
                    />
                  </div>
                  <div className="min-w-40 flex-1">
                    <h2 className="font-display text-sm font-bold">
                      {product?.name ?? "Unavailable product"}
                    </h2>
                    {!canCheckoutItem(item) && <p className="text-xs font-semibold text-red-700">{product?.stock === 0 ? "Out of stock" : "Unavailable in this quantity"} — excluded from checkout. You can keep it in your cart.</p>}
                    <p className="mt-0.5 text-xs text-[#64748b]">
                      {isPrice(product?.price) ? peso.format(product.price) : "Unavailable"} each
                    </p>
                  </div>
                  <div className="flex items-center rounded-lg border border-[#e3e7f0]">
                    <button
                      onClick={() =>
                        item.quantity > 1 &&
                        mutate(`/carts/items/${product._id}`, {
                          method: "PATCH",
                          body: JSON.stringify({ quantity: item.quantity - 1 }),
                        })
                      }
                      className="grid h-8 w-8 place-items-center"
                      disabled={submitting || !product?._id || item.quantity <= 1}
                      aria-label="Decrease quantity"
                    >
                      <StoreIcon name="minus" className="h-3.5 w-3.5" />
                    </button>
                    <span className="w-7 text-center text-sm">
                      {Number.isInteger(item.quantity) && item.quantity >= 1 && item.quantity <= 100 ? item.quantity : "Invalid"}
                    </span>
                    <button
                      onClick={() =>
                        mutate(`/carts/items/${product._id}`, {
                          method: "PATCH",
                          body: JSON.stringify({ quantity: item.quantity + 1 }),
                        })
                      }
                      className="grid h-8 w-8 place-items-center"
                      disabled={submitting || !product?._id || item.quantity >= product.stock || item.quantity >= 100}
                      aria-label="Increase quantity"
                    >
                      <StoreIcon name="plus" className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <strong className="w-20 text-right text-sm">
                    {isPrice(product?.price) && Number.isInteger(item.quantity) && item.quantity >= 1 && item.quantity <= 100 ? peso.format(product.price * item.quantity) : "Unavailable"}
                  </strong>
                  <button
                    type="button"
                    onClick={() => removeItem(item)}
                    disabled={submitting || !(item.productRef ?? product?._id)}
                    className="text-red-700"
                    aria-label={`Remove ${product?.name}`}
                  >
                    <StoreIcon name="trash" className="h-4 w-4" />
                  </button>
                </StoreCard>
              );
            })
          )}
        </div>
        <StoreCard className="h-fit p-5">
          <h2 className="font-display text-sm font-bold">Selected products ({selectedItems.length})</h2>
          <ul className="mt-3 space-y-2 text-xs text-[#64748b]">
            {selectedItems.map(item => <li key={cartItemId(item)}>{item.quantity}× {item.productId.name}</li>)}
          </ul>
          {!loading && !loadError && !selectedItems.length && <p className="mt-3 text-sm text-[#64748b]">Select products to check out.</p>}
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#64748b]">Subtotal</span>
              <span>{loading || loadError ? "—" : Number.isFinite(total) ? peso.format(total) : "Unavailable"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748b]">Service fee</span>
              <span>{peso.format(0)}</span>
            </div>
          </div>
          <div className="my-3 border-t border-[#e3e7f0]" />
          <div className="font-display flex justify-between font-extrabold">
            <span>Total</span>
            <span className="text-[#0b1b46]">{loading || loadError ? "—" : Number.isFinite(total) ? peso.format(total) : "Unavailable"}</span>
          </div>
          <button
            onClick={checkout}
            disabled={!selectedItems.length || !Number.isFinite(total) || total <= 0 || submitting || loading || Boolean(loadError)}
            aria-busy={submitting}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0b1b46] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <StoreIcon name="shield" className="h-4 w-4" />
            {submitting ? operation : loading ? "Loading cart…" : `Check out ${selectedItems.length} product${selectedItems.length === 1 ? "" : "s"}`}
          </button>
          <p className="mt-3 text-center text-[11px] leading-5 text-[#64748b]">
            Pickup details come from your saved profile.
            <Link to="/profile" className="ml-1 font-semibold underline">Update profile</Link>
          </p>
        </StoreCard>
      </div>
    </StorePage>
  );
};

export default CartPage;
