import type { MazeDef } from './maze';

/** Two hand-made digging mazes of level 4 (row 0 = roots under the grass with one exit). */
export const LEVEL4_MAZES: [MazeDef, MazeDef] = [
  {
    rows: [
      'RRRRRRRRRRRRER',
      'o...#....#....',
      '....#....#..#.',
      '.#......#...#.',
      '.#.##.......#.',
      '...#..o.##....',
      '##.....#......',
    ],
    entry: { x: 0, y: 1 },
    bigs: [
      { kind: 'chest', x: 5, y: 1, w: 2, h: 2 },
      { kind: 'boot', x: 10, y: 4, w: 1, h: 1 },
    ],
    items: [{ kind: 'carrot', x: 10, y: 3 }],
    friends: [{ kind: 'worm', x: 6, y: 5 }],
  },
  {
    rows: [
      'RRRRRRRRRRRRRRER',
      '.o..#....#...#..',
      '..#.#.##.#.#.#..',
      '..#...#..#.#....',
      '.##..........##.',
      '....#.......#...',
      '.#..#..##.#..o#.',
      '..#.............',
    ],
    entry: { x: 1, y: 1 },
    bigs: [
      { kind: 'dino', x: 5, y: 4, w: 5, h: 2 },
      { kind: 'can', x: 11, y: 5, w: 1, h: 1 },
      { kind: 'bones', x: 3, y: 3, w: 1, h: 1 },
    ],
    items: [{ kind: 'apple', x: 2, y: 6 }],
    friends: [{ kind: 'beetle', x: 13, y: 6 }],
  },
];
