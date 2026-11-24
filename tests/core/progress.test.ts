import { LevelProgress } from '../../src/core/progress';

function memStore(init: Record<string, unknown> = {}) {
  const data = { ...init };
  return {
    data,
    get: <T,>(k: string, f: T): T => (k in data ? (data[k] as T) : f),
    set: (k: string, v: unknown) => { data[k] = v; },
  };
}

it('nový hráč: odemčené jen kolo 1', () => {
  const p = new LevelProgress(5, memStore());
  expect(p.isUnlocked(1)).toBe(true);
  expect(p.isUnlocked(2)).toBe(false);
  expect(p.current()).toBe(1);
});

it('dokončení kola 1 odemkne kolo 2 a nepřepíše lepší hvězdy horšími', () => {
  const store = memStore();
  const p = new LevelProgress(5, store);
  p.complete(1, 3);
  p.complete(1, 1);
  expect(p.best(1)).toBe(3);
  expect(p.isUnlocked(2)).toBe(true);
  expect(new LevelProgress(5, store).isUnlocked(2)).toBe(true); // survives reload
});

it('staré stars.level1 bez progress.unlocked ⇒ odemčené kolo 2', () => {
  const p = new LevelProgress(5, memStore({ 'stars.level1': 2 }));
  expect(p.isUnlocked(2)).toBe(true);
  expect(p.best(1)).toBe(2);
});

it('nikdy neodemkne víc než levelCount', () => {
  const p = new LevelProgress(2, memStore());
  p.complete(1, 1);
  p.complete(2, 1);
  expect(p.current()).toBe(2);
  expect(p.isUnlocked(3)).toBe(false);
});

it('vadná data v úložišti nevyhodí', () => {
  const p = new LevelProgress(5, memStore({ 'progress.unlocked': 'nesmysl', 'stars.level1': null }));
  expect(p.current()).toBe(1);
  expect(p.best(1)).toBe(0);
});
