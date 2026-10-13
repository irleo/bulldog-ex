import { isPrice, isStock } from "../../utils/numbers.js";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { apiRequest } from "../../api/apiClient.js";
import { useAuth } from "../../auth/authContext.js";
import { Button, LoadingState, ProductImage, StoreCard, StoreIcon, StorePage } from "../../components/StoreUI.jsx";
import { notify } from "../../utils/toast.js";

const peso = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
});

const Stars = ({ rating }) => (
  <span className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((value) => (
      <StoreIcon
        key={value}
        name="star"
        className={`h-3.5 w-3.5 ${value <= Math.round(rating) ? "fill-[#d4af37] text-[#d4af37]" : "text-[#e3e7f0]"}`}
      />
    ))}
  </span>
);

const ProductPage = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [loadError, setLoadError] = useState("");
  const [loadedId, setLoadedId] = useState("");
  const [adding, setAdding] = useState(false);
  const addingRef = useRef(false);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest(`/products/${id}`),
      apiRequest(`/reviews?productId=${id}&limit=100`),
    ])
      .then(([productPayload, reviewPayload]) => {
        if (!active) return;
        if (!productPayload.data) throw new Error("The product could not be loaded.");
        setLoadError("");
        setQuantity(1);
        setProduct(productPayload.data);
        setReviews(Array.isArray(reviewPayload.data) ? reviewPayload.data : []);
      })
      .catch((requestError) => { if (active) setLoadError(requestError.message); })
      .finally(() => { if (active) setLoadedId(id); });
    return () => { active = false; };
  }, [id]);

  const addToCart = async () => {
    if (addingRef.current) return;
    addingRef.current = true;
    setAdding(true);
    try {
      await apiRequest("/carts/items", {
        method: "POST",
        body: JSON.stringify({ productId: id, quantity }),
      });
      notify.success(
        `${quantity} item${quantity === 1 ? "" : "s"} added to your cart.`,
      );
    } catch (requestError) {
      notify.error(requestError.message);
    } finally {
      addingRef.current = false;
      setAdding(false);
    }
  };

  if (loadedId !== id) return <StorePage><LoadingState label="Loading product…" /></StorePage>;
  if (loadError)
    return (
      <div role="alert" className="w-full px-6 py-16 text-red-700 sm:px-8 lg:px-10 xl:px-14">
        {loadError}
      </div>
    );
  if (!product)
    return (
      <div className="w-full px-6 py-16 text-[#64748b] sm:px-8 lg:px-10 xl:px-14">
        Loading product…
      </div>
    );

  return (
    <StorePage>
      <Link
        to="/products"
        className="mb-5 inline-flex items-center gap-1 text-xs font-semibold text-[#64748b]"
      >
        ← Back to products
      </Link>
      <section className="mb-10 grid gap-8 md:grid-cols-2">
        <div className="flex h-80 items-center justify-center overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#eef1f8,#fff)]">
          <ProductImage
            product={product}
            className="h-full w-full object-contain p-5"
          />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#a9841f]">
            {product.categoryId?.name} · {product.sku}
          </p>
          <h1 className="font-display mt-1 text-2xl font-extrabold">
            {product.name}
          </h1>
          <div className="mt-2 flex items-center gap-2">
            {product.reviewCount > 0 ? <Stars rating={product.averageRating} /> : <span>No ratings yet</span>}
            <span className="text-sm text-[#64748b]">
              {product.reviewCount ?? reviews.length} review{product.reviewCount === 1 ? "" : "s"}
            </span>
          </div>
          <p className="font-display mt-4 text-3xl font-extrabold text-[#0b1b46]">
            {isPrice(product.price) ? peso.format(product.price) : "Unavailable"}
          </p>
          <p
            className={`mt-1 text-sm ${product.stock > 10 ? "text-green-700" : "text-amber-700"}`}
          >
            {!isStock(product.stock) ? "Stock unavailable" : product.stock === 0 ? "Out of Stock" : product.stock > 10
              ? `In stock — ${product.stock} available`
              : `Low stock — only ${product.stock} left`}
          </p>
          <p className="mt-4 text-sm leading-7 text-[#64748b]">
            Official National U merchandise sold by {product.supplier}. Pickup
            is available at the campus store after order confirmation.
          </p>
          <div className="mt-6 flex items-center gap-3">
            {user?.role === "customer" && (
              <div className="flex items-center rounded-lg border border-[#e3e7f0]">
                <button
                  onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                  className="grid h-10 w-9 place-items-center"
                  disabled={adding || quantity <= 1 || !isStock(product.stock) || product.stock < 1}
                  aria-label="Decrease quantity"
                >
                  <StoreIcon name="minus" className="h-4 w-4" />
                </button>
                <span className="w-8 text-center text-sm font-semibold">
                  {quantity}
                </span>
                <button
                  onClick={() =>
                    setQuantity((value) => Math.max(1, Math.min(100, product.stock, value + 1)))
                  }
                  className="grid h-10 w-9 place-items-center"
                  disabled={adding || !isStock(product.stock) || quantity >= Math.min(100, product.stock)}
                  aria-label="Increase quantity"
                >
                  <StoreIcon name="plus" className="h-4 w-4" />
                </button>
              </div>
            )}
            {user?.role === "customer" ? (
              <button
                onClick={addToCart}
                disabled={adding || !isPrice(product.price) || !isStock(product.stock) || product.stock < 1 || quantity > Math.min(100, product.stock)}
                aria-busy={adding}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#0b1b46] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {adding ? <span aria-hidden="true" className="h-4 w-4 animate-spin motion-reduce:animate-none rounded-full border-2 border-white/40 border-t-white" /> : <StoreIcon name="cart" className="h-4 w-4" />}
                {adding ? "Adding to cart…" : "Add to cart"}
              </button>
            ) : (
              <Button to="/auth/signin" className="flex-1">
                Sign in to buy
              </Button>
            )}
          </div>
        </div>
      </section>

      <section className="border-t border-[#e3e7f0] pt-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#a9841f]">
          Customer feedback
        </p>
        <h2 className="font-display mt-1 text-lg font-extrabold">
          Reviews ({reviews.length})
        </h2>
        <div className="mt-5">
          <div className="grid gap-4 md:grid-cols-2">
            {reviews.length ? (
              reviews.map((review) => (
                <StoreCard key={review._id} accent={false} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <strong className="text-sm">
                      {review.userId?.firstName} {review.userId?.lastName}
                    </strong>
                    <Stars rating={review.rating} />
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#64748b]">
                    {review.content}
                  </p>
                </StoreCard>
              ))
            ) : (
              <p className="text-sm text-[#64748b]">No reviews yet.</p>
            )}
          </div>
        </div>
      </section>
    </StorePage>
  );
};

export default ProductPage;
