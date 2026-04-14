export function toSearchValue(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

/**
 * Evalúa si un término de búsqueda coincide con alguno de los valores del arreglo.
 * FIX: usa .includes() para búsqueda parcial en lugar de === (búsqueda exacta).
 */
export function matchesSearchTerm(values: Array<string | null | undefined>, search: string): boolean {
  if (!search) {
    return true;
  }

  const normalizedSearch = toSearchValue(search);
  return values.some((value) => toSearchValue(value).includes(normalizedSearch));
}
