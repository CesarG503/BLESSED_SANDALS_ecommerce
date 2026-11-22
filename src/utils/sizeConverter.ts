/**
 * Utilidades para Conversión y Equivalencias de Medidas de Calzado
 * Blessed Sandals & Jordan Footwear
 * 
 * Tabla Oficial:
 * S:   US 6 / UK 5 / EU 39 / CM 24
 *      US 6.5 / UK 5.5 / EU 39.5 / CM 24.5
 *      US 7 / UK 6 / EU 40 / CM 25
 *      US 7.5 / UK 6.5 / EU 40.5 / CM 25.5
 * M:   US 8 / UK 7 / EU 41 / CM 26
 *      US 8.5 / UK 7.5 / EU 41.5 / CM 26.5
 *      US 9 / UK 8 / EU 42 / CM 27
 *      US 9.5 / UK 8.5 / EU 42.5 / CM 27.5
 * L:   US 10 / UK 9 / EU 43 / CM 28
 *      US 10.5 / UK 9.5 / EU 43.5 / CM 28.5
 *      US 11 / UK 10 / EU 44 / CM 29
 * XL:  US 11.5 / UK 10.5 / EU 44.5 / CM 29.5
 *      US 12 / UK 11 / EU 45 / CM 30
 * 
 * Relación Matemática Universal:
 * US = EU - 33
 * UK = EU - 34 (US - 1)
 * CM = EU - 15
 */

export type SizeUnit = 'EU' | 'US' | 'UK' | 'CM';

export interface SizeEquivalence {
  eu: number;
  us: number;
  uk: number;
  cm: number;
  group: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';
}

/** Tallas oficiales predeterminadas según la tabla */
export const STANDARD_CHART_SIZES: number[] = [
  39, 39.5, 40, 40.5, 41, 41.5, 42, 42.5, 43, 43.5, 44, 44.5, 45
];

/** Tallas extendidas populares (incluye tallas menores y mayores) */
export const POPULAR_EXTENDED_SIZES: number[] = [
  36, 37, 38, 38.5, 39, 39.5, 40, 40.5, 41, 41.5, 42, 42.5, 43, 43.5, 44, 44.5, 45, 45.5, 46, 47, 48
];

/**
 * Obtiene la equivalencia completa para una talla en formato canónico EU
 */
export function getSizeEquivalence(euSize: number): SizeEquivalence {
  const roundedEu = Math.round(euSize * 10) / 10;
  const us = Math.round((roundedEu - 33) * 10) / 10;
  const uk = Math.round((roundedEu - 34) * 10) / 10;
  const cm = Math.round((roundedEu - 15) * 10) / 10;

  let group: 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL' = 'M';
  if (roundedEu < 39) group = 'XS';
  else if (roundedEu <= 40.5) group = 'S';
  else if (roundedEu <= 42.5) group = 'M';
  else if (roundedEu <= 44) group = 'L';
  else if (roundedEu <= 45) group = 'XL';
  else group = 'XXL';

  return { eu: roundedEu, us, uk, cm, group };
}

/**
 * Convierte de EU a la unidad especificada
 */
export function euToUnit(euSize: number, unit: SizeUnit): number {
  const rounded = Math.round(euSize * 10) / 10;
  switch (unit) {
    case 'US':
      return Math.round((rounded - 33) * 10) / 10;
    case 'UK':
      return Math.round((rounded - 34) * 10) / 10;
    case 'CM':
      return Math.round((rounded - 15) * 10) / 10;
    case 'EU':
    default:
      return rounded;
  }
}

/**
 * Convierte de cualquier unidad especificada al valor canónico EU
 */
export function unitToEu(val: number, unit: SizeUnit): number {
  const rounded = Math.round(val * 10) / 10;
  switch (unit) {
    case 'US':
      return Math.round((rounded + 33) * 10) / 10;
    case 'UK':
      return Math.round((rounded + 34) * 10) / 10;
    case 'CM':
      return Math.round((rounded + 15) * 10) / 10;
    case 'EU':
    default:
      return rounded;
  }
}

/**
 * Formatea el texto a mostrar para una talla en la unidad activa
 */
export function formatSizeDisplay(euSize: number, unit: SizeUnit): string {
  const val = euToUnit(euSize, unit);
  if (unit === 'CM') return `${val} CM`;
  return `${val}`;
}

/**
 * Cadena con la equivalencia completa (ej: "EU 42 • US 9 • UK 8 • 27 CM")
 */
export function formatFullEquivalence(euSize: number): string {
  const eq = getSizeEquivalence(euSize);
  return `EU ${eq.eu} • US ${eq.us} • UK ${eq.uk} • ${eq.cm} CM`;
}

/**
 * Cadena compacta con la equivalencia
 */
export function formatCompactEquivalence(euSize: number, currentUnit: SizeUnit): string {
  const eq = getSizeEquivalence(euSize);
  switch (currentUnit) {
    case 'US':
      return `EU ${eq.eu} / ${eq.cm}cm`;
    case 'UK':
      return `EU ${eq.eu} / US ${eq.us}`;
    case 'CM':
      return `EU ${eq.eu} / US ${eq.us}`;
    case 'EU':
    default:
      return `US ${eq.us} / ${eq.cm}cm`;
  }
}
