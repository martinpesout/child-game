import { Sfx, nutPitch } from '../../src/audio/sfx';

class FakeParam { value = 0; setValueAtTime() { return this; } linearRampToValueAtTime() { return this; } exponentialRampToValueAtTime() { return this; } setTargetAtTime() { return this; } }
class FakeNode { connect() { return this; } disconnect() {} }
class FakeOsc extends FakeNode { type = 'sine'; frequency = new FakeParam(); detune = new FakeParam(); start() {} stop() {} onended: null | (() => void) = null; }
class FakeGain extends FakeNode { gain = new FakeParam(); }
class FakeCtx {
  static oscillators = 0;
  state = 'suspended';
  currentTime = 0;
  destination = new FakeNode();
  sampleRate = 44100;
  resume = vi.fn(async () => { this.state = 'running'; });
  createOscillator() { FakeCtx.oscillators++; return new FakeOsc(); }
  createGain() { return new FakeGain(); }
  createBiquadFilter() { return Object.assign(new FakeNode(), { type: 'lowpass', frequency: new FakeParam(), Q: new FakeParam() }); }
  createBuffer() { return { getChannelData: () => new Float32Array(10) }; }
  createBufferSource() { return Object.assign(new FakeNode(), { buffer: null, start() {}, stop() {} }); }
}

beforeEach(() => {
  FakeCtx.oscillators = 0;
  vi.stubGlobal('AudioContext', FakeCtx);
});
afterEach(() => vi.unstubAllGlobals());

it('výška tónu oříšku roste po půltónech od C5', () => {
  expect(nutPitch(0)).toBeCloseTo(523.25);
  expect(nutPitch(12)).toBeCloseTo(1046.5);
});

it('unlock obnoví pozastavený AudioContext (iOS po návratu z pozadí)', () => {
  const s = new Sfx();
  s.unlock();
  const ctx = (s as unknown as { ctx: FakeCtx }).ctx;
  expect(ctx.resume).toHaveBeenCalled();
  ctx.state = 'suspended';
  s.unlock();
  expect(ctx.resume).toHaveBeenCalledTimes(2);
});

it('ztlumeno → žádný oscilátor se nevytvoří', () => {
  const s = new Sfx();
  s.unlock();
  s.setMuted(true);
  s.collectNut(3);
  s.fanfare();
  expect(FakeCtx.oscillators).toBe(0);
  s.setMuted(false);
  s.collectNut(3);
  expect(FakeCtx.oscillators).toBeGreaterThan(0);
});

it('před odemčením nic nehraje a nepadá', () => {
  const s = new Sfx();
  expect(() => s.collectNut(0)).not.toThrow();
  expect(FakeCtx.oscillators).toBe(0);
});

it('chroupání při žvýkání hraje jen když není ztlumeno', () => {
  const s = new Sfx();
  s.unlock();
  const ctx = (s as unknown as { ctx: FakeCtx }).ctx;
  const spy = vi.spyOn(ctx, 'createBufferSource');
  s.setMuted(true);
  s.munch();
  expect(spy).not.toHaveBeenCalled();
  s.setMuted(false);
  s.munch();
  expect(spy).toHaveBeenCalled();
});
