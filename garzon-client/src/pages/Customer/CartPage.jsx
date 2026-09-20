import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../api/apiClient.js";
import { useAuth } from "../../auth/authContext.js";
import { notify } from "../../utils/toast.js";
import {
  useConfirmation,
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
  const { user } = useAuth();
  const { confirm, confirmation } = useConfirmation();
  const inFlight = useRef(false);
  useEffect(() => {
    apiRequest("/carts")
      .then((payload) => setCart(payload.data))
      .catch((requestError) => setError(requestError.message));
  }, []);

  const mutate = async (path, options, reportError = true) => {
    if (inFlight.current) return false;
    inFlight.current = true;
    setSubmitting(true);
    try {
      const payload = await apiRequest(path, options);
      setCart(payload.data);
      return true;
    } catch (requestError) {
      if (!reportError) throw requestError;
      notify.error(requestError.message);
      return false;
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  };

  const removeItem = (item) => confirm({
    title: "Remove item?", message: `Remove "${item.productId.name}" from your cart? You can add it again while it remains available.`,
    cancelLabel: "Keep item", confirmLabel: "Remove item", destructive: true,
    onConfirm: async () => {
      const removed = await mutate(`/carts/items/${item.productId._id}`, { method: "DELETE" }, false);
      if (removed) notify.success(`${item.productId.name} was removed from your cart.`);
      return removed;
    },
  });

  const checkout = () => {
    if (inFlight.current) return;
    if (!cart?.items.length) { setError("Your cart is empty."); return; }
    if (cart.items.some((item) => !item.productId?.isActive || item.quantity < 1 || item.quantity > item.productId.stock)) {
      setError("Some products are unavailable or exceed available stock. Update your cart before placing an order.");
      return;
    }
    if (!user.phone || !user.address?.street || !user.address.city || !user.address.province || !user.address.postalCode) {
      setError("Complete your phone number and address in your profile before placing an order.");
      return;
    }
    setError("");
    confirm({ title: "Place order?", confirmLabel: "Place order", cancelLabel: "Review order",
      message: `Place this campus pickup order for ${peso.format(total)} for ${user.firstName} ${user.lastName} (${user.phone})? Check the products and quantities in your cart. You can cancel only while the order is pending; availability is confirmed during processing.`,
      onConfirm: async () => {
        if (inFlight.current) return false;
        inFlight.current = true;
        setSubmitting(true);
        try {
          const payload = await apiRequest("/orders", { method: "POST" });
          setCart((current) => ({ ...current, items: [] }));
          notify.success(`Order ${payload.data.orderNumber} was placed successfully.`);
        } finally { inFlight.current = false; setSubmitting(false); }
      },
    });
  };
  const total =
    cart?.items.reduce(
      (sum, item) => sum + (item.productId?.price ?? 0) * item.quantity,
      0,
    ) ?? 0;

  return (
    <StorePage>
      {confirmation}
      <StorePageHeader
        eyebrow="Bag"
        title="Your cart"
        description="Review quantities before placing your campus pickup order."
      />
      {error && (
        <p className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="grid gap-8 md:grid-cols-3">
        <div className="space-y-3 md:col-span-2">
          {!cart ? (
            <p className="text-sm text-[#64748b]">Loading cart…</p>
          ) : cart.items.length === 0 ? (
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
                  key={product?._id}
                  accent={false}
                  className="flex flex-wrap items-center gap-4 p-4"
                >
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
                    <p className="mt-0.5 text-xs text-[#64748b]">
                      {peso.format(product?.price ?? 0)} each
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
                      {item.quantity}
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
                    {peso.format((product?.price ?? 0) * item.quantity)}
                  </strong>
                  <button
                    type="button"
                    onClick={() => removeItem(item)}
                    disabled={submitting || !product?._id}
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
          <h2 className="font-display text-sm font-bold">Order summary</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[#64748b]">Subtotal</span>
              <span>{peso.format(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#64748b]">Service fee</span>
              <span>{peso.format(0)}</span>
            </div>
          </div>
          <div className="my-3 border-t border-[#e3e7f0]" />
          <div className="font-display flex justify-between font-extrabold">
            <span>Total</span>
            <span className="text-[#0b1b46]">{peso.format(total)}</span>
          </div>
          <button
            onClick={checkout}
            disabled={!cart?.items.length || submitting}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0b1b46] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <StoreIcon name="shield" className="h-4 w-4" />
            {submitting ? "Placing order…" : "Place order"}
          </button>
          <p className="mt-3 text-center text-[11px] leading-5 text-[#64748b]">
            Pickup details come from your saved profile.
          </p>
        </StoreCard>
      </div>
    </StorePage>
  );
};

export default CartPage;
