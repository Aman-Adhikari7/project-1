// How suspicious behaviour turns into an integrity score (100 = clean).
// w = points lost each time, max = how many times it counts, so noise can't zero a student.
export const WEIGHTS = {
  tab_hidden:     { w: 5, max: 5 },  // switched tab or minimised the browser
  window_blur:    { w: 2, max: 5 },  // clicked into another window
  fullscreen_exit:{ w: 5, max: 4 },
  paste_attempt:  { w: 4, max: 5 },
  copy_attempt:   { w: 2, max: 5 },
  context_menu:   { w: 1, max: 5 },
  resize:         { w: 2, max: 4 },
  bulk_insert:    { w: 8, max: 3 },  // a large chunk of text appeared at once
  low_keystrokes: { w: 8, max: 3 },  // long answer typed with very few keystrokes
};

export function integrityScore(events) {
  const counts = {};
  for (const e of events) counts[e.type] = (counts[e.type] || 0) + 1;
  const lost = Object.entries(counts).reduce((sum, [type, n]) => {
    const rule = WEIGHTS[type];
    return rule ? sum + rule.w * Math.min(n, rule.max) : sum;
  }, 0);
  return Math.max(0, 100 - lost);
}
