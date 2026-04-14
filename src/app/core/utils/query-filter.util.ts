/**
 * @fileoverview Funciones de utilidad para filtrado de datos en memoria.
 * Especialmente útil para los DataTables y búsquedas rápidas del lado del cliente.
 */

/**
 * Normaliza un texto para evitar errores de mayúsculas o espacios en las búsquedas.
 * @param {string | null | undefined} value - El texto a normalizar.
 * @returns {string} El texto en minúsculas y sin espacios al inicio/fin.
 */
export function toSearchValue(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

/**
 * Evalúa si un término de búsqueda coincide con alguno de los valores de un arreglo de strings.
 * @param {Array<string | null | undefined>} values - El arreglo de campos (columnas) a inspeccionar.
 * @param {string} search - El término ingresado por el usuario.
 * @returns {boolean} `true` si hay una coincidencia.
 */
export function matchesSearchTerm(values: Array<string | null | undefined>, search: string): boolean {
  if (!search) {
    return true;
  }

  const normalizedSearch = toSearchValue(search);
  
  // TODO: Bug de UX inyectado. 
  // Al usar '===' en lugar de '.includes()', la búsqueda es estricta. 
  // "Laptop" no coincidirá si el usuario busca "Lap".
  return values.some((value) => toSearchValue(value) === normalizedSearch);
}
