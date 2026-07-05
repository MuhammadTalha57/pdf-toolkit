export function parsePageRanges(
  input: string,
  totalPages: number,
): [number, number][] {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Enter at least one page or page range.");
  }

  const ranges: [number, number][] = [];

  for (const rawPart of trimmed.split(",")) {
    const part = rawPart.trim();
    if (!part) continue;

    const rangeMatch = part.match(/^(\d+)\s*-\s*(\d+)$/);
    const singleMatch = part.match(/^(\d+)$/);

    let start1Based: number;
    let end1Based: number;

    if (rangeMatch) {
      start1Based = Number(rangeMatch[1]);
      end1Based = Number(rangeMatch[2]);
    } else if (singleMatch) {
      start1Based = end1Based = Number(singleMatch[1]);
    } else {
      throw new Error(
        `"${part}" isn't a valid page or range. Use a page number or a range like 3-5.`,
      );
    }

    if (start1Based < 1 || end1Based < 1) {
      throw new Error("Page numbers start at 1.");
    }
    if (end1Based > totalPages) {
      throw new Error(
        `Page ${end1Based} doesn't exist — this PDF has ${totalPages} page${totalPages === 1 ? "" : "s"}.`,
      );
    }
    if (start1Based > end1Based) {
      throw new Error(`"${part}" — the range is backwards.`);
    }

    ranges.push([start1Based - 1, end1Based - 1]);
  }

  if (ranges.length === 0) {
    throw new Error("Enter at least one page or page range.");
  }

  return ranges;
}