import { watchBackground, installAudioUnlock } from '../../src/core/background';

function fakeDoc() {
  const l: Record<string, (() => void)[]> = {};
  const d = {
    hidden: false,
    addEventListener: (n: string, cb: () => void) => (l[n] ??= []).push(cb),
    fire: (n: string) => l[n]?.forEach((cb) => cb()),
  };
  return d;
}

it('po návratu z pozadí delším než 0.6 s hru pozastaví (i když časovače v pozadí neběží)', () => {
  const doc = fakeDoc();
  const win = fakeDoc();
  let now = 0;
  const onPause = vi.fn();
  const onHide = vi.fn();
  watchBackground(doc as unknown as Document, win as unknown as Window, () => now, onHide, onPause);
  doc.hidden = true; doc.fire('visibilitychange');
  expect(onHide).toHaveBeenCalled();
  now = 5000;
  doc.hidden = false; doc.fire('visibilitychange');
  expect(onPause).toHaveBeenCalledTimes(1);
});

it('krátké probliknutí (snímek, notifikace) hru nepozastaví', () => {
  const doc = fakeDoc();
  let now = 0;
  const onPause = vi.fn();
  watchBackground(doc as unknown as Document, fakeDoc() as unknown as Window, () => now, () => {}, onPause);
  doc.hidden = true; doc.fire('visibilitychange');
  now = 200;
  doc.hidden = false; doc.fire('visibilitychange');
  expect(onPause).not.toHaveBeenCalled();
});

it('pagehide pozastaví hned', () => {
  const win = fakeDoc();
  const onPause = vi.fn();
  watchBackground(fakeDoc() as unknown as Document, win as unknown as Window, () => 0, () => {}, onPause);
  win.fire('pagehide');
  expect(onPause).toHaveBeenCalled();
});

it('zvuk se odemyká i při zvednutí prstu, touchend a click', () => {
  const unlock = vi.fn();
  const target = new EventTarget();
  installAudioUnlock(target, unlock);
  for (const n of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) target.dispatchEvent(new Event(n));
  expect(unlock).toHaveBeenCalledTimes(5);
});
