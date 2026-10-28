// Returns one page of results. `page` starts at 0.
export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = page * pageSize;
  const end = start + pageSize - 1;
  return items.slice(start, end);
}
