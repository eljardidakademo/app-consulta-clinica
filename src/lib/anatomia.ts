// Datos del atlas 3D: sistemas (capas), colores y nombres de las estructuras.
//
// Origen de los modelos: Z-Anatomy (https://github.com/Z-Anatomy/Models-of-human-anatomy),
// licencia CC BY-SA 4.0, derivado de BodyParts3D (© The Database Center for Life Science,
// CC BY-SA 2.1 Japón). Se convirtió el archivo original de Blender a un GLB por sistema,
// simplificando la malla para el móvil (de 6,8 a 1,6 millones de polígonos). La forma de las
// estructuras no se ha modificado más allá de esa simplificación.
//
// Nombres: tabla TA2.csv incluida en Z-Anatomy (Terminologia Anatomica 2.ª ed., con latín y
// traducción al castellano). La traducción al castellano no está validada.

export interface Sistema {
  id: string;
  nombre: string;
  /** Color base de la capa (elección visual, no un dato clínico). */
  color: string;
  /** Opacidad inicial (la piel empieza semitransparente). */
  opacidad: number;
}

// Ordenadas de superficial a profunda, para "quitar capas" de fuera hacia dentro.
export const SISTEMAS: Sistema[] = [
  { id: 'regiones', nombre: 'Piel y regiones', color: '#e3b38f', opacidad: 0.35 },
  { id: 'musculos', nombre: 'Músculos', color: '#b4473c', opacidad: 1 },
  { id: 'articulaciones', nombre: 'Articulaciones y ligamentos', color: '#c8d4dc', opacidad: 1 },
  { id: 'esqueleto', nombre: 'Huesos', color: '#e9dfc8', opacidad: 1 },
  { id: 'cardiovascular', nombre: 'Corazón y vasos', color: '#c62828', opacidad: 1 },
  { id: 'linfatico', nombre: 'Sistema linfático', color: '#6aa84f', opacidad: 1 },
  { id: 'nervioso', nombre: 'Sistema nervioso y sentidos', color: '#e2bf3f', opacidad: 1 },
  { id: 'visceras', nombre: 'Vísceras', color: '#d98a8a', opacidad: 1 },
];

/** Color de una estructura: en vasos y sistema nervioso se distingue por el nombre del modelo. */
export function colorEstructura(sistema: string, nombreIngles: string): string {
  const n = nombreIngles.toLowerCase();
  if (sistema === 'cardiovascular') {
    if (/\bveins?\b|\bvena\b|sinus/.test(n)) return '#3558b8';
    return '#c62828';
  }
  if (sistema === 'nervioso') {
    if (/nerve|ganglion|plexus|ramus|branch|root|trunk|cord/.test(n)) return '#e2bf3f';
    if (/eye|lens|retina|cornea|iris|ear|cochlea|tympan/.test(n)) return '#9cc3d5';
    return '#d9b8b0';
  }
  return SISTEMAS.find((s) => s.id === sistema)?.color ?? '#cccccc';
}

/** Ficha de una estructura tal como sale del modelo y de la tabla TA2. */
export interface Estructura {
  nodo: string; // nombre del objeto en el modelo
  sistema: string;
  ingles: string; // nombre del modelo (inglés)
  es: string; // castellano según TA2.csv ('' si no está)
  la: string; // latín según TA2.csv
  ta2: string; // identificador TA2
  lado: '' | 'l' | 'r';
}

let indice: Promise<Map<string, Estructura>> | null = null;

/** Carga (una vez) la lista de estructuras de todos los sistemas. */
export function cargarEstructuras(base: string): Promise<Map<string, Estructura>> {
  if (!indice) {
    indice = fetch(`${base}anatomia/estructuras.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`Error ${r.status}`);
        return r.json() as Promise<Record<string, [string, string, string, string, string, string][]>>;
      })
      .then((datos) => {
        const mapa = new Map<string, Estructura>();
        for (const [sistema, lista] of Object.entries(datos)) {
          for (const [nodo, ingles, es, la, ta2, lado] of lista) {
            mapa.set(nodo, { nodo, sistema, ingles, es, la, ta2, lado: lado as Estructura['lado'] });
          }
        }
        return mapa;
      })
      .catch((e) => {
        indice = null;
        throw e;
      });
  }
  return indice;
}

export function textoLado(lado: Estructura['lado']): string {
  return lado === 'l' ? 'izquierdo' : lado === 'r' ? 'derecho' : '';
}

/** Nombre principal para mostrar: castellano si la tabla lo tiene; si no, el del modelo. */
export function nombreVisible(e: Estructura): string {
  return e.es || e.la || e.ingles;
}
