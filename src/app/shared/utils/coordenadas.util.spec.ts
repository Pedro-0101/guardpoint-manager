import { parseCoordenadas } from './coordenadas.util';

describe('parseCoordenadas', () => {
  describe('formato DMS (Google Maps)', () => {
    it('deve converter o par DMS exportado pelo Google Maps', () => {
      const result = parseCoordenadas(`23°12'05.6"S 47°35'56.3"W`);
      expect(result).not.toBeNull();
      expect(result!.latitude).toBeCloseTo(-23.201556, 5);
      expect(result!.longitude).toBeCloseTo(-47.598972, 5);
    });

    it('deve aceitar aspas e apóstrofos Unicode (′ ″ ’ ”)', () => {
      const result = parseCoordenadas('23°12′05.6″S 47°35′56.3″W');
      expect(result).not.toBeNull();
      expect(result!.latitude).toBeCloseTo(-23.201556, 5);
      expect(result!.longitude).toBeCloseTo(-47.598972, 5);

      const curly = parseCoordenadas('23°12’05.6”S 47°35’56.3”W');
      expect(curly).not.toBeNull();
      expect(curly!.latitude).toBeCloseTo(-23.201556, 5);
    });

    it('deve tratar hemisférios N e E como positivos', () => {
      const result = parseCoordenadas(`48°51'29.6"N 2°17'40.2"E`);
      expect(result).not.toBeNull();
      expect(result!.latitude).toBeCloseTo(48.858222, 5);
      expect(result!.longitude).toBeCloseTo(2.294500, 5);
    });

    it('deve aceitar O e L como hemisférios em português (Oeste/Leste)', () => {
      const result = parseCoordenadas(`23°12'05.6"S 47°35'56.3"O`);
      expect(result).not.toBeNull();
      expect(result!.longitude).toBeCloseTo(-47.598972, 5);

      const leste = parseCoordenadas(`10°00'00.0"N 20°00'00.0"L`);
      expect(leste).not.toBeNull();
      expect(leste!.longitude).toBeCloseTo(20, 5);
    });

    it('deve aceitar vírgula e espaços extras entre os pares', () => {
      const result = parseCoordenadas(`  23°12'05.6"S ,  47°35'56.3"W  `);
      expect(result).not.toBeNull();
      expect(result!.latitude).toBeCloseTo(-23.201556, 5);
      expect(result!.longitude).toBeCloseTo(-47.598972, 5);
    });

    it('deve rejeitar DMS com latitude fora de faixa', () => {
      expect(parseCoordenadas(`95°12'05.6"S 47°35'56.3"W`)).toBeNull();
    });
  });

  describe('formato decimal', () => {
    it('deve aceitar par decimal separado por vírgula', () => {
      const result = parseCoordenadas('-23.201556, -47.598972');
      expect(result).toEqual({ latitude: -23.201556, longitude: -47.598972 });
    });

    it('deve aceitar par decimal separado apenas por espaço', () => {
      const result = parseCoordenadas('-23.201556 -47.598972');
      expect(result).toEqual({ latitude: -23.201556, longitude: -47.598972 });
    });

    it('deve aceitar valores positivos e inteiros', () => {
      const result = parseCoordenadas('45, 90');
      expect(result).toEqual({ latitude: 45, longitude: 90 });
    });

    it('deve rejeitar latitude fora de faixa', () => {
      expect(parseCoordenadas('-91, -47.5')).toBeNull();
    });

    it('deve rejeitar longitude fora de faixa', () => {
      expect(parseCoordenadas('-23.5, 181')).toBeNull();
    });
  });

  describe('entradas inválidas', () => {
    it('deve retornar null para texto arbitrário', () => {
      expect(parseCoordenadas('Portaria Principal')).toBeNull();
    });

    it('deve retornar null para string vazia ou só espaços', () => {
      expect(parseCoordenadas('')).toBeNull();
      expect(parseCoordenadas('   ')).toBeNull();
    });

    it('deve retornar null para um único número (não é um par)', () => {
      expect(parseCoordenadas('-23.201556')).toBeNull();
    });
  });
});
