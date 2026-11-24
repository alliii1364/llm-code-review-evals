import { toCents } from "./money.js";

// Total of a cart in cents. Each item is { price: dollars, qty: number }.
export function total(items) {
  return items.reduce((sum, item) => sum + toCents(item.price) * item.qty, 0);
}
