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

it('kolečko: iris(0.5, x, y) ukáže vrstvu s kruhem, iris(null) ji skryje', () => {
  const { root, s } = make();
  s.iris(0.5, 0.3, 0.4);
  const layer = root.querySelector('.iris') as HTMLElement;
  expect(layer.classList.contains('on')).toBe(true);
  expect(layer.style.background).toContain('radial-gradient');
  s.iris(null, 0, 0);
  expect(layer.classList.contains('on')).toBe(false);
});

it('šipka k východu se ukáže jen s údaji', () => {
  const { root, s } = make();
  s.exitArrow({ x: 0.9, y: 0.1, angle: 0.5 });
  const a = root.querySelector('.exit-arrow') as HTMLElement;
  expect(a.classList.contains('on')).toBe(true);
  s.exitArrow(null);
  expect(a.classList.contains('on')).toBe(false);
});

it('změna akce na hrabání tlačítko rozpulzuje a nad křečkem ukáže bublinku s tlapkou', () => {
  const { root, s } = make();
  const btn = root.querySelector('.jump-btn') as HTMLElement;
  s.setAction('dig');
  expect(btn.classList.contains('attention')).toBe(true);
  s.actionBadge('dig', 0.5, 0.4);
  const badge = root.querySelector('.action-badge') as HTMLElement;
  expect(badge.classList.contains('on')).toBe(true);
  expect(parseFloat(badge.style.left)).toBe(50);
  s.setAction('jump');
  expect(btn.classList.contains('attention')).toBe(false);
  s.actionBadge(null, 0, 0);
  expect(badge.classList.contains('on')).toBe(false);
});

it('konec hry ukáže text a součet hvězd; tlačítko vede na mapu', () => {
  const { root, s } = make();
  const onMap = vi.fn();
  s.gameEnd(12, 15, onMap);
  expect(root.textContent).toContain('Křeček je doma');
  expect(root.textContent).toContain('12');
  (root.querySelector('.panel button') as HTMLButtonElement).click();
  expect(onMap).toHaveBeenCalled();
});

it('lišta s různými ikonami úseků a nápověda ✋ u kocoura', () => {
  const { root, s } = make();
  s.setGoalIcons(['hoop', 'stone', 'paw', 'cat', 'house']);
  expect(root.querySelectorAll('.slots.nuts .slot')).toHaveLength(5);
  s.catHint(true);
  expect(root.querySelector('.cat-hint')!.classList.contains('on')).toBe(true);
  s.catHint(false);
  expect(root.querySelector('.cat-hint')!.classList.contains('on')).toBe(false);
});
