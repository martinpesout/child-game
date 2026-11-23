import { Flow } from '../../src/ui/flow';

it('title → story → playing → levelEnd → comingSoon', () => {
  const f = new Flow();
  const seen: string[] = [];
  f.onChange((s) => seen.push(s));
  f.start();
  f.continue();
  f.complete(2);
  f.next();
  expect(seen).toEqual(['story', 'playing', 'levelEnd', 'comingSoon']);
  expect(f.lastStars).toBe(2);
});

it('retry z levelEnd vrátí playing', () => {
  const f = new Flow();
  f.start(); f.continue(); f.complete(1);
  f.retry();
  expect(f.screen).toBe('playing');
});

it('z comingSoon jde zpět na začátek', () => {
  const f = new Flow();
  f.start(); f.continue(); f.complete(1); f.next();
  f.home();
  expect(f.screen).toBe('title');
});

it('neplatné přechody ignoruje', () => {
  const f = new Flow();
  f.complete(3);
  f.retry();
  f.continue();
  expect(f.screen).toBe('title');
});

it('pause/resume jen ze hry a do hry', () => {
  const f = new Flow();
  f.pause();
  expect(f.screen).toBe('title');
  f.start(); f.continue();
  f.pause();
  expect(f.screen).toBe('paused');
  f.resume();
  expect(f.screen).toBe('playing');
});
