import type { Product } from "@uniblox/shared";
import { formatCents } from "../api/client.js";

interface ProductCardProps {
  product: Product;
  onAdd: (productId: string) => void;
  isAdding: boolean;
}

export function ProductCard({ product, onAdd, isAdding }: ProductCardProps) {
  return (
    <div className="flex flex-col rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="font-semibold">{product.name}</h3>
      <p className="mt-1 flex-1 text-sm text-slate-500">
        {product.description}
      </p>
      <div className="mt-4 flex items-center justify-between">
        <span className="font-semibold">{formatCents(product.priceCents)}</span>
        <button
          type="button"
          onClick={() => onAdd(product.id)}
          disabled={isAdding}
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
        >
          Add to cart
        </button>
      </div>
    </div>
  );
}
