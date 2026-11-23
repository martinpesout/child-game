/** Speech bubble (HTML) that follows a point on screen; has a replay (speaker) button. */
export interface Bubble {
  update(): void;
  hide(): void;
}

export function showBubble(layer: HTMLElement, text: string, anchor: () => { x: number; y: number } | null, onReplay: () => void): Bubble {
  const el = document.createElement('div');
  el.className = 'bubble';
  const p = document.createElement('p');
  p.textContent = text;
  const btn = document.createElement('button');
  btn.className = 'bubble-replay';
  btn.setAttribute('aria-label', 'Přečíst znovu');
  btn.textContent = '🔊';
  btn.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    onReplay();
  });
  el.append(p, btn);
  layer.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));

  const place = () => {
    const a = anchor();
    if (!a) {
      el.style.visibility = 'hidden';
      return;
    }
    el.style.visibility = 'visible';
    const x = Math.max(el.offsetWidth / 2 + 12, Math.min(window.innerWidth - el.offsetWidth / 2 - 12, a.x));
    const y = Math.max(el.offsetHeight + 12, a.y);
    el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
  };
  place();
  return {
    update: place,
    hide() {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 250);
    },
  };
}
