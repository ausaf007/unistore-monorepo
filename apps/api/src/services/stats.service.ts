import type { Stats } from "@uniblox/shared";
import type { InMemoryStore } from "../store/store.js";

export class StatsService {
  constructor(private readonly store: InMemoryStore) {}

  getStats(): Stats {
    let itemsPurchasedCount = 0;
    let totalRevenueCents = 0;
    let totalDiscountGivenCents = 0;

    for (const order of this.store.orders) {
      for (const line of order.items) {
        itemsPurchasedCount += line.quantity;
      }
      // Revenue = money actually collected, i.e. order totals AFTER
      // discounts; the discounts themselves are reported separately.
      totalRevenueCents += order.totalCents;
      totalDiscountGivenCents += order.discountCents;
    }

    return {
      itemsPurchasedCount,
      totalRevenueCents,
      discountCodes: [...this.store.discountCodes.values()],
      totalDiscountGivenCents,
    };
  }
}
