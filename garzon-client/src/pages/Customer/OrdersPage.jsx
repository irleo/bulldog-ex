import { useEffect, useState } from "react";
import { apiRequest } from "../../api/apiClient.js";
import { notify } from "../../utils/toast.js";
import {
  useConfirmation,
  useUnsavedForm,
  StatusPill,
  StoreCard,
  StoreIcon,
  StorePage,
  StorePageHeader,
  StorePagination,
} from "../../components/StoreUI.jsx";

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});
const steps = ["pending", "confirmed", "ready_for_claiming", "claimed"];
const stepLabels = {
  pending: "Pending",
  confirmed: "Preparing",
  ready_for_claiming: "Ready for pickup",
  claimed: "Claimed",
};
const ReviewStars = ({ rating }) => <span className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>{[1, 2, 3, 4, 5].map((value) => <StoreIcon key={value} name="star" className={`h-3.5 w-3.5 ${value <= Number(rating) ? "fill-[#d4af37] text-[#d4af37]" : "text-[#d7dce7]"}`} />)}</span>;

const OrdersPage = () => {
  const { confirm, confirmation } = useConfirmation();
  const { formRef, onFormChange, markSaved, guardDiscard } = useUnsavedForm(confirm);
  const [activeTab, setActiveTab] = useState("orders");
  const [orders, setOrders] = useState([]);
  const [orderPage, setOrderPage] = useState(1);
  const [orderPagination, setOrderPagination] = useState({ total: 0 });
  const [reviews, setReviews] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [reviewOrder, setReviewOrder] = useState(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setOrdersLoading(true);
    apiRequest(`/orders/mine?page=${orderPage}&limit=4`)
      .then((ordersPayload) => {
        const records = Array.isArray(ordersPayload.data)
          ? ordersPayload.data
          : [];
        setOrders(records);
        setSelectedId(records[0]?._id ?? "");
        setOrderPagination(ordersPayload.pagination ?? { total: 0 });
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setOrdersLoading(false));
  }, [orderPage]);

  useEffect(() => {
    apiRequest("/reviews/mine?limit=100")
      .then((reviewsPayload) => {
        setReviews(
          Array.isArray(reviewsPayload.data) ? reviewsPayload.data : [],
        );
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setReviewsLoading(false));
  }, []);

  const selected =
    orders.find((order) => order._id === selectedId) ?? orders[0];
  const selectedStatus = String(selected?.status || "pending");
  const currentStep = steps.indexOf(selectedStatus);

  const claimSelectedOrder = () => {
    if (!selected || selectedStatus !== "ready_for_claiming") return;
    const order = selected;
    confirm({ title: `Complete order ${order.orderNumber}?`,
      message: "Confirm that you have received this order. Marking it as claimed completes the order and cannot be undone.",
      confirmLabel: "Mark as claimed", onConfirm: async () => {
        setClaiming(true);
        try {
          const payload = await apiRequest(`/orders/${order._id}/claim`, { method: "PATCH" });
          setOrders((current) => current.map((entry) => entry._id === payload.data._id ? payload.data : entry));
          notify.success("Order marked as claimed.");
          setReviewOrder(payload.data);
        } finally { setClaiming(false); }
      },
    });
  };

  const cancelPendingOrder = (order) => {
    if (order.status !== "pending") return;
    confirm({ title: `Cancel order ${order.orderNumber}?`,
      message: "This will permanently cancel your pending order. The cancellation cannot be undone.",
      cancelLabel: "Keep order", confirmLabel: "Cancel order", destructive: true,
      onConfirm: async () => {
        const payload = await apiRequest(`/orders/${order._id}/cancel`, { method: "PATCH" });
        setOrders((current) => current.map((entry) => entry._id === payload.data._id ? payload.data : entry));
        notify.success("Order cancelled successfully.");
      },
    });
  };

  const closeReview = () => {
    if (!reviewSubmitting) guardDiscard(() => setReviewOrder(null));
  };
  const submitOrderReview = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setReviewSubmitting(true);
    try {
      const payload = await apiRequest("/reviews", {
        method: "POST",
        body: JSON.stringify({
          productId: form.get("productId"),
          rating: Number(form.get("rating")),
          content: form.get("content"),
        }),
      });
      setReviews((current) => [payload.data, ...current]);
      markSaved();
      setReviewOrder(null);
      setActiveTab("reviews");
      notify.success("Review submitted.");
    } catch (requestError) {
      notify.error(requestError.message);
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <StorePage>
      {confirmation}
      {reviewOrder && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-[#071230]/55 p-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && closeReview()}>
          <div role="dialog" aria-modal="true" aria-labelledby="review-dialog-title" className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#e3e7f0] bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#e3e7f0] px-6 py-5">
              <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#a9841f]">Order claimed</p><h2 id="review-dialog-title" className="font-display mt-1 text-lg font-extrabold">Review your purchase</h2><p className="mt-1 text-xs text-[#64748b]">{reviewOrder.orderNumber}</p></div>
              <button type="button" onClick={closeReview} className="grid h-9 w-9 place-items-center rounded-lg border border-[#e3e7f0] text-[#64748b]" aria-label="Close review form"><StoreIcon name="close" className="h-4 w-4" /></button>
            </div>
            <form ref={formRef} onChange={onFormChange} onSubmit={submitOrderReview} className="grid gap-4 p-6">
              <label><span className="mb-1.5 block text-xs font-semibold text-[#64748b]">Product</span><select name="productId" required className="w-full rounded-lg border border-[#e3e7f0] p-2.5 text-sm">{reviewOrder.items?.filter((item) => item.productId?._id).map((item) => <option key={item.productId._id} value={item.productId._id}>{item.productName}</option>)}</select></label>
              <label><span className="mb-1.5 block text-xs font-semibold text-[#64748b]">Rating</span><select name="rating" required defaultValue="5" className="w-full rounded-lg border border-[#e3e7f0] p-2.5 text-sm">{[5, 4, 3, 2, 1].map((rating) => <option key={rating} value={rating}>{rating}/5</option>)}</select></label>
              <label><span className="mb-1.5 block text-xs font-semibold text-[#64748b]">Review</span><textarea name="content" required minLength="10" maxLength="1000" rows="4" className="w-full resize-none rounded-lg border border-[#e3e7f0] p-3 text-sm outline-none focus:border-[#d4af37]" placeholder="Share your experience with this product…" /></label>
              <div className="flex justify-end gap-2 border-t border-[#e3e7f0] pt-4"><button type="button" onClick={closeReview} className="rounded-lg border border-[#e3e7f0] px-4 py-2.5 text-sm font-semibold">Not now</button><button disabled={reviewSubmitting} className="rounded-lg bg-[#0b1b46] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60">{reviewSubmitting ? "Submitting…" : "Submit review"}</button></div>
            </form>
          </div>
        </div>
      )}
      <StorePageHeader
        eyebrow="Order tracking"
        title="My orders"
        description="Follow every order from confirmation through campus pickup."
      />
      <div className="mb-6 flex gap-2 border-b border-[#e3e7f0]">
        {[['orders', 'Orders'], ['reviews', 'Reviews']].map(([value, label]) => <button key={value} onClick={() => setActiveTab(value)} className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${activeTab === value ? "border-[#0b1b46] text-[#0b1b46]" : "border-transparent text-[#64748b] hover:text-[#101828]"}`}>{label}</button>)}
      </div>
      {error && (
        <p className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}
      {(activeTab === "orders" ? ordersLoading : reviewsLoading) ? (
        <p className="text-sm text-[#64748b]">Loading activity…</p>
      ) : activeTab === "reviews" ? (
        reviews.length === 0 ? <StoreCard accent={false} className="p-10 text-center"><StoreIcon name="star" className="mx-auto h-8 w-8 text-[#a9b4d6]" /><p className="mt-3 text-sm text-[#64748b]">No submitted reviews yet.</p></StoreCard> : <div className="grid gap-3 md:grid-cols-2">{reviews.map((review) => <StoreCard key={review._id} accent={false} className="p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="font-display text-sm font-bold">{review.productId?.name ?? "Product"}</h2><p className="mt-1 text-xs text-[#64748b]">{new Date(review.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</p></div><ReviewStars rating={review.rating} /></div><p className="mt-4 text-sm leading-6 text-[#101828]">{review.content}</p><div className="mt-4 border-t border-[#e3e7f0] pt-3 text-[10px] font-semibold uppercase tracking-wide text-[#64748b]">{review.isHidden ? "Hidden" : "Published"}</div></StoreCard>)}</div>
      ) : orders.length === 0 ? (
        <StoreCard accent={false} className="p-10 text-center">
          <StoreIcon
            name="package"
            className="mx-auto h-8 w-8 text-[#a9b4d6]"
          />
          <p className="mt-3 text-sm text-[#64748b]">No orders yet.</p>
        </StoreCard>
      ) : (
        <>
        <div className="grid gap-6 md:grid-cols-[18rem_1fr]">
          <div className="space-y-2">
            {orders.map((order) => (
              <button
                key={order._id}
                onClick={() => setSelectedId(order._id)}
                className={`w-full rounded-xl border p-4 text-left transition ${selected?._id === order._id ? "border-[#d4af37] bg-[#f6ecc9]/40" : "border-[#e3e7f0] bg-white hover:border-[#c7cede]"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="font-display text-sm font-bold">
                    {order.orderNumber}
                  </span>
                  <StatusPill status={order.status} />
                </div>
                <div className="mt-3 flex justify-between text-xs text-[#64748b]">
                  <span>
                    {new Date(order.createdAt).toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <strong className="text-[#0b1b46]">
                    {peso.format(order.totalAmount ?? 0)}
                  </strong>
                </div>
              </button>
            ))}
          </div>
          <StoreCard className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#a9841f]">
                  Order details
                </p>
                <h2 className="font-display mt-1 text-xl font-extrabold">
                  {selected.orderNumber}
                </h2>
              </div>
              <StatusPill status={selectedStatus} />
            </div>
            {selectedStatus !== "cancelled" ? (
              <div className="my-8 flex items-start">
                {steps.map((step, index) => (
                  <div key={step} className="contents">
                    <div className="flex w-20 shrink-0 flex-col items-center">
                      <span
                        className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${index <= currentStep ? "bg-[#0b1b46] text-white" : "bg-[#eef1f8] text-[#94a3b8]"}`}
                      >
                        {index < currentStep ? (
                          <StoreIcon name="check" className="h-4 w-4" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <span
                        className={`mt-1.5 text-center text-[10px] ${index <= currentStep ? "text-[#101828]" : "text-[#94a3b8]"}`}
                      >
                        {stepLabels[step]}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <span
                        className={`mt-4 h-0.5 flex-1 ${index < currentStep ? "bg-[#0b1b46]" : "bg-[#e3e7f0]"}`}
                      />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="my-6 rounded-xl bg-red-50 p-4 text-sm text-red-700">
                This order was cancelled.
              </div>
            )}
            <h3 className="font-display mb-3 text-sm font-bold">Items</h3>
            <ul className="divide-y divide-[#e3e7f0] border-y border-[#e3e7f0]">
              {selected.items?.map((item, index) => (
                <li
                  key={`${selected._id}-${item.productId?._id ?? index}`}
                  className="flex justify-between gap-3 py-3 text-sm"
                >
                  <span>
                    <strong>{item.quantity}×</strong> {item.productName}
                  </span>
                  <span className="text-[#64748b]">
                    {peso.format(
                      item.subtotal ?? item.unitPrice * item.quantity,
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex justify-between text-sm">
              <span className="text-[#64748b]">Pickup location</span>
              <span>Main campus booth</span>
            </div>
            <div className="font-display mt-3 flex justify-between border-t border-[#e3e7f0] pt-3 font-extrabold">
              <span>Total</span>
              <span className="text-[#0b1b46]">
                {peso.format(selected.totalAmount ?? 0)}
              </span>
            </div>
            {selectedStatus === "pending" && (
              <button
                type="button"
                onClick={() => cancelPendingOrder(selected)}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 hover:bg-red-100"
              >
                <StoreIcon name="close" className="h-4 w-4" />
                Cancel order
              </button>
            )}
            {selectedStatus === "ready_for_claiming" && (
              <button onClick={claimSelectedOrder} disabled={claiming} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0b1b46] px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">
                <StoreIcon name="check" className="h-4 w-4" />
                {claiming ? "Confirming…" : "Mark as claimed"}
              </button>
            )}
            {selectedStatus === "claimed" && (
              <button onClick={() => setReviewOrder(selected)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-[#0b1b46] px-4 py-3 text-sm font-semibold text-[#0b1b46]"><StoreIcon name="star" className="h-4 w-4" />Review products</button>
            )}
          </StoreCard>
        </div>
        <StorePagination
          page={orderPage}
          pageSize={4}
          total={orderPagination.total}
          onPageChange={setOrderPage}
        />
        </>
      )}
    </StorePage>
  );
};

export default OrdersPage;
