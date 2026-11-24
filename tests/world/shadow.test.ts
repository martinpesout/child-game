import { BlobShadow } from '../../src/world/shadow';

it('stín leží na vršku kamene, ne na zemi pod ním', () => {
  const s = new BlobShadow();
  s.place(0, 0, 0.3, 0.3);
  expect(s.mesh.position.y).toBeCloseTo(0.31, 2);
  s.dispose();
});

it('stín se ve skoku zmenší, ale nezmizí', () => {
  const s = new BlobShadow();
  s.place(1, 2, 0, 0.75);
  expect(s.mesh.position.x).toBe(1);
  expect(s.mesh.position.z).toBe(2);
  expect(s.mesh.scale.x).toBeLessThan(1);
  expect((s.mesh.material as { opacity: number }).opacity).toBeGreaterThanOrEqual(0.25);
  s.dispose();
});
