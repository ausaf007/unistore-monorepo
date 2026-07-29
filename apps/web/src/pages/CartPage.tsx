import { Link } from "react-router-dom";
import { formatCents } from "../api/client.js";
import { useCart } from "../api/hooks.js";

export function CartPage() {
  const cart = useCart();

  if (cart.isPending) {
    return <p className="text-slate-500">Loading cart…</p>;
  }
  if (cart.isError) {
    return <p className="text-red-600">Failed to load cart.</p>;
  }

  if (cart.data.items.length === 0) {
    return (
      <div className="text-center">
        <p className="text-slate-500">Your cart is empty.</p>
        <Link to="/" className="mt-2 inline-block font-medium underline">
          Browse the store
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <h2 className="mb-4 text-xl font-semibold">Your cart</h2>
      <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
        {cart.data.items.map((line) => (
          <li
            key={line.product.id}
            className="flex items-center justify-between px-4 py-3"
          >
            <div>
              <p className="font-medium">{line.product.name}</p>
              <p className="text-sm text-slate-500">
                {line.quantity} × {formatCents(line.product.priceCents)}
              </p>
            </div>
            <span className="font-semibold">
              {formatCents(line.lineTotalCents)}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center justify-between">
        <span className="text-slate-600">Subtotal</span>
        <span className="text-lg font-semibold">
          {formatCents(cart.data.subtotalCents)}
        </span>
      </div>
      <Link
        to="/checkout"
        className="mt-4 block rounded-md bg-slate-900 px-4 py-2 text-center font-medium text-white transition-colors hover:bg-slate-700"
      >
        Proceed to checkout
      </Link>
    </div>
  );
}
