// Shows "Delivers on 14" for a date string like "2026-03-14" from the API.
export function deliveryDay(isoDate: string): string {
  const date = new Date(isoDate);
  return `Delivers on ${date.getDate()}`;
}
