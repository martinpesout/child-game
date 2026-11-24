import { LEVEL4_MAZES } from '../../src/levels/level4Mazes';
import { MazeGrid } from '../../src/levels/maze';

it('obě bludiště jsou řešitelná ze vstupu k východu', () => {
  for (const d of LEVEL4_MAZES) expect(new MazeGrid(d).solvable()).toBe(true);
});

it('velikosti ~14×7 a ~16×8, všechny řádky stejně dlouhé', () => {
  const [a, b] = LEVEL4_MAZES;
  expect(a.rows.length).toBe(7);
  expect(a.rows[0].length).toBe(14);
  expect(b.rows.length).toBe(8);
  expect(b.rows[0].length).toBe(16);
  for (const d of LEVEL4_MAZES) for (const r of d.rows) expect(r.length).toBe(d.rows[0].length);
});

it('řada 0 jsou kořeny kromě jediného východu', () => {
  for (const d of LEVEL4_MAZES) {
    expect(d.rows[0].replace(/R/g, '')).toBe('E');
  }
});

it('truhla 2×2 v bludišti 1, dinosaurus aspoň 5×2 v bludišti 2', () => {
  const [a, b] = LEVEL4_MAZES;
  expect(a.bigs.find((x) => x.kind === 'chest')).toMatchObject({ w: 2, h: 2 });
  const dino = b.bigs.find((x) => x.kind === 'dino')!;
  expect(dino.w).toBeGreaterThanOrEqual(5);
  expect(dino.h).toBeGreaterThanOrEqual(2);
});

it('každé má 1 bonus a kamaráda (žížala / brouček)', () => {
  const [a, b] = LEVEL4_MAZES;
  expect(a.items).toHaveLength(1);
  expect(b.items).toHaveLength(1);
  expect(a.friends.map((f) => f.kind)).toEqual(['worm']);
  expect(b.friends.map((f) => f.kind)).toEqual(['beetle']);
});

it('velké věci nepřekrývají vstup, východ, dobroty ani kamarády a leží v hlíně', () => {
  for (const d of LEVEL4_MAZES) {
    const taken = new Set<string>();
    for (const big of d.bigs) {
      for (let y = big.y; y < big.y + big.h; y++) {
        for (let x = big.x; x < big.x + big.w; x++) {
          const k = `${x},${y}`;
          expect(taken.has(k)).toBe(false);
          taken.add(k);
          expect(d.rows[y][x]).toBe('.');
        }
      }
    }
    const spots = [d.entry, ...d.items, ...d.friends];
    for (const s of spots) expect(taken.has(`${s.x},${s.y}`)).toBe(false);
    for (const it of d.items) expect(d.rows[it.y][it.x]).toBe('.');
    for (const f of d.friends) expect(d.rows[f.y][f.x]).toBe('o');
    expect(d.rows[d.entry.y][d.entry.x]).toBe('o');
  }
});
