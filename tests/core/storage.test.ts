import { storage } from '../../src/core/storage';

afterEach(() => vi.restoreAllMocks());

it('vrátí uloženou hodnotu', () => {
  storage.set('a', { n: 2 });
  expect(storage.get('a', null)).toEqual({ n: 2 });
});

it('vrátí fallback, když localStorage vyhodí', () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('x');
  });
  expect(storage.get('stars', 0)).toBe(0);
});

it('set nevyhodí, když localStorage vyhodí', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('x');
  });
  expect(() => storage.set('a', 1)).not.toThrow();
});
