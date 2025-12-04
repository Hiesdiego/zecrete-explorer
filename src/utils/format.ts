// zecrete/src/utils/format.ts

export function formatZEC(zats: number): string {
  const zec = zats / 1e8;
  return `${parseFloat(zec.toFixed(6))} ZEC`;
}
