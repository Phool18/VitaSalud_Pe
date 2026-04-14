export function generateYearlyCode(prefix: string, existingCodes: string[], date = new Date()): string {
  const year = date.getFullYear();
  const regex = new RegExp(`^${prefix}-${year}-(\\d{4})$`);

  const maxSequence = existingCodes.reduce((max, code) => {
    const match = code.match(regex);
    if (!match) {
      return max;
    }

    return Math.max(max, Number(match[1]));
  }, 0);

  const next = String(maxSequence + 1).padStart(4, '0');
  return `${prefix}-${year}-${next}`;
}
