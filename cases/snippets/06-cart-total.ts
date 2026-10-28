// Cart total in dollars, shown at checkout and sent to the payment provider.
export function cartTotal(lines: { price: number; qty: number }[], taxRate: number) {
  let subtotal = 0;
  for (const line of lines) {
    subtotal += line.price * line.qty;
  }
  return subtotal + subtotal * taxRate;
}
