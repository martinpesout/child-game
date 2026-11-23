import { TouchController } from '../../src/input/touch';

function setup() {
  const el = document.createElement('div');
  document.body.appendChild(el);
  el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 1000, height: 600, right: 1000, bottom: 600, x: 0, y: 0, toJSON() {} }) as DOMRect;
  const c = new TouchController(el);
  const fire = (type: string, id: number, x: number, y: number) =>
    el.dispatchEvent(Object.assign(new Event(type, { bubbles: true }), { pointerId: id, clientX: x, clientY: y, pointerType: 'touch' }));
  return { el, c, fire };
}

it('levý prst řídí joystick, pravý prst současně skok', () => {
  const { c, fire } = setup();
  fire('pointerdown', 1, 200, 400);
  fire('pointermove', 1, 200, 300);
  fire('pointerdown', 2, 800, 400);
  const s = c.read();
  expect(s.move.y).toBeGreaterThan(0.9);
  expect(s.action).toBe(true);
  expect(c.joystickView.active).toBe(true);
});

it('druhý prst na levé půlce joystick nepřebere', () => {
  const { c, fire } = setup();
  fire('pointerdown', 1, 200, 400);
  fire('pointermove', 1, 200, 300);
  fire('pointerdown', 3, 100, 500);
  fire('pointermove', 3, 100, 590);
  expect(c.read().move.y).toBeGreaterThan(0.9);
});

it('puštění pravého prstu ukončí akci', () => {
  const { c, fire } = setup();
  fire('pointerdown', 2, 800, 400);
  fire('pointerup', 2, 800, 400);
  expect(c.read().action).toBe(false);
});

it('pointercancel vynuluje pohyb i akci', () => {
  const { c, fire } = setup();
  fire('pointerdown', 1, 200, 400);
  fire('pointermove', 1, 200, 300);
  fire('pointerdown', 2, 800, 400);
  fire('pointercancel', 1, 200, 300);
  fire('pointercancel', 2, 800, 400);
  expect(c.read()).toEqual({ move: { x: 0, y: 0 }, action: false });
  expect(c.joystickView.active).toBe(false);
});

it('window blur vynuluje pohyb i akci', () => {
  const { c, fire } = setup();
  fire('pointerdown', 1, 200, 400);
  fire('pointermove', 1, 200, 300);
  fire('pointerdown', 2, 800, 400);
  window.dispatchEvent(new Event('blur'));
  expect(c.read()).toEqual({ move: { x: 0, y: 0 }, action: false });
});
