import { parseVoices, pickCzechVoice } from '../../scripts/voiceTools';

const LIST = `Albert              en_US    # Hello! My name is Albert.
Zuzana              cs_CZ    # Ahoj! Já jsem Zuzana.
Zuzana (Vylepšený)  cs_CZ    # Ahoj! Já jsem Zuzana.
Zuzana (Prémiový)   cs_CZ    # Ahoj! Já jsem Zuzana.
Eddy (Czech (Czechia)) cs_CZ    # Ahoj! Já jsem Eddy.`;

it('přečte jména hlasů včetně závorek a mezer', () => {
  const v = parseVoices(LIST);
  expect(v).toContainEqual({ name: 'Zuzana (Prémiový)', locale: 'cs_CZ' });
  expect(v).toContainEqual({ name: 'Eddy (Czech (Czechia))', locale: 'cs_CZ' });
  expect(v).toHaveLength(5);
});

it('vybere prémiový český hlas před vylepšeným a základním', () => {
  expect(pickCzechVoice(parseVoices(LIST))).toEqual({ name: 'Zuzana (Prémiový)', quality: 2 });
});

it('pozná anglická označení Premium / Enhanced', () => {
  const v = parseVoices('Zuzana (Enhanced)  cs_CZ    # Ahoj!\nZuzana  cs_CZ    # Ahoj!');
  expect(pickCzechVoice(v)).toEqual({ name: 'Zuzana (Enhanced)', quality: 1 });
});

it('bez českého hlasu vrátí null', () => {
  expect(pickCzechVoice(parseVoices('Albert  en_US    # Hello!'))).toBeNull();
});
