import { ProductImage } from './StoreUI.jsx';

/** @typedef {{productName: string, sku: string, quantity: number, unitPrice: number, subtotal: number, productId?: {images?: string[], name?: string} | null}} OrderItem */
const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
/** @param {number} amount */
const formatAmount = amount => Number.isFinite(amount) && amount > 0 ? peso.format(amount) : 'Unavailable';

/** Order snapshots remain readable if a catalog product is renamed or removed.
 * @param {{items: OrderItem[]}} props */
export default function OrderLineItems({ items }) {
  return (
    <ul className="min-w-60 divide-y divide-[#e3e7f0]">
      {items.map((item, index) => (
        <li key={`${item.sku}-${index}`} className="flex gap-3 py-3 text-sm">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#eef1f8]">
            <ProductImage product={item.productId} alt={item.productName} className="h-full w-full object-contain p-1" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="break-words font-semibold text-[#101828]">{item.productName}</p>
            <p className="text-xs text-[#64748b]">SKU: {item.sku || 'Unavailable'}</p>
            <p className="mt-1 text-xs text-[#64748b]">Quantity: {item.quantity} · {formatAmount(item.unitPrice)} each</p>
          </div>
          <strong className="shrink-0 text-[#0b1b46]">{formatAmount(item.subtotal)}</strong>
        </li>
      ))}
    </ul>
  );
}
