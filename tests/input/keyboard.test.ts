import { KeyboardController } from '../../src/input/keyboard';

const key = (type: string, code: string) => window.dispatchEvent(new KeyboardEvent(type, { code }));

it('šipka nahoru + D = diagonála délky 1', () => {
  const k = new KeyboardController(window);
  key('keydown', 'ArrowUp');
  key('keydown', 'KeyD');
  const { x, y } = k.read().move;
  expect(Math.hypot(x, y)).toBeCloseTo(1);
  expect(x).toBeGreaterThan(0);
  expect(y).toBeGreaterThan(0);
  k.dispose();
});

it('mezerník = akce', () => {
  const k = new KeyboardController(window);
  key('keydown', 'Space');
  expect(k.read().action).toBe(true);
  key('keyup', 'Space');
  expect(k.read().action).toBe(false);
  k.dispose();
});

it('blur uvolní všechny klávesy', () => {
  const k = new KeyboardController(window);
  key('keydown', 'ArrowLeft');
  key('keydown', 'Space');
  window.dispatchEvent(new Event('blur'));
  expect(k.read()).toEqual({ move: { x: 0, y: 0 }, action: false });
  k.dispose();
});
