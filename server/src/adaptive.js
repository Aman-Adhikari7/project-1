// Adaptive practice: pick an unseen question whose difficulty is closest to the student's current level.
const ORDER = ["easy", "medium", "hard"];

export function pickNext(pool, level, seen) {
  const left = pool.filter((q) => !seen.includes(q.id));
  if (!left.length) return null;
  const want = Math.max(0, ORDER.indexOf(level));
  const gap = (q) => Math.abs(ORDER.indexOf(q.difficulty) - want);
  const best = Math.min(...left.map(gap));
  const close = left.filter((q) => gap(q) === best);
  return close[Math.floor(Math.random() * close.length)];
}
