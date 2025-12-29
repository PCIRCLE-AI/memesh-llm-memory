/**
 * Money Arithmetic Utilities
 *
 * Uses integer arithmetic to avoid floating-point precision errors.
 * All monetary values are stored as integers in MICRO-DOLLARS (μUSD).
 *
 * Why micro-dollars?
 * - AI API pricing is often in fractions of a cent ($0.000001/token)
 * - Need 6 decimal places precision
 * - 1 USD = 1,000,000 μUSD
 *
 * Example:
 * - $0.15 = 150,000 μUSD
 * - $0.000003 (price per token) = 3 μUSD
 */

/** Micro-dollars (μUSD) - integer type for type safety */
export type MicroDollars = number & { readonly __brand: 'MicroDollars' };

/** Conversion factor: 1 USD = 1,000,000 μUSD */
const MICRO_DOLLARS_PER_DOLLAR = 1_000_000;

/**
 * Convert USD (dollars) to μUSD (micro-dollars)
 *
 * @param dollars - Amount in dollars (can have decimals)
 * @returns Amount in micro-dollars (integer)
 *
 * @example
 * toMicroDollars(1.50)     // 1,500,000 μUSD
 * toMicroDollars(0.000003) // 3 μUSD
 */
export function toMicroDollars(dollars: number): MicroDollars {
  return Math.round(dollars * MICRO_DOLLARS_PER_DOLLAR) as MicroDollars;
}

/**
 * Convert μUSD (micro-dollars) to USD (dollars)
 *
 * @param microDollars - Amount in micro-dollars (integer)
 * @returns Amount in dollars (for display)
 *
 * @example
 * toDollars(1500000)  // 1.50
 * toDollars(3)        // 0.000003
 */
export function toDollars(microDollars: MicroDollars): number {
  return microDollars / MICRO_DOLLARS_PER_DOLLAR;
}

/**
 * Format μUSD as currency string
 *
 * @param microDollars - Amount in micro-dollars
 * @param decimals - Number of decimal places (default: 6 for precision)
 * @returns Formatted string with dollar sign
 *
 * @example
 * formatMoney(1500000)        // "$1.500000"
 * formatMoney(1500000, 2)     // "$1.50"
 * formatMoney(3, 6)           // "$0.000003"
 */
export function formatMoney(microDollars: MicroDollars, decimals: number = 6): string {
  const dollars = toDollars(microDollars);
  return `$${dollars.toFixed(decimals)}`;
}

/**
 * Calculate cost for tokens using integer arithmetic
 *
 * @param tokens - Number of tokens
 * @param pricePerMillionTokens - Price per 1M tokens in USD
 * @returns Cost in micro-dollars (integer)
 *
 * @example
 * calculateTokenCost(1000, 3.0)  // $0.003 = 3,000 μUSD
 * calculateTokenCost(500000, 15.0) // $7.50 = 7,500,000 μUSD
 */
export function calculateTokenCost(
  tokens: number,
  pricePerMillionTokens: number
): MicroDollars {
  // Convert price to μUSD per million tokens
  const priceInMicroDollars = toMicroDollars(pricePerMillionTokens);

  // Calculate: (tokens / 1,000,000) * priceInMicroDollars
  // Rearrange to avoid division: (tokens * priceInMicroDollars) / 1,000,000
  const costInMicroDollars = Math.round((tokens * priceInMicroDollars) / 1_000_000);

  return costInMicroDollars as MicroDollars;
}

/**
 * Add multiple costs (safe integer addition)
 *
 * @param costs - Array of costs in micro-dollars
 * @returns Total cost in micro-dollars
 */
export function addCosts(...costs: MicroDollars[]): MicroDollars {
  return costs.reduce((sum, cost) => sum + cost, 0) as MicroDollars;
}

/**
 * Calculate percentage of budget used
 *
 * @param spent - Amount spent in micro-dollars
 * @param budget - Total budget in micro-dollars
 * @returns Percentage (0-100)
 */
export function calculateBudgetPercentage(
  spent: MicroDollars,
  budget: MicroDollars
): number {
  if (budget === 0) return 0;
  return (spent / budget) * 100;
}
