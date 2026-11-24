import { MazeGrid, toDir, type MazeDef } from '../../src/levels/maze';

const def = (): MazeDef => ({
  rows: [
    'RRRER',
    'o.#..',
    '.....',
  ],
  entry: { x: 0, y: 1 },
  bigs: [{ kind: 'clock', x: 4, y: 2, w: 1, h: 1 }],
  items: [{ kind: 'carrot', x: 1, y: 1 }],
  friends: [{ kind: 'worm', x: 0, y: 2 }],
});

it('hlína potřebuje 2 ťuknutí, pak je políčko volné a dá se do něj přejít', () => {
  const g = new MazeGrid(def());
  expect(g.move(1, 0)).toBe('turned');
  expect(g.dig().result).toBe('cracked');
  const r = g.dig();
  expect(r.result).toBe('dug');
  expect(g.kind(1, 1)).toBe('open');
  expect(g.move(1, 0)).toBe('moved');
  expect(g.pos).toEqual({ x: 1, y: 1 });
});

it('kamínek, velká věc i kořeny nejdou prohrabat ani projít', () => {
  const g = new MazeGrid(def());
  g.move(0, -1);
  expect(g.dig().result).toBe('blocked'); // roots above the entry
  expect(g.move(0, -1)).toBe('blocked');
  g.move(1, 0); g.dig(); g.dig(); g.move(1, 0);
  g.move(1, 0);
  const st = g.dig();
  expect(st.result).toBe('blocked'); // stone at (2,1)
  expect(g.kind(4, 2)).toBe('big');
});

it('velká věc vrátí svůj druh při pokusu o hrabání', () => {
  const g = new MazeGrid(def());
  g.move(0, 1); g.dig(); g.dig(); g.move(0, 1);
  g.move(1, 0); g.dig(); g.dig(); g.move(1, 0);
  g.move(1, 0); g.dig(); g.dig(); g.move(1, 0);
  g.move(1, 0); g.dig(); g.dig(); g.move(1, 0);
  expect(g.pos).toEqual({ x: 3, y: 2 });
  g.move(1, 0);
  const r = g.dig();
  expect(r.result).toBe('blocked');
  expect(r.bigKind).toBe('clock');
});

it('východ jde prohrabat jen ve svém políčku a nastaví exited', () => {
  const g = new MazeGrid(def());
  // (0,1) → (1,1) → (1,2) → (2,2) → (3,2) → (3,1); the exit is above at (3,0)
  g.move(1, 0); g.dig(); g.dig(); g.move(1, 0);
  g.move(0, 1); g.dig(); g.dig(); g.move(0, 1);
  g.move(1, 0); g.dig(); g.dig(); g.move(1, 0);
  g.move(1, 0); g.dig(); g.dig(); g.move(1, 0);
  g.move(0, -1); g.dig(); g.dig(); g.move(0, -1);
  expect(g.pos).toEqual({ x: 3, y: 1 });
  g.move(0, -1);
  expect(g.dig().result).toBe('cracked');
  expect(g.dig().result).toBe('exit');
  expect(g.exited).toBe(true);
});

it('dobrota v políčku se vrátí jen jednou', () => {
  const g = new MazeGrid(def());
  g.move(1, 0);
  g.dig();
  const r = g.dig();
  expect(r.item).toBe('carrot');
  expect(g.dig().result).toBe('nothing');
  expect(g.dig().item).toBeUndefined();
});

it('atEntry a solvable', () => {
  const g = new MazeGrid(def());
  expect(g.atEntry()).toBe(true);
  expect(g.solvable()).toBe(true);
  const blocked = new MazeGrid({ ...def(), rows: ['RRRER', 'o.###', '..###'], bigs: [] });
  expect(blocked.solvable()).toBe(false);
});

it('toDir: šikmý joystick vybere dominantní osu, malá výchylka nic, nahoru = −1', () => {
  expect(toDir({ x: 0.6, y: 0.5 })).toEqual({ x: 1, y: 0 });
  expect(toDir({ x: 0.3, y: 0.7 })).toEqual({ x: 0, y: -1 });
  expect(toDir({ x: -0.2, y: -0.9 })).toEqual({ x: 0, y: 1 });
  expect(toDir({ x: 0.2, y: 0.1 })).toBeNull();
});
