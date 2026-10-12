// Plain-English names for anti-cheat events, shared by the live view and the results pages.
export const LABELS = {
  tab_hidden: "Switched tab or minimised the browser", window_blur: "Window lost focus", fullscreen_exit: "Left fullscreen",
  paste_attempt: "Tried to paste", copy_attempt: "Tried to copy or cut", context_menu: "Opened the right-click menu",
  resize: "Resized the window", bulk_insert: "Large text appeared at once", low_keystrokes: "Long answer typed with few keystrokes",
};
export const level = (n) => (n >= 80 ? "ok" : n >= 50 ? "warn" : "bad");
