import { joystickVector } from './joystick';
import type { Controller, InputState } from './types';

export const JOYSTICK_RADIUS = 60;
const DEAD_ZONE = 0.15;

type Pt = { x: number; y: number };
type PEvt = Event & { pointerId: number; clientX: number; clientY: number };

/** Floating joystick on the left half of `el`, action button on the right half. */
export class TouchController implements Controller {
  readonly joystickView = { active: false, origin: { x: 0, y: 0 }, knob: { x: 0, y: 0 } };
  private stickId: number | null = null;
  private actionIds = new Set<number>();
  private current: Pt = { x: 0, y: 0 };

  private readonly onDown = (e: Event) => {
    const p = e as PEvt;
    const r = this.el.getBoundingClientRect();
    const x = p.clientX - r.left;
    const y = p.clientY - r.top;
    if (x < r.width / 2) {
      if (this.stickId !== null) return;
      this.stickId = p.pointerId;
      this.joystickView.active = true;
      this.joystickView.origin = { x, y };
      this.joystickView.knob = { x, y };
      this.current = { x, y };
    } else {
      this.actionIds.add(p.pointerId);
    }
    (this.el as Element & { setPointerCapture?: (id: number) => void }).setPointerCapture?.call(this.el, p.pointerId);
    e.preventDefault?.();
  };

  private readonly onMove = (e: Event) => {
    const p = e as PEvt;
    if (p.pointerId !== this.stickId) return;
    const r = this.el.getBoundingClientRect();
    this.current = { x: p.clientX - r.left, y: p.clientY - r.top };
    const o = this.joystickView.origin;
    const dx = this.current.x - o.x;
    const dy = this.current.y - o.y;
    const len = Math.hypot(dx, dy);
    const k = len > JOYSTICK_RADIUS ? JOYSTICK_RADIUS / len : 1;
    this.joystickView.knob = { x: o.x + dx * k, y: o.y + dy * k };
  };

  private readonly onUp = (e: Event) => {
    const p = e as PEvt;
    if (p.pointerId === this.stickId) this.releaseStick();
    this.actionIds.delete(p.pointerId);
  };

  private readonly onBlur = () => this.reset();

  constructor(private readonly el: HTMLElement) {
    el.addEventListener('pointerdown', this.onDown);
    el.addEventListener('pointermove', this.onMove);
    el.addEventListener('pointerup', this.onUp);
    el.addEventListener('pointercancel', this.onUp);
    window.addEventListener('blur', this.onBlur);
  }

  read(): InputState {
    const move = this.stickId === null ? { x: 0, y: 0 } : joystickVector(this.joystickView.origin, this.current, JOYSTICK_RADIUS, DEAD_ZONE);
    return { move, action: this.actionIds.size > 0 };
  }

  reset(): void {
    this.releaseStick();
    this.actionIds.clear();
  }

  dispose(): void {
    this.el.removeEventListener('pointerdown', this.onDown);
    this.el.removeEventListener('pointermove', this.onMove);
    this.el.removeEventListener('pointerup', this.onUp);
    this.el.removeEventListener('pointercancel', this.onUp);
    window.removeEventListener('blur', this.onBlur);
  }

  private releaseStick(): void {
    this.stickId = null;
    this.joystickView.active = false;
  }
}
