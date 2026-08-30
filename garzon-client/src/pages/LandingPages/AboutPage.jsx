import { Button, StoreCard, StoreIcon } from "../../components/StoreUI.jsx";
import logo from "../../assets/img/nubdexchange_logo.png";
import category1 from "../../assets/img/category1.jpg";
import category2 from "../../assets/img/category2.jpg";
import category3 from "../../assets/img/category3.jpg";
import category4 from "../../assets/img/category4.jpg";

const stats = [
  ["08", "Items"],
  ["06", "Categories"],
  ["03", "Pickup slots"],
  ["24", "Orders"],
];
const flow = [
  {
    icon: "box",
    title: "Category grid",
    description:
      "Products are grouped so students can scan campus essentials fast.",
  },
  {
    icon: "cart",
    title: "Simple checkout",
    description: "Product pages keep price, stock, and actions easy to find.",
  },
  {
    icon: "truck",
    title: "Pickup ready",
    description:
      "Order information stays direct for quick campus pickup updates.",
  },
];
const gallery = [category1, category2, category3, category4];

const AboutPage = () => (
  <div className="w-full px-6 py-12 sm:px-8 lg:px-10 xl:px-14">
    <section className="mb-14 grid items-center gap-10 md:grid-cols-2">
      <StoreCard
        accent={false}
        className="flex min-h-72 items-center justify-center p-10"
      >
        <img
          src={logo}
          alt="BulldogEx Shop"
          className="h-52 w-52 object-contain"
        />
      </StoreCard>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a9841f]">
          About store
        </p>
        <h1 className="font-display mt-1.5 text-2xl font-extrabold leading-tight md:text-3xl">
          A campus shop focused on useful products and simple ordering.
        </h1>
        <p className="mt-4 text-sm leading-7 text-[#64748b]">
          BulldogEx Shop presents clear product categories, quick actions, and
          easy-to-find store information for every student and staff member on
          campus.
        </p>
        <div className="mt-6 flex gap-3">
          <Button to="/" variant="primary">
            Back home
          </Button>
          <Button to="/products">Open products</Button>
        </div>
      </div>
    </section>

    <section className="mb-14 border-t border-[#e3e7f0] pt-10">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a9841f]">
        Store overview
      </p>
      <h2 className="font-display mt-1.5 text-xl font-extrabold">
        Quick store blocks
      </h2>
      <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
        {stats.map(([value, label]) => (
          <StoreCard key={label} className="p-5">
            <p className="font-display text-3xl font-extrabold text-[#0b1b46]">
              {value}
            </p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#64748b]">
              {label}
            </p>
          </StoreCard>
        ))}
      </div>
    </section>

    <section className="grid gap-10 border-t border-[#e3e7f0] pt-10 md:grid-cols-2">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a9841f]">
          Store flow
        </p>
        <h2 className="font-display mt-1.5 text-xl font-extrabold">
          Shopping made straightforward
        </h2>
        <div className="mt-5 space-y-3">
          {flow.map((item) => (
            <StoreCard
              key={item.title}
              accent={false}
              className="flex items-start gap-3 p-4"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#eef1f8] text-[#0b1b46]">
                <StoreIcon name={item.icon} className="h-4 w-4" />
              </span>
              <div>
                <h3 className="font-display text-sm font-bold">{item.title}</h3>
                <p className="mt-0.5 text-xs leading-5 text-[#64748b]">
                  {item.description}
                </p>
              </div>
            </StoreCard>
          ))}
        </div>
      </div>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a9841f]">
          Preview
        </p>
        <h2 className="font-display mt-1.5 text-xl font-extrabold">
          What’s in the store
        </h2>
        <div className="mt-5 grid grid-cols-2 gap-4">
          {gallery.map((image, index) => (
            <img
              key={image}
              src={image}
              alt={`Store category ${index + 1}`}
              className="h-32 w-full rounded-xl object-cover"
            />
          ))}
        </div>
        <Button to="/products" className="mt-4 w-full">
          View products
        </Button>
      </div>
    </section>
  </div>
);

export default AboutPage;
