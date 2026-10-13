import { Button, StoreCard, StoreIcon } from "../../components/StoreUI.jsx";
import logo from "../../assets/img/NU-Bulldogs-Logo.webp";
import dailyEssentials from "../../assets/img/daily_essentials.webp";
import studySupplies from "../../assets/img/study_supplies.webp";
import campusApparel from "../../assets/img/campus_apparel.webp";

const stats = [
  ["08", "Products"],
  ["06", "Categories"],
  ["24", "Orders"],
  ["03", "Pickup slots"],
];
const sections = [
  {
    title: "Daily Essentials",
    description: "Bags, tumblers, lanyards, and items used every school day.",
    image: dailyEssentials,
    action: "View products",
  },
  {
    title: "Study Supplies",
    description: "Notes, desk tools, and study kits for class.",
    image: studySupplies,
    action: "Shop supplies",
  },
  {
    title: "Campus Apparel",
    description: "Comfortable pieces for class days and weekends.",
    image: campusApparel,
    action: "View apparel",
  },
];

const HomePage = () => (
  <div>
    <section className="relative overflow-hidden bg-[linear-gradient(120deg,#0b1b46,#24316b)]">
      <div className="relative z-10 grid w-full items-center gap-8 px-6 py-16 sm:px-8 md:grid-cols-[0.8fr_1.2fr] md:py-20 lg:px-10 xl:px-14">
        <div className="mx-auto grid h-44 w-44 place-items-center rounded-full bg-[radial-gradient(circle_at_30%_30%,#e8c854,#a9841f)] shadow-2xl shadow-black/25 md:h-56 md:w-56">
          <img
            src={logo}
            alt="National University Bulldogs"
            className="h-36 w-36 object-contain md:h-44 md:w-44"
          />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#d4af37]">
            Campus marketplace
          </p>
          <h1 className="font-display mt-2 text-3xl font-extrabold leading-tight text-white md:text-4xl">
            Welcome to BulldogEx Shop
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-7 text-[#c7d1ea] md:text-base">
            Explore campus uniforms, student essentials, and school merchandise
            in one quick storefront.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button to="/products" variant="primary">
              Shop now
            </Button>
            <Button
              to="/about"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10"
            >
              About store
            </Button>
          </div>
        </div>
      </div>
      <div className="relative z-10 w-full border-t border-white/15 px-6 py-4 text-xs font-semibold uppercase tracking-[0.12em] text-[#c7d1ea] sm:px-8 lg:px-10 xl:px-14">
        Official National U merchandise store
      </div>
      <div className="h-1.5 bg-[#d4af37]" />
    </section>

    <section className="w-full px-6 py-14 sm:px-8 lg:px-10 xl:px-14">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a9841f]">
        Store overview
      </p>
      <h2 className="font-display mt-1.5 text-xl font-extrabold">
        Quick shopping blocks
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

      <div className="mt-14 border-t border-[#e3e7f0] pt-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a9841f]">
          Shop sections
        </p>
        <h2 className="font-display mt-1.5 text-xl font-extrabold">
          Campus essentials, organized
        </h2>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          {sections.map((item) => (
            <StoreCard key={item.title} className="overflow-hidden">
              <img
                src={item.image}
                alt=""
                className="h-44 w-full object-cover"
              />
              <div className="p-5">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#eef1f8] text-[#0b1b46]">
                  <StoreIcon name="package" className="h-[18px] w-[18px]" />
                </span>
                <h3 className="font-display mt-4 text-base font-bold">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-[#64748b]">
                  {item.description}
                </p>
                <Button
                  to="/products"
                  variant="primary"
                  className="mt-4 py-2 text-xs"
                >
                  {item.action}
                </Button>
              </div>
            </StoreCard>
          ))}
        </div>
      </div>
    </section>
  </div>
);

export default HomePage;
