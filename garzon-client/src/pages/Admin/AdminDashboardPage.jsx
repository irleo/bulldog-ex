import { useEffect, useState } from 'react';
import { apiRequest } from '../../api/apiClient.js';
import { StoreCard, StorePageHeader } from '../../components/StoreUI.jsx';
const peso = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' });
export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [retrying, setRetrying] = useState(false);
  useEffect(() => {
    let active = true;
    apiRequest('/dashboard').then(payload => { if (active) setData(payload.data); }).catch(error => { if (active) setError(error.message); });
    return () => { active = false; };
  }, []);
  const retry = async () => {
    setRetrying(true);
    try { await apiRequest('/dashboard/media-cleanup/retry', { method: 'POST' }); const payload = await apiRequest('/dashboard'); setData(payload.data); setError(''); }
    catch (error) { setError(error.message); }
    finally { setRetrying(false); }
  };
  return <div className="space-y-6">
    <StorePageHeader eyebrow="Administration" title="Store overview" description="Current inventory and customer totals, with paid orders created in the last seven days." />
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
    {!data ? <p>{error ? 'Dashboard unavailable.' : 'Loading dashboard…'}</p> : <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[["Active products", data.products], ["Customers", data.customers], ["Pending orders", data.pendingOrders], ["Paid order value · 7 days", peso.format(data.paidAmount)]].map(([label, value]) => <StoreCard key={label} className="p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-3 text-2xl font-bold">{value}</p></StoreCard>)}
      </div>
      <p className="text-sm text-slate-500">{new Date(data.since).toLocaleString()} – {new Date(data.until).toLocaleString()}. Only orders marked paid are included; unpaid and cancelled orders do not contribute. Values are grouped by order creation date, not payment receipt date.</p>
      <div className="grid gap-6 lg:grid-cols-2">
        <StoreCard className="p-5"><h2 className="font-bold">Paid order value by day</h2>{data.daily.length ? <ul className="mt-4 space-y-3">{data.daily.map(day => <li key={day._id}><div className="flex justify-between text-sm"><span>{day._id}</span><span>{peso.format(day.amount)}</span></div><progress className="w-full accent-[#0b1b46]" max={Math.max(...data.daily.map(item => item.amount))} value={day.amount} /></li>)}</ul> : <p className="mt-4 text-sm text-slate-500">No paid orders in this period.</p>}</StoreCard>
        <StoreCard className="p-5"><h2 className="font-bold">Top products in paid orders</h2>{data.topProducts.length ? <ul className="mt-4 space-y-3">{data.topProducts.map(product => <li key={product._id} className="flex justify-between gap-4 text-sm"><span>{product.name} ({product._id})</span><span>{product.quantity} units</span></li>)}</ul> : <p className="mt-4 text-sm text-slate-500">No sales data in this period.</p>}</StoreCard>
      </div>
      <StoreCard className="p-5"><h2 className="font-bold">Image cleanup</h2><p className="my-3 text-sm">{data.cleanupPending} image checks due. Referenced images are retained. Each retry processes up to five records.</p><button disabled={retrying || !data.cleanupPending} onClick={retry} className="rounded-lg bg-[#0b1b46] px-4 py-2 text-white disabled:opacity-50">{retrying ? 'Checking…' : 'Retry cleanup'}</button></StoreCard>
    </>}
  </div>;
}
