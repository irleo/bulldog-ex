import { useEffect, useId, useRef } from 'react';
import OrderLineItems from './OrderLineItems.jsx';
import { StatusPill, StoreIcon } from './StoreUI.jsx';

/** @typedef {{orderNumber: string, status?: string, createdAt?: string, totalAmount: number, phone?: string, items?: import('./OrderLineItems.jsx').OrderItem[], userId?: {firstName?: string, lastName?: string, email?: string} | null, shippingAddress?: {recipientName?: string, street?: string, city?: string, province?: string, postalCode?: string}}} OrderDetails */
const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });

/** @param {{order: OrderDetails, onClose: () => void}} props */
export default function AdminOrderDetailsModal({ order, onClose }) {
  const dialog = useRef(/** @type {HTMLDialogElement | null} */ (null));
  const titleId = useId();
  const customer = order.shippingAddress?.recipientName
    || [order.userId?.firstName, order.userId?.lastName].filter(Boolean).join(' ')
    || 'Unknown customer';
  const address = [order.shippingAddress?.street, order.shippingAddress?.city,
    order.shippingAddress?.province, order.shippingAddress?.postalCode].filter(Boolean).join(', ');

  useEffect(() => {
    const element = dialog.current;
    const previousFocus = document.activeElement;
    element?.showModal();
    return () => {
      element?.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, []);

  return (
    <dialog ref={dialog} aria-labelledby={titleId}
      onCancel={event => { event.preventDefault(); onClose(); }}
      onClick={event => { if (event.target === event.currentTarget) onClose(); }}
      className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-[#e3e7f0] bg-white p-0 text-[#101828] shadow-2xl backdrop:bg-[#071230]/55 backdrop:backdrop-blur-sm">
      <div>
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#e3e7f0] bg-white px-6 py-5">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#a9841f]">Order details</p>
            <h2 id={titleId} className="mt-1 break-words text-lg font-extrabold">{order.orderNumber}</h2>
            {order.createdAt && <p className="mt-1 text-xs text-[#64748b]">{new Date(order.createdAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</p>}
          </div>
          <button type="button" autoFocus onClick={onClose} aria-label="Close order details" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#e3e7f0]">
            <StoreIcon name="close" className="h-4 w-4" />
          </button>
        </header>
        <div className="space-y-6 p-6">
          <StatusPill status={order.status} />
          <section aria-label="Customer and pickup details" className="grid gap-4 rounded-xl bg-[#f8f9fc] p-4 text-sm sm:grid-cols-2">
            <div><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#64748b]">Customer</h3><p className="break-words font-semibold">{customer}</p><p className="mt-1">{order.phone || 'No saved phone'}</p><p className="mt-1 break-words text-[#64748b]">{order.userId?.email || 'Account unavailable'}</p></div>
            <div><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#64748b]">Pickup location</h3><p className="font-semibold">Main campus booth</p><p className="mt-3 text-xs text-[#64748b]">Saved contact address</p><p className="mt-1 break-words">{address || 'Unavailable'}</p></div>
          </section>
          <section aria-label="Ordered products">
            <h3 className="mb-2 text-sm font-bold">Products ({order.items?.length ?? 0})</h3>
            <OrderLineItems items={order.items ?? []} />
          </section>
          <div className="flex justify-between gap-4 rounded-xl bg-[#eef1f8] p-4 text-lg font-bold text-[#0b1b46]">
            <span>Order total</span><span>{Number.isFinite(order.totalAmount) && order.totalAmount > 0 ? peso.format(order.totalAmount) : 'Unavailable'}</span>
          </div>
        </div>
        <footer className="sticky bottom-0 flex justify-end border-t border-[#e3e7f0] bg-[#f8f9fc] px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg bg-[#0b1b46] px-5 py-2.5 text-sm font-semibold text-white">Close</button>
        </footer>
      </div>
    </dialog>
  );
}
