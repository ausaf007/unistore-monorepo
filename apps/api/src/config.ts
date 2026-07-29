// Discount rules R2 (v1-build-plan.md): every nth order unlocks a code for
// percentOff% — configurable here, injectable in tests via createApp/services.
export interface AppConfig {
  discountN: number;
  discountPercentOff: number;
}

export const defaultConfig: AppConfig = {
  discountN: Number(process.env.DISCOUNT_N ?? 5),
  discountPercentOff: Number(process.env.DISCOUNT_PERCENT ?? 10),
};
