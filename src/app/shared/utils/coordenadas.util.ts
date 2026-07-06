export interface CoordenadasParsed {
  latitude: number;
  longitude: number;
}

// Formato DMS exportado pelo Google Maps, ex.: 23°12'05.6"S 47°35'56.3"W
// Aceita apóstrofos/aspas Unicode (′ ’ ″ ”) e hemisférios em português (O = Oeste, L = Leste).
const DMS_REGEX =
  /^\s*(\d{1,2})\s*°\s*(\d{1,2})\s*['′’]\s*(\d{1,2}(?:\.\d+)?)\s*["″”]\s*([NS])\s*[,;]?\s*(\d{1,3})\s*°\s*(\d{1,2})\s*['′’]\s*(\d{1,2}(?:\.\d+)?)\s*["″”]\s*([EWOL])\s*$/i;

// Par decimal, ex.: -23.201556, -47.598972 (vírgula e/ou espaço como separador)
const DECIMAL_REGEX = /^\s*(-?\d{1,3}(?:\.\d+)?)\s*(?:[,;]\s*|\s+)(-?\d{1,3}(?:\.\d+)?)\s*$/;

const HEMISFERIOS_NEGATIVOS = new Set(['S', 'W', 'O']);

function dmsParaDecimal(graus: string, minutos: string, segundos: string, hemisferio: string): number {
  const valor = Number(graus) + Number(minutos) / 60 + Number(segundos) / 3600;
  return HEMISFERIOS_NEGATIVOS.has(hemisferio.toUpperCase()) ? -valor : valor;
}

function dentroDaFaixa(latitude: number, longitude: number): boolean {
  return latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
}

/**
 * Interpreta um par de coordenadas colado pelo usuário, nos formatos
 * DMS do Google Maps (23°12'05.6"S 47°35'56.3"W) ou decimal (-23.201556, -47.598972).
 * Retorna null se o texto não for um par reconhecível ou estiver fora de faixa.
 */
export function parseCoordenadas(texto: string): CoordenadasParsed | null {
  const dms = DMS_REGEX.exec(texto);
  if (dms) {
    const latitude = dmsParaDecimal(dms[1], dms[2], dms[3], dms[4]);
    const longitude = dmsParaDecimal(dms[5], dms[6], dms[7], dms[8]);
    return dentroDaFaixa(latitude, longitude) ? { latitude, longitude } : null;
  }

  const decimal = DECIMAL_REGEX.exec(texto);
  if (decimal) {
    const latitude = Number(decimal[1]);
    const longitude = Number(decimal[2]);
    return dentroDaFaixa(latitude, longitude) ? { latitude, longitude } : null;
  }

  return null;
}
