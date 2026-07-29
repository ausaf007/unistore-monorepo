import type { DiscountCode } from "@uniblox/shared";
import { ApiRequestError, formatCents } from "../api/client.js";
import { useGenerateDiscountCode, useStats } from "../api/hooks.js";

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: DiscountCode["status"] }) {
  return status === "active" ? (
    <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
      Active
    </span>
  ) : (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
      Used
    </span>
  );
}

export function AdminPage() {
  const stats = useStats();
  const generate = useGenerateDiscountCode();

  if (stats.isPending) {
    return <p className="text-slate-500">Loading stats…</p>;
  }
  if (stats.isError) {
    return <p className="text-red-600">Failed to load stats.</p>;
  }

  const generateError =
    generate.error instanceof ApiRequestError ? generate.error.message : null;

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-4 text-xl font-semibold">Store overview</h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatTile
            label="Items purchased"
            value={stats.data.itemsPurchasedCount.toLocaleString("en-US")}
          />
          <StatTile
            label="Revenue"
            value={formatCents(stats.data.totalRevenueCents)}
          />
          <StatTile
            label="Discounts given"
            value={formatCents(stats.data.totalDiscountGivenCents)}
          />
          <StatTile
            label="Discount codes"
            value={stats.data.discountCodes.length.toLocaleString("en-US")}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xl font-semibold">Discount codes</h2>
        <button
          type="button"
          onClick={() => generate.mutate()}
          disabled={generate.isPending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
        >
          {generate.isPending ? "Generating…" : "Generate discount code"}
        </button>

        {generate.isSuccess && (
          <p className="mt-3 rounded-md bg-green-50 p-3 text-sm text-green-800">
            New code:{" "}
            <code className="font-mono font-semibold">
              {generate.data.discountCode.code}
            </code>{" "}
            ({generate.data.discountCode.percentOff}% off)
          </p>
        )}
        {generateError && (
          <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            {generateError}
          </p>
        )}

        {stats.data.discountCodes.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No codes generated yet.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="px-4 py-2 font-medium">Code</th>
                  <th className="px-4 py-2 font-medium">Discount</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Used on order</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.data.discountCodes.map((code) => (
                  <tr key={code.code}>
                    <td className="px-4 py-2 font-mono">{code.code}</td>
                    <td className="px-4 py-2 tabular-nums">
                      {code.percentOff}%
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge status={code.status} />
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                      {code.usedOnOrderId ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
