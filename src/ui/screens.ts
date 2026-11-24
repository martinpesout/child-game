import type { ItemKind } from '../levels/level1Data';
import { ICONS } from './icons';

const BONUS_ORDER: ItemKind[] = ['strawberry', 'carrot', 'apple'];

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

function button(label: string, cls: string, onTap: () => void): HTMLButtonElement {
  const b = el('button', `btn ${cls}`);
  b.textContent = label;
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    onTap();
  });
  return b;
}

/** All HTML overlays: menus, HUD, touch controls. */
export class Screens {
  private readonly panel: HTMLDivElement;
  private readonly hud: HTMLDivElement;
  private goalSlots: HTMLDivElement[] = [];
  private readonly goalBar: HTMLDivElement;
  private readonly bonusSlots = new Map<ItemKind, HTMLDivElement>();
  private readonly controls: HTMLDivElement;
  private readonly stickBase: HTMLDivElement;
  private readonly stickKnob: HTMLDivElement;
  private readonly jumpBtn: HTMLDivElement;
  private readonly muteBtn: HTMLButtonElement;
  readonly bubbleLayer: HTMLDivElement;
  private readonly fader: HTMLDivElement;
  private actionVal = 'jump';

  constructor(root: HTMLElement, handlers: { onPause: () => void; onToggleMute: () => boolean }) {
    this.bubbleLayer = el('div', 'layer');
    this.controls = el('div', 'controls hidden');
    this.stickBase = el('div', 'stick-base');
    this.stickKnob = el('div', 'stick-knob');
    this.stickBase.appendChild(this.stickKnob);
    this.jumpBtn = el('div', 'jump-btn', ICONS.jump);
    this.controls.append(this.stickBase, this.jumpBtn);

    this.hud = el('div', 'hud hidden');
    const nuts = el('div', 'slots nuts');
    this.goalBar = nuts;
    this.setGoal('nut', 10);
    const bonus = el('div', 'slots bonus');
    for (const k of BONUS_ORDER) {
      const s = el('div', 'slot', ICONS[k]);
      bonus.appendChild(s);
      this.bonusSlots.set(k, s);
    }
    const tools = el('div', 'tools');
    this.muteBtn = el('button', 'round-btn', ICONS.sound);
    this.muteBtn.setAttribute('aria-label', 'Zvuk');
    this.muteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.setMuted(handlers.onToggleMute());
    });
    const pause = el('button', 'round-btn', ICONS.pause);
    pause.setAttribute('aria-label', 'Pauza');
    pause.addEventListener('click', (e) => {
      e.stopPropagation();
      handlers.onPause();
    });
    tools.append(this.muteBtn, pause);
    this.hud.append(nuts, bonus, tools);

    this.panel = el('div', 'panel');
    const rotate = el('div', 'rotate', '<div class="rotate-icon">📱</div><p>Otoč tablet</p>');
    this.fader = el('div', 'fader');
    root.append(this.controls, this.hud, this.bubbleLayer, this.fader, this.panel, rotate);
  }

  setMuted(m: boolean): void {
    this.muteBtn.innerHTML = m ? ICONS.mute : ICONS.sound;
  }

  /** Level map: a winding trail of levels with stars, locks and the hamster at the furthest one. */
  map(levels: { id: number; name: string; ready: boolean }[], progress: { isUnlocked(n: number): boolean; best(n: number): number; current(): number }, onPick: (id: number) => void): void {
    this.setPlaying(false);
    const trail = el('div', 'trail');
    // the hamster waits at the furthest level that can actually be played
    const here = Math.max(...levels.filter((l) => l.ready && progress.isUnlocked(l.id)).map((l) => l.id));
    levels.forEach((lv, i) => {
      const open = lv.ready && progress.isUnlocked(lv.id);
      const stop = el('button', `stop ${open ? 'open' : 'locked'} ${i % 2 ? 'low' : 'high'}`);
      stop.setAttribute('aria-label', lv.name);
      const badge = el('div', 'badge', open ? `<span>${lv.id}</span>` : ICONS.lock);
      if (open && here === lv.id) badge.appendChild(el('div', 'here', ICONS.hamster));
      const stars = el('div', 'mini-stars');
      for (let k = 0; k < 3; k++) stars.appendChild(el('div', `mini-star ${k < progress.best(lv.id) ? 'on' : ''}`, ICONS.star));
      stop.append(badge, el('div', 'stop-name', lv.ready ? lv.name : `${lv.name}<small>už brzy</small>`), open ? stars : el('div', ''));
      if (open) stop.addEventListener('click', (e) => { e.stopPropagation(); onPick(lv.id); });
      trail.appendChild(stop);
    });
    const card = el('div', 'map-card');
    card.append(el('h2', '', 'Kam se křeček vydá?'), trail);
    this.show('dim', [card]);
  }

  title(onPlay: () => void): void {
    this.setPlaying(false);
    this.show('title-screen', [el('h1', 'game-title', 'Křečkova<br>cesta'), button('Hrát', 'big', onPlay)]);
  }

  story(text: string, onNext: () => void): void {
    this.setPlaying(false);
    const card = el('div', 'card story');
    card.append(el('p', 'story-text', text), button('Jdeme!', 'big', onNext));
    this.show('dim', [card], onNext);
  }

  playing(): void {
    this.clearPanel();
    this.setPlaying(true);
  }

  paused(onResume: () => void, onRetry: () => void, chase: boolean, onToggleCamera: () => boolean, onMap: () => void): void {
    const card = el('div', 'card');
    const label = (c: boolean) => (c ? 'Kamera: za křečkem' : 'Kamera: pevná');
    const cam = button(label(chase), 'small', () => {
      cam.textContent = label(onToggleCamera());
    });
    const row = el('div', 'row');
    row.append(button('Znovu', '', onRetry), button('Mapa', '', onMap));
    card.append(el('h2', '', 'Pauza'), button('Hrát dál', 'big', onResume), row, cam);
    this.show('dim', [card]);
  }

  levelEnd(stars: number, onRetry: () => void, onNext: () => void, onMap: () => void): void {
    this.setPlaying(false);
    const card = el('div', 'card end');
    const row = el('div', 'stars');
    for (let i = 0; i < 3; i++) {
      const s = el('div', `star ${i < stars ? 'on' : ''}`, ICONS.star);
      s.style.animationDelay = `${0.3 + i * 0.35}s`;
      row.appendChild(s);
    }
    const btns = el('div', 'row');
    btns.append(button('Znovu', '', onRetry), button('Mapa', '', onMap), button('Dál', 'big', onNext));
    card.append(el('h2', '', 'Hurá!'), row, btns);
    this.show('dim', [card]);
  }

  /** Action button icon: jump, paw (dig) or into the hole (enter). */
  setAction(mode: 'jump' | 'dig' | 'enter'): void {
    if (mode === this.actionVal) return;
    this.actionVal = mode;
    this.jumpBtn.dataset.action = mode;
    this.jumpBtn.innerHTML = mode === 'dig' ? ICONS.paw : mode === 'enter' ? ICONS.enter : ICONS.jump;
  }

  /** Short dip to dark (e.g. when the hamster is put back after a splash). */
  fade(): void {
    this.fader.classList.remove('on');
    void this.fader.offsetWidth; // restart the animation
    this.fader.classList.add('on');
  }

  comingSoon(onHome: () => void): void {
    const card = el('div', 'card');
    card.append(el('h2', '', 'Další dobrodružství už brzy!'), button('Zpět na mapu', 'big', onHome));
    this.show('dim', [card]);
  }

  /** Goal row in the HUD: `total` outlines of the goal icon (nuts, hoops…). */
  setGoal(icon: string, total: number): void {
    this.goalBar.replaceChildren();
    this.goalSlots = Array.from({ length: total }, () => {
      const s = el('div', 'slot', ICONS[icon as keyof typeof ICONS] ?? ICONS.nut);
      this.goalBar.appendChild(s);
      return s;
    });
  }

  resetHud(): void {
    this.goalSlots.forEach((s) => s.classList.remove('filled'));
    this.bonusSlots.forEach((s) => s.classList.remove('filled'));
  }

  fillGoal(index: number): void {
    this.goalSlots[index]?.classList.add('filled');
  }

  fillBonus(kind: ItemKind): void {
    this.bonusSlots.get(kind)?.classList.add('filled');
  }

  updateControls(view: { active: boolean; origin: { x: number; y: number }; knob: { x: number; y: number } }, action: boolean): void {
    if (view.active) {
      this.stickBase.classList.add('active');
      this.stickBase.style.left = `${view.origin.x}px`;
      this.stickBase.style.top = `${view.origin.y}px`;
      this.stickKnob.style.transform = `translate(${view.knob.x - view.origin.x}px, ${view.knob.y - view.origin.y}px)`;
    } else {
      this.stickBase.classList.remove('active');
      this.stickBase.style.left = '';
      this.stickBase.style.top = '';
      this.stickKnob.style.transform = '';
    }
    this.jumpBtn.classList.toggle('pressed', action);
  }

  private setPlaying(on: boolean): void {
    this.hud.classList.toggle('hidden', !on);
    this.controls.classList.toggle('hidden', !on);
  }

  private clearPanel(): void {
    this.panel.className = 'panel';
    this.panel.replaceChildren();
    this.panel.onclick = null;
  }

  private show(cls: string, children: HTMLElement[], onBackdrop?: () => void): void {
    this.clearPanel();
    this.panel.className = `panel open ${cls}`;
    this.panel.append(...children);
    if (onBackdrop) this.panel.onclick = onBackdrop;
  }
}
