import { useAddToCart, useProducts } from "../api/hooks.js";
import { ProductCard } from "../components/ProductCard.js";

export function StorePage() {
  const products = useProducts();
  const addToCart = useAddToCart();

  if (products.isPending) {
    return <p className="text-slate-500">Loading products…</p>;
  }
  if (products.isError) {
    return <p className="text-red-600">Failed to load products.</p>;
  }

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Products</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.data.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onAdd={(productId) =>
              addToCart.mutate({ productId, quantity: 1 })
            }
            isAdding={addToCart.isPending}
          />
        ))}
      </div>
    </div>
  );
}
