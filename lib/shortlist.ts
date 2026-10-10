export function shortlistIds(value: string): string[] {
  try {
    const ids: unknown = JSON.parse(value);
    return Array.isArray(ids)
      ? [
          ...new Set(
            ids.filter(
              (id): id is string =>
                typeof id === "string" && /^[a-f0-9-]{36}$/i.test(id),
            ),
          ),
        ].slice(0, 3)
      : [];
  } catch {
    return [];
  }
}
export function toggleShortlist(ids: string[], id: string) {
  return ids.includes(id)
    ? ids.filter((x) => x !== id)
    : ids.length < 3
      ? [...ids, id]
      : ids;
}
