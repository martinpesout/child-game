import type { ItemKind } from './level1Data';

/** Underground digging maze (pure logic): a grid of soil, stones, roots, big buried things and one exit. */

export type CellKind = 'soil' | 'stone' | 'roots' | 'open' | 'exit' | 'big';
export type BigKind = 'clock' | 'dino' | 'duck' | 'boot' | 'can' | 'bones';

export interface MazeDef {
  /** '.' soil, '#' stone, 'R' roots (solid ceiling), 'E' exit (in the roots row), 'o' open (entry, pockets). */
  rows: string[];
  entry: { x: number; y: number };
  /** Big buried things covering several soil cells (solid, can't be dug). */
  bigs: { kind: BigKind; x: number; y: number; w: number; h: number }[];
  /** Treats hidden in soil cells. */
  items: { kind: ItemKind; x: number; y: number }[];
  /** Friends sitting in open pockets. */
  friends: { kind: 'worm' | 'beetle'; x: number; y: number }[];
}

export interface DigResult {
  result: 'cracked' | 'dug' | 'exit' | 'blocked' | 'nothing';
  x: number;
  y: number;
  item?: ItemKind;
  bigKind?: BigKind;
}

const SOIL_HP = 2;
const CHAR: Record<string, CellKind> = { '.': 'soil', '#': 'stone', R: 'roots', E: 'exit', o: 'open' };

export class MazeGrid {
  readonly cols: number;
  readonly rows: number;
  pos: { x: number; y: number };
  facing = { x: 1, y: 0 };
  exited = false;
  private readonly kinds: CellKind[][];
  private readonly hps: number[][];
  private readonly bigAt = new Map<string, BigKind>();
  private readonly itemAt = new Map<string, ItemKind>();

  constructor(readonly def: MazeDef) {
    this.rows = def.rows.length;
    this.cols = def.rows[0].length;
    this.kinds = def.rows.map((r) => r.split('').map((c) => CHAR[c] ?? 'soil'));
    this.hps = def.rows.map((r) => r.split('').map(() => SOIL_HP));
    for (const b of def.bigs) {
      for (let y = b.y; y < b.y + b.h; y++) {
        for (let x = b.x; x < b.x + b.w; x++) {
          this.kinds[y][x] = 'big';
          this.bigAt.set(`${x},${y}`, b.kind);
        }
      }
    }
    for (const it of def.items) this.itemAt.set(`${it.x},${it.y}`, it.kind);
    this.pos = { ...def.entry };
  }

  kind(x: number, y: number): CellKind | undefined {
    return this.kinds[y]?.[x];
  }

  hp(x: number, y: number): number {
    return this.hps[y]?.[x] ?? 0;
  }

  /** Is a treat still hidden in this cell? */
  itemIn(x: number, y: number): ItemKind | undefined {
    return this.itemAt.get(`${x},${y}`);
  }

  bigKindAt(x: number, y: number): BigKind | undefined {
    return this.bigAt.get(`${x},${y}`);
  }

  /** Turn towards (dx, dy) and step there if it is open. */
  move(dx: number, dy: number): 'moved' | 'turned' | 'blocked' {
    this.facing = { x: dx, y: dy };
    const x = this.pos.x + dx;
    const y = this.pos.y + dy;
    const k = this.kind(x, y);
    if (k === 'open') {
      this.pos = { x, y };
      return 'moved';
    }
    if (k === 'soil' || k === 'exit') return 'turned';
    return 'blocked';
  }

  /** One paw tap on the cell the hamster faces. */
  dig(): DigResult {
    const x = this.pos.x + this.facing.x;
    const y = this.pos.y + this.facing.y;
    const k = this.kind(x, y);
    if (k === 'soil' || k === 'exit') {
      this.hps[y][x]--;
      if (this.hps[y][x] > 0) return { result: 'cracked', x, y };
      this.kinds[y][x] = 'open';
      const key = `${x},${y}`;
      const item = this.itemAt.get(key);
      this.itemAt.delete(key);
      if (k === 'exit') {
        this.exited = true;
        return { result: 'exit', x, y };
      }
      return item ? { result: 'dug', x, y, item } : { result: 'dug', x, y };
    }
    if (k === 'open') return { result: 'nothing', x, y };
    return { result: 'blocked', x, y, bigKind: this.bigAt.get(`${x},${y}`) };
  }

  atEntry(): boolean {
    return this.pos.x === this.def.entry.x && this.pos.y === this.def.entry.y;
  }

  /** Is there a way from the entry to the exit through open cells and soil (stones, bigs, roots block)? */
  solvable(): boolean {
    const seen = new Set<string>();
    const q = [{ ...this.def.entry }];
    seen.add(`${q[0].x},${q[0].y}`);
    while (q.length) {
      const c = q.shift()!;
      if (this.kind(c.x, c.y) === 'exit') return true;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const n = { x: c.x + dx, y: c.y + dy };
        const k = this.kind(n.x, n.y);
        const key = `${n.x},${n.y}`;
        if (seen.has(key) || !k || k === 'stone' || k === 'big' || k === 'roots') continue;
        seen.add(key);
        q.push(n);
      }
    }
    return false;
  }
}

/** Joystick → one grid step along the dominant axis (forward/up on the stick = −1 row). */
export function toDir(move: { x: number; y: number }, dead = 0.35): { x: number; y: number } | null {
  if (Math.max(Math.abs(move.x), Math.abs(move.y)) < dead) return null;
  return Math.abs(move.x) >= Math.abs(move.y) ? { x: Math.sign(move.x), y: 0 } : { x: 0, y: -Math.sign(move.y) };
}
