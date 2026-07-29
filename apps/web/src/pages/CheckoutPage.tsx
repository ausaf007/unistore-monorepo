import { useState } from "react";
import type { CheckoutResponse } from "@uniblox/shared";
import { Link } from "react-router-dom";
import { ApiRequestError, formatCents } from "../api/client.js";
import { useCart, useCheckout } from "../api/hooks.js";

export function CheckoutPage() {
  const cart = useCart();
  const checkout = useCheckout();
  const [code, setCode] = useState("");
  const [placed, setPlaced] = useState<CheckoutResponse | null>(null);

  if (placed) {
    const { order, unlockedDiscountEligibility } = placed;
    return (
      <div className="mx-auto max-w-lg rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-green-700">
          Order #{order.orderNumber} placed 🎉
        </h2>
        <dl className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-600">Subtotal</dt>
            <dd>{formatCents(order.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-600">
              Discount{order.discountCode ? ` (${order.discountCode})` : ""}
            </dt>
            <dd>−{formatCents(order.discountCents)}</dd>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-1 font-semibold">
            <dt>Total paid</dt>
            <dd>{formatCents(order.totalCents)}</dd>
          </div>
        </dl>
        {unlockedDiscountEligibility && (
          <p className="mt-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            This order unlocked a new discount code — an admin can now
            generate it.
          </p>
        )}
        <Link to="/" className="mt-4 inline-block font-medium underline">
          Continue shopping
        </Link>
      </div>
    );
  }

  if (cart.isPending) {
    return <p className="text-slate-500">Loading…</p>;
  }
  if (cart.isError) {
    return <p className="text-red-600">Failed to load cart.</p>;
  }
  if (cart.data.items.length === 0) {
    return (
      <div className="text-center">
        <p className="text-slate-500">Nothing to check out.</p>
        <Link to="/" className="mt-2 inline-block font-medium underline">
          Browse the store
        </Link>
      </div>
    );
  }

  const errorMessage =
    checkout.error instanceof ApiRequestError
      ? checkout.error.message
      : checkout.isError
        ? "Checkout failed. Please try again."
        : null;

  return (
    <div className="mx-auto max-w-lg">
      <h2 className="mb-4 text-xl font-semibold">Checkout</h2>
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <ul className="space-y-1 text-sm">
          {cart.data.items.map((line) => (
            <li key={line.product.id} className="flex justify-between">
              <span>
                {line.quantity} × {line.product.name}
              </span>
              <span>{formatCents(line.lineTotalCents)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex justify-between border-t border-slate-200 pt-2 font-semibold">
          <span>Subtotal</span>
          <span>{formatCents(cart.data.subtotalCents)}</span>
        </div>
      </div>

      <form
        className="mt-4"
        onSubmit={(event) => {
          event.preventDefault();
          const discountCode = code.trim();
          checkout.mutate(
            discountCode === "" ? {} : { discountCode },
            { onSuccess: setPlaced },
          );
        }}
      >
        <label className="block text-sm font-medium" htmlFor="discount-code">
          Discount code (optional)
        </label>
        <input
          id="discount-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="e.g. SAVE10-ABC123"
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
        />
        {errorMessage && (
          <p className="mt-2 rounded-md bg-red-50 p-2 text-sm text-red-700">
            {errorMessage}
          </p>
        )}
        <button
          type="submit"
          disabled={checkout.isPending}
          className="mt-4 w-full rounded-md bg-slate-900 px-4 py-2 font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
        >
          {checkout.isPending ? "Placing order…" : "Place order"}
        </button>
      </form>
    </div>
  );
}
