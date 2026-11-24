import { Screens } from '../../src/ui/screens';
import { ICONS } from '../../src/ui/icons';

const make = () => {
  const root = document.createElement('div');
  const s = new Screens(root, { onPause: () => {}, onToggleMute: () => false });
  return { root, s };
};

it('setAction vymění ikonu akčního tlačítka', () => {
  const { root, s } = make();
  const btn = root.querySelector('.jump-btn')!;
  const first = btn.innerHTML;
  s.setAction('dig');
  expect((btn as HTMLElement).dataset.action).toBe('dig');
  expect(btn.querySelector('svg')).toBeTruthy();
  expect(btn.innerHTML).not.toBe(first);
  const paw = btn.innerHTML;
  s.setAction('enter');
  expect(btn.innerHTML).not.toBe(paw);
  s.setAction('jump');
  expect(btn.innerHTML).toBe(first);
  expect(ICONS.paw).toContain('svg');
});
