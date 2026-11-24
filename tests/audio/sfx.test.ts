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
  createDelay() { return Object.assign(new FakeNode(), { delayTime: new FakeParam() }); }
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

it('hudba na pozadí plánuje tóny a ztlumení je zastaví', () => {
  vi.useFakeTimers();
  const s = new Sfx();
  s.unlock();
  s.startMusic();
  vi.advanceTimersByTime(500);
  const playing = FakeCtx.oscillators;
  expect(playing).toBeGreaterThan(0);
  s.setMuted(true);
  vi.advanceTimersByTime(2000);
  expect(FakeCtx.oscillators).toBe(playing);
  s.stopMusic();
  vi.useRealTimers();
});

it('hudba má 8 taktů a přehraje akordy, melodii i rytmus', () => {
  vi.useFakeTimers();
  const s = new Sfx();
  s.unlock();
  const ctx = (s as unknown as { ctx: FakeCtx }).ctx;
  const noise = vi.spyOn(ctx, 'createBufferSource');
  // advance music clock through one whole loop
  s.startMusic();
  for (let i = 0; i < 300; i++) { ctx.currentTime += 0.1; vi.advanceTimersByTime(100); }
  expect(noise).toHaveBeenCalled(); // shaker / percussion
  expect((s as unknown as { musicLoops: number }).musicLoops).toBeGreaterThanOrEqual(1);
  s.stopMusic();
  vi.useRealTimers();
});

it('playClip přehraje nahrávku přes odemčený AudioContext a vrátí ovladač pro zastavení', async () => {
  const s = new Sfx();
  s.unlock();
  const ctx = (s as unknown as { ctx: FakeCtx & { decodeAudioData?: unknown } }).ctx;
  (ctx as unknown as { decodeAudioData: () => Promise<object> }).decodeAudioData = async () => ({});
  const src = vi.spyOn(ctx, 'createBufferSource');
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(8) })));
  const h = await s.playClip('voice/intro.m4a');
  expect(h).not.toBeNull();
  expect(src).toHaveBeenCalled();
  expect(() => h!.stop()).not.toThrow();
});

it('playClip vrátí null, když soubor chybí', async () => {
  const s = new Sfx();
  s.unlock();
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));
  expect(await s.playClip('voice/none.m4a')).toBeNull();
});

it('na iOS nastaví přehrávání médií, aby zvuk hrál i při ztlumeném telefonu', () => {
  const session = { type: 'auto' };
  Object.defineProperty(navigator, 'audioSession', { value: session, configurable: true });
  const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(async () => {});
  const s = new Sfx();
  s.unlock();
  expect(session.type).toBe('playback');
  // older iOS: a silent looping <audio> switches the audio session to "playback"
  expect(play).toHaveBeenCalled();
  s.unlock();
  expect(play).toHaveBeenCalledTimes(1);
  play.mockRestore();
  delete (navigator as unknown as { audioSession?: unknown }).audioSession;
});

it('cáknutí do kaluže: ztlumeno nic, jinak zvuk', () => {
  const s = new Sfx();
  s.unlock();
  s.setMuted(true);
  s.splash();
  const before = FakeCtx.oscillators;
  expect(before).toBe(0);
  s.setMuted(false);
  s.splash();
  expect(FakeCtx.oscillators).toBeGreaterThan(0);
});
