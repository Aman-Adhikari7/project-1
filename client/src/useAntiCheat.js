import { useEffect, useRef, useState } from "react";

// Watches the exam page and reports suspicious behaviour to the server.
// The server turns reports into an integrity score. This is deterrence plus evidence, not a guarantee.
export function useAntiCheat({ sock, code, active, currentId }) {
  const supported = typeof document.documentElement.requestFullscreen === "function";
  const [inFullscreen, setInFullscreen] = useState(!!document.fullscreenElement);
  const [warnings, setWarnings] = useState(0);
  const idRef = useRef(currentId);
  idRef.current = currentId;
  const keys = useRef({});          // keystrokes typed per question
  const flagged = useRef(new Set());
  const wasFull = useRef(false);

  // Always points at the newest version, so listeners never use stale values.
  const log = useRef();
  log.current = (type, detail = "") => {
    sock.current?.emit("cheat:event", { code, type, detail });
    setWarnings((w) => w + 1);
  };

  useEffect(() => {
    if (!active) return;
    const L = (...a) => log.current(...a);
    let base = { w: innerWidth, h: innerHeight }, quietUntil = 0, timer;
    wasFull.current = !!document.fullscreenElement;

    const block = (type) => (e) => { e.preventDefault(); L(type); };
    const doc = [
      ["paste", block("paste_attempt")], ["drop", block("paste_attempt")],
      ["copy", block("copy_attempt")], ["cut", block("copy_attempt")],
      ["contextmenu", block("context_menu")], ["dragstart", (e) => e.preventDefault()],
      ["visibilitychange", () => document.hidden && L("tab_hidden")],
      ["fullscreenchange", () => {
        const full = !!document.fullscreenElement;
        setInFullscreen(full);
        quietUntil = Date.now() + 1000; // entering or leaving fullscreen resizes the window; don't count that
        setTimeout(() => { base = { w: innerWidth, h: innerHeight }; }, 1100);
        if (!full && wasFull.current) L("fullscreen_exit");
        wasFull.current = full;
      }],
      ["keydown", (e) => {
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          const id = idRef.current;
          keys.current[id] = (keys.current[id] || 0) + 1;
        }
      }],
    ];
    const onBlur = () => L("window_blur");
    const onResize = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (Date.now() < quietUntil) return;
        const dw = Math.abs(innerWidth - base.w) / base.w, dh = Math.abs(innerHeight - base.h) / base.h;
        if (dw > 0.15 || dh > 0.15) { L("resize", `${innerWidth}x${innerHeight}`); base = { w: innerWidth, h: innerHeight }; }
      }, 400);
    };

    doc.forEach(([n, f]) => document.addEventListener(n, f));
    addEventListener("blur", onBlur);
    addEventListener("resize", onResize);
    return () => {
      doc.forEach(([n, f]) => document.removeEventListener(n, f));
      removeEventListener("blur", onBlur);
      removeEventListener("resize", onResize);
      clearTimeout(timer);
    };
  }, [active]);

  return {
    supported, inFullscreen, warnings,
    enterFullscreen: () => document.documentElement.requestFullscreen?.().catch(() => {}),
    // A long answer typed with very few keystrokes. Answers restored after a refresh are skipped.
    checkTyping(qid, text) {
      const k = keys.current[qid];
      if (typeof text !== "string" || text.length < 40 || k === undefined || flagged.current.has(qid)) return;
      if (k < text.length * 0.3) { flagged.current.add(qid); log.current("low_keystrokes", `${k} keys for ${text.length} characters`); }
    },
    // Many characters appearing in one change, for example drag-and-drop or an autofill tool.
    checkInsert(prev, next) {
      const before = typeof prev === "string" ? prev.length : 0;
      if (typeof next === "string" && next.length - before > 25) log.current("bulk_insert", `+${next.length - before} characters`);
    },
  };
}
