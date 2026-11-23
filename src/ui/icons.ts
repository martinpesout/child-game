import type { ItemKind } from '../levels/level1Data';

/** Small inline SVG icons used in the HUD and screens. */
export const ICONS: Record<ItemKind | 'star' | 'sound' | 'mute' | 'pause' | 'jump', string> = {
  nut: '<svg viewBox="0 0 40 40"><ellipse cx="20" cy="24" rx="12" ry="13" fill="#b5743d"/><ellipse cx="20" cy="15" rx="13" ry="7" fill="#e9c48f"/><circle cx="20" cy="8.5" r="2.5" fill="#7a4a26"/><ellipse cx="15" cy="26" rx="3" ry="5" fill="#c98a52" opacity=".6"/></svg>',
  strawberry: '<svg viewBox="0 0 40 40"><path d="M20 37C10 30 6 22 8 15c2-5 8-6 12-4 4-2 10-1 12 4 2 7-2 15-12 22z" fill="#e8344a"/><path d="M12 10l4 3 4-5 4 5 4-3-2 5H14z" fill="#4caf50"/><g fill="#fff3a0"><circle cx="15" cy="20" r="1.2"/><circle cx="24" cy="19" r="1.2"/><circle cx="19" cy="26" r="1.2"/><circle cx="26" cy="26" r="1.2"/><circle cx="14" cy="27" r="1.2"/></g></svg>',
  carrot: '<svg viewBox="0 0 40 40"><path d="M9 33L28 14c3 3 3 7 0 10L13 35c-2 1-5 0-4-2z" fill="#ff8c2b"/><path d="M27 13c0-5 3-8 6-8-1 3-1 5-3 7 3-1 6 0 7 2-3 1-6 1-8 1z" fill="#4caf50"/></svg>',
  apple: '<svg viewBox="0 0 40 40"><path d="M20 12c-4-3-12-2-13 7-1 8 5 17 9 17 2 0 3-1 4-1s2 1 4 1c4 0 10-9 9-17-1-9-9-10-13-7z" fill="#e53935"/><path d="M20 12c0-3 1-5 2-6" stroke="#6d4c41" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M22 9c3-4 7-3 8-2-2 3-5 3-8 2z" fill="#66bb6a"/></svg>',
  star: '<svg viewBox="0 0 40 40"><path d="M20 3l5.2 10.6 11.7 1.7-8.5 8.2 2 11.6L20 29.6 9.6 35.1l2-11.6-8.5-8.2 11.7-1.7z" fill="currentColor" stroke="#b8860b" stroke-width="2" stroke-linejoin="round"/></svg>',
  sound: '<svg viewBox="0 0 40 40"><path d="M8 15h6l8-7v24l-8-7H8z" fill="currentColor"/><path d="M27 13c3 4 3 10 0 14M31 9c5 6 5 16 0 22" stroke="currentColor" stroke-width="3" fill="none" stroke-linecap="round"/></svg>',
  mute: '<svg viewBox="0 0 40 40"><path d="M8 15h6l8-7v24l-8-7H8z" fill="currentColor"/><path d="M27 15l9 10M36 15l-9 10" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>',
  pause: '<svg viewBox="0 0 40 40"><rect x="11" y="9" width="6" height="22" rx="2" fill="currentColor"/><rect x="23" y="9" width="6" height="22" rx="2" fill="currentColor"/></svg>',
  jump: '<svg viewBox="0 0 40 40"><path d="M20 8l11 12h-7v12h-8V20H9z" fill="currentColor" stroke-linejoin="round"/></svg>',
};
