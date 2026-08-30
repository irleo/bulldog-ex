import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../../api/apiClient.js";
import { notify } from "../../utils/toast.js";
import {
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
  const [itemToRemove, setItemToRemove] = useState(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    apiRequest("/carts")
      .then((payload) => setCart(payload.data))
      .catch((requestError) => setError(requestError.message));
  }, []);

  useEffect(() => {
    if (!itemToRemove) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !removing) setItemToRemove(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [itemToRemove, removing]);

  const mutate = async (path, options) => {
    try {
      const payload = await apiRequest(path, options);
      setCart(payload.data);
    } catch (requestError) {
      notify.error(requestError.message);
    }
  };

  const checkout = async () => {
    setSubmitting(true);
    try {
      const payload = await apiRequest("/orders", { method: "POST" });
      setCart((current) => ({ ...current, items: [] }));
      notify.success(`Order ${payload.data.orderNumber} was placed successfully.`);
    } catch (requestError) {
      notify.error(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  const removeItem = async () => {
    const product = itemToRemove?.productId;
    if (!product?._id) return;

    setRemoving(true);
    try {
      const payload = await apiRequest(`/carts/items/${product._id}`, {
        method: "DELETE",
      });
      setCart(payload.data);
      setItemToRemove(null);
      notify.success(`${product.name} was removed from your cart.`);
    } catch (requestError) {
      notify.error(requestError.message);
    } finally {
      setRemoving(false);
    }
  };

  const total =
    cart?.items.reduce(
      (sum, item) => sum + (item.productId?.price ?? 0) * item.quantity,
      0,
    ) ?? 0;

  return (
    <StorePage>
      {itemToRemove && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center bg-[#071230]/55 p-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !removing) {
              setItemToRemove(null);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-cart-item-title"
            aria-describedby="remove-cart-item-description"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-[#e3e7f0] bg-white shadow-2xl"
          >
            <div className="flex items-start gap-4 p-6">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-[#eef1f8]">
                <ProductImage
                  product={itemToRemove.productId}
                  alt=""
                  className="h-full w-full object-contain p-1"
                />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-red-700">
                  Remove item
                </p>
                <h2
                  id="remove-cart-item-title"
                  className="font-display mt-1 text-lg font-extrabold"
                >
                  Remove {itemToRemove.productId?.name ?? "this product"}?
                </h2>
                <p
                  id="remove-cart-item-description"
                  className="mt-2 text-sm leading-6 text-[#64748b]"
                >
                  This product and its selected quantity will be removed from
                  your cart.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#e3e7f0] bg-[#f8f9fc] px-6 py-4">
              <button
                type="button"
                disabled={removing}
                onClick={() => setItemToRemove(null)}
                className="rounded-lg border border-[#e3e7f0] bg-white px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
              >
                Keep item
              </button>
              <button
                type="button"
                disabled={removing}
                onClick={removeItem}
                className="rounded-lg bg-red-700 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {removing ? "Removing…" : "Remove item"}
              </button>
            </div>
          </div>
        </div>
      )}
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
                    onClick={() => setItemToRemove(item)}
                    disabled={!product?._id}
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
