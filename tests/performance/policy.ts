export function percentile(values: number[], fraction: number) {
  if (
    !values.length ||
    fraction <= 0 ||
    fraction > 1 ||
    values.some((v) => !Number.isFinite(v) || v < 0)
  )
    throw new Error('INVALID_SAMPLES');
  return [...values].sort((a, b) => a - b)[Math.ceil(values.length * fraction) - 1]!;
}
/** Each10 rounds has150 requests, exactly45 writes; Viewer index14 only reads. */
export function isWrite(round: number, actor: number) {
  if (!Number.isInteger(round) || round < 0 || !Number.isInteger(actor) || actor < 0 || actor > 14)
    throw new Error('INVALID_SLOT');
  return actor < 14 && ((round % 10) * 14 + actor) % 140 < 45;
}
export function gate(read: number[], write: number[], unexpected: number, requests: number) {
  if (requests < 1 || unexpected < 0 || unexpected > requests) throw new Error('INVALID_COUNTS');
  const readP95 = percentile(read, 0.95),
    writeP95 = percentile(write, 0.95),
    errorRate = unexpected / requests;
  return {
    readP95,
    writeP95,
    errorRate,
    pass: readP95 <= 2000 && writeP95 <= 3000 && errorRate < 0.01,
  };
}
