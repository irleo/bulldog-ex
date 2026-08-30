import { useEffect, useState } from "react";
import { apiRequest } from "../../api/apiClient.js";
import {
  StoreCard,
  StoreIcon,
  StorePageHeader,
} from "../../components/StoreUI.jsx";

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 0,
});
const salesTrend = [3200, 4800, 3900, 6100, 5200, 7600, 8900];
const salesDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const categorySplit = [
  { name: "Apparel", value: 42, color: "#0b1b46" },
  { name: "Accessories", value: 27, color: "#d4af37" },
  { name: "Study essentials", value: 18, color: "#4f66a5" },
  { name: "Other", value: 13, color: "#a9b4d6" },
];
const topProducts = [
  { label: "APP-001", value: 42 },
  { label: "ACC-001", value: 35 },
  { label: "STU-001", value: 29 },
  { label: "APP-004", value: 24 },
  { label: "ACC-003", value: 18 },
  { label: "BAG-002", value: 13 },
];

const LineChart = () => {
  const points = salesTrend
    .map((value, index) => `${42 + index * 93},${190 - (value / 9000) * 145}`)
    .join(" ");
  return (
    <div className="mt-4 w-full overflow-hidden">
      <svg
        viewBox="0 0 640 225"
        className="h-[240px] w-full"
        role="img"
        aria-label="Static weekly sales trend chart"
      >
        {[45, 95, 145, 195].map((y) => (
          <line
            key={y}
            x1="42"
            x2="618"
            y1={y}
            y2={y}
            stroke="#e3e7f0"
            strokeDasharray="4 5"
          />
        ))}
        <polyline
          points={points}
          fill="none"
          stroke="#0b1b46"
          strokeWidth="4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {salesTrend.map((value, index) => (
          <circle
            key={salesDays[index]}
            cx={42 + index * 93}
            cy={190 - (value / 9000) * 145}
            r="5"
            fill="#d4af37"
            stroke="#fff"
            strokeWidth="3"
          />
        ))}
        {salesDays.map((day, index) => (
          <text
            key={day}
            x={42 + index * 93}
            y="218"
            textAnchor="middle"
            fontSize="11"
            fill="#64748b"
          >
            {day}
          </text>
        ))}
      </svg>
    </div>
  );
};

const DonutChart = () => (
  <div className="mt-5 flex flex-col items-center gap-6 sm:flex-row sm:justify-around">
    <div
      className="grid h-40 w-40 shrink-0 place-items-center rounded-full"
      style={{
        background:
          "conic-gradient(#0b1b46 0 42%, #d4af37 42% 69%, #4f66a5 69% 87%, #a9b4d6 87% 100%)",
      }}
    >
      <div className="grid h-24 w-24 place-items-center rounded-full bg-white text-center">
        <span>
          <strong className="font-display block text-xl text-[#0b1b46]">
            100%
          </strong>
          <small className="text-[10px] uppercase tracking-wide text-[#64748b]">
            Revenue
          </small>
        </span>
      </div>
    </div>
    <div className="w-full max-w-xs space-y-2.5">
      {categorySplit.map((item) => (
        <div
          key={item.name}
          className="flex items-center justify-between text-xs"
        >
          <span className="flex items-center gap-2">
            <i
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            {item.name}
          </span>
          <strong>{item.value}%</strong>
        </div>
      ))}
    </div>
  </div>
);

const BarChart = () => {
  const max = Math.max(...topProducts.map((item) => item.value));
  return (
    <div className="mt-5 flex h-52 items-end justify-around gap-3 border-b border-[#e3e7f0] px-2">
      {topProducts.map((item) => (
        <div
          key={item.label}
          className="flex h-full flex-1 flex-col items-center justify-end gap-2"
        >
          <span className="text-[10px] font-semibold text-[#64748b]">
            {item.value}
          </span>
          <div
            className="w-full max-w-10 rounded-t-md bg-[#d4af37]"
            style={{ height: `${Math.max(16, (item.value / max) * 150)}px` }}
          />
          <span className="mb-2 text-[9px] text-[#64748b]">{item.label}</span>
        </div>
      ))}
    </div>
  );
};

const AdminDashboardPage = () => {
  const [data, setData] = useState({ products: [], orders: [], users: [] });
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      apiRequest("/products/admin?limit=100"),
      apiRequest("/orders?limit=100"),
      apiRequest("/users?limit=100"),
    ])
      .then(([products, orders, users]) =>
        setData({
          products: Array.isArray(products.data) ? products.data : [],
          orders: Array.isArray(orders.data) ? orders.data : [],
          users: Array.isArray(users.data) ? users.data : [],
        }),
      )
      .catch((requestError) => setError(requestError.message));
  }, []);

  const revenue = data.orders
    .filter((order) => order.status !== "cancelled")
    .reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
  const activeCustomers = data.users.filter(
    (user) => user.role === "customer" && user.isActive,
  ).length;
  const stats = [
    {
      label: "Revenue (7d)",
      value: revenue ? peso.format(revenue) : "₱30.0K",
      icon: "cart",
      trend: "+12% vs last week",
    },
    {
      label: "Orders (7d)",
      value: data.orders.length || 46,
      icon: "package",
      trend: "+5 new today",
    },
    { label: "Products", value: data.products.length || 8, icon: "box" },
    {
      label: "Active customers",
      value: activeCustomers || 128,
      icon: "user",
      trend: "+8 this week",
    },
  ];

  return (
    <div className="w-full">
      <StorePageHeader
        eyebrow="Store analytics"
        title="Dashboard"
        description="Track sales performance and store health at a glance."
      />
      {error && (
        <p className="mb-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-700">
          Live totals are unavailable. Showing dashboard sample data.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StoreCard
            key={stat.label}
            className="flex items-start justify-between p-5"
          >
            <div>
              <p className="font-display text-2xl font-extrabold text-[#0b1b46]">
                {stat.value}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#64748b]">
                {stat.label}
              </p>
              {stat.trend && (
                <p className="mt-2 text-[10px] font-semibold text-green-700">
                  {stat.trend}
                </p>
              )}
            </div>
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#eef1f8] text-[#0b1b46]">
              <StoreIcon name={stat.icon} className="h-4 w-4" />
            </span>
          </StoreCard>
        ))}
      </div>
      <StoreCard className="mt-6 p-5">
        <h2 className="font-display text-sm font-bold">Weekly sales trend</h2>
        <p className="mt-1 text-xs text-[#64748b]">
          Gross revenue, last 7 days
        </p>
        <LineChart />
      </StoreCard>
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        <StoreCard className="p-5">
          <h2 className="font-display text-sm font-bold">Sales by category</h2>
          <p className="mt-1 text-xs text-[#64748b]">Share of total revenue</p>
          <DonutChart />
        </StoreCard>
        <StoreCard className="p-5">
          <h2 className="font-display text-sm font-bold">
            Top products by units sold
          </h2>
          <p className="mt-1 text-xs text-[#64748b]">
            Best-performing catalog items
          </p>
          <BarChart />
        </StoreCard>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
