/** Invoice numbers are assigned in JS so we never need Prisma `startsWith` on Workers. */
export function nextInvoiceNumberFromExisting(numbers: Iterable<string>, at = new Date()) {
  const year = at.getFullYear();
  const prefix = `INV-${year}-`;
  let max = 0;
  for (const number of numbers) {
    if (!number.startsWith(prefix)) continue;
    const parsed = Number.parseInt(number.slice(prefix.length), 10);
    if (Number.isFinite(parsed) && parsed > max) max = parsed;
  }
  return `${prefix}${String(max + 1).padStart(4, "0")}`;
}
