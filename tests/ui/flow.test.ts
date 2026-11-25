import { Flow } from '../../src/ui/flow';

const flowWith = (playable: number[] = [1, 2]) => new Flow((n) => playable.includes(n));

it('title → map → story(2) → playing → levelEnd → next → comingSoon', () => {
  const f = flowWith();
  const seen: string[] = [];
  f.onChange((s) => seen.push(s));
  f.start();
  f.pick(2);
  f.continue();
  f.complete(2);
  f.next();
  expect(seen).toEqual(['map', 'story', 'playing', 'levelEnd', 'comingSoon']);
  expect(f.current).toBe(2);
  expect(f.lastStars).toBe(2);
});

it('konec kola 1 → Dál → příběh kola 2', () => {
  const f = flowWith();
  f.start(); f.pick(1); f.continue(); f.complete(3);
  f.next();
  expect(f.screen).toBe('story');
  expect(f.current).toBe(2);
});

it('retry z levelEnd vrátí playing stejného kola', () => {
  const f = flowWith();
  f.start(); f.pick(1); f.continue(); f.complete(1);
  f.retry();
  expect(f.screen).toBe('playing');
  expect(f.current).toBe(1);
});

it('na mapu jde z pauzy, konce kola i z „už brzy“', () => {
  for (const setup of [
    (f: Flow) => { f.continue(); f.pause(); },
    (f: Flow) => { f.continue(); f.complete(1); },
    (f: Flow) => { f.continue(); f.complete(1); f.next(); f.next(); },
  ]) {
    const f = flowWith([1]);
    f.start(); f.pick(1);
    setup(f);
    f.toMap();
    expect(f.screen).toBe('map');
  }
});

it('zamčené nebo nehotové kolo z mapy nejde spustit', () => {
  const f = flowWith([1]);
  f.start();
  f.pick(2);
  expect(f.screen).toBe('map');
  f.pick(1);
  expect(f.screen).toBe('story');
});

it('neplatné přechody ignoruje; pauza jen ze hry', () => {
  const f = flowWith();
  f.complete(3); f.retry(); f.continue(); f.pause();
  expect(f.screen).toBe('title');
  f.start(); f.pick(1); f.continue(); f.pause();
  expect(f.screen).toBe('paused');
  f.resume();
  expect(f.screen).toBe('playing');
});

it('kolo 2 → Dál → příběh kola 3; po kole 3 „už brzy“', () => {
  const f = flowWith([1, 2, 3]);
  f.start(); f.pick(2); f.continue(); f.complete(2);
  f.next();
  expect(f.screen).toBe('story');
  expect(f.current).toBe(3);
  f.continue(); f.complete(3);
  f.next();
  expect(f.screen).toBe('comingSoon');
});

it('kolo 3 → Dál → příběh kola 4; po kole 4 „už brzy“', () => {
  const f = flowWith([1, 2, 3, 4]);
  f.start(); f.pick(3); f.continue(); f.complete(2);
  f.next();
  expect(f.current).toBe(4);
  f.continue(); f.complete(3);
  f.next();
  expect(f.screen).toBe('comingSoon');
});

it('po posledním kole „Dál“ vede na konec hry a odtud na mapu', () => {
  const f = new Flow((n) => n <= 5, 5);
  f.start(); f.pick(5); f.continue(); f.complete(3);
  f.next();
  expect(f.screen).toBe('gameEnd');
  f.toMap();
  expect(f.screen).toBe('map');
});

it('po kole 4 (kolo 5 hotové) „Dál“ vede na příběh kola 5', () => {
  const f = new Flow((n) => n <= 5, 5);
  f.start(); f.pick(4); f.continue(); f.complete(2);
  f.next();
  expect(f.screen).toBe('story');
  expect(f.current).toBe(5);
});
