import { randomInt } from "node:crypto";
import type { DiscountCode } from "@uniblox/shared";
import type { AppConfig } from "../config.js";
import { AppError } from "../errors.js";
import type { InMemoryStore } from "../store/store.js";

// No ambiguous characters (0/O, 1/I/L) — codes get read aloud and retyped.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_SUFFIX_LENGTH = 6;

/**
 * Implements the nth-order discount rules (v1-build-plan.md §2):
 * every nth order globally completes an "eligibility window" (R1/R3), each
 * window entitles the admin to generate exactly one store-wide, single-use
 * code (R3–R5).
 */
export class DiscountService {
  constructor(
    private readonly store: InMemoryStore,
    private readonly config: AppConfig,
  ) {}

  /** Windows completed by order volume: floor(orders / n). */
  private completedWindows(): number {
    return Math.floor(this.store.orders.length / this.config.discountN);
  }

  /**
   * Eligible while fewer codes exist than completed windows. Windows are not
   * lost if the admin generates late — they queue up, one code each.
   */
  isEligible(): boolean {
    return this.store.discountCodes.size < this.completedWindows();
  }

  generateCode(): DiscountCode {
    if (!this.isEligible()) {
      const ordersUntilNext =
        this.config.discountN -
        (this.store.orders.length % this.config.discountN);
      throw new AppError(
        409,
        "DISCOUNT_NOT_ELIGIBLE",
        `Not eligible: a code has been generated for every ${this.config.discountN}th order so far. ` +
          `Next window opens after ${ordersUntilNext} more order(s).`,
      );
    }

    const windowNumber = this.store.discountCodes.size + 1;
    const discountCode: DiscountCode = {
      code: this.buildUniqueCode(),
      percentOff: this.config.discountPercentOff,
      status: "active",
      eligibleAtOrderNumber: windowNumber * this.config.discountN,
      usedOnOrderId: null,
    };
    this.store.discountCodes.set(discountCode.code, discountCode);
    return discountCode;
  }

  /** Returns the code if it exists and is unused; otherwise rejects checkout. */
  validateActive(code: string): DiscountCode {
    const discountCode = this.store.discountCodes.get(code);
    if (!discountCode) {
      throw new AppError(
        400,
        "INVALID_DISCOUNT_CODE",
        `Discount code "${code}" is not valid.`,
      );
    }
    if (discountCode.status === "used") {
      throw new AppError(
        400,
        "INVALID_DISCOUNT_CODE",
        `Discount code "${code}" has already been used.`,
      );
    }
    return discountCode;
  }

  markUsed(code: string, orderId: string): void {
    const discountCode = this.validateActive(code);
    discountCode.status = "used";
    discountCode.usedOnOrderId = orderId;
  }

  private buildUniqueCode(): string {
    let code: string;
    do {
      let suffix = "";
      for (let i = 0; i < CODE_SUFFIX_LENGTH; i++) {
        suffix += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
      }
      code = `SAVE${this.config.discountPercentOff}-${suffix}`;
    } while (this.store.discountCodes.has(code));
    return code;
  }
}
