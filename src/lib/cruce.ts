// Cruce de fichas: búsqueda textual de un medicamento dentro del apartado de
// interacciones de otro, usando solo los textos oficiales de la AEMPS.
//
// Qué se hace exactamente (y nada más):
// - Uso humano (CIMA): se lee el apartado 4.5 de la ficha técnica (y sus subapartados).
//   Cada párrafo, elemento de lista o fila de tabla es un "fragmento".
// - Uso veterinario (CIMAVet): no hay ficha por apartados; se usan las interacciones
//   que CIMAVet publica como datos estructurados (una por especie).
// - En esos fragmentos se buscan, como palabras completas y sin distinguir mayúsculas
//   ni tildes, los "términos" del otro medicamento: sus principios activos (sin la sal,
//   p. ej. "atorvastatina cálcica" → "atorvastatina") y los nombres oficiales de sus
//   grupos ATC.
// - Se muestra el fragmento tal cual, con el término resaltado. No se interpreta,
//   no se resume y no se clasifica la gravedad.
// La ausencia de coincidencias NO significa que no haya interacción.

import { obtenerMedicamento, obtenerSeccion } from './cima';
import { obtenerMedicamentoVet } from './cimavet';
import { sanearHtml } from './sanear';
import type { MedGuardado } from './guardado';

export const AVISO_CRUCE =
  'Búsqueda textual en fichas técnicas. La ausencia de resultados NO garantiza ausencia de interacción.';

export interface Termino {
  texto: string; // como se muestra
  origen: 'Principio activo' | 'Grupo ATC';
  norm: string; // normalizado para buscar
}
export interface Fragmento {
  etiqueta?: string; // subapartado (4.5.1…) o especie
  texto: string;
}
export interface FuenteCruce {
  med: Pick<MedGuardado, 'nregistro' | 'nombre' | 'vet'>;
  terminos: Termino[];
  /** null = la fuente no ofrece el texto de interacciones para este medicamento. */
  fragmentos: Fragmento[] | null;
  /** Descripción de dónde salen los fragmentos, para mostrarla junto al resultado. */
  origenTexto: string;
  fechaDoc?: number;
}
export interface Coincidencia {
  fragmento: Fragmento;
  rangos: [number, number][];
  terminos: string[];
}

// Palabras que indican la sal o la forma química, no el principio activo en sí.
// Se quitan solo para buscar; el nombre oficial se sigue mostrando completo.
const PALABRAS_SAL = new Set(
  ('hidrocloruro clorhidrato hidrobromuro bromhidrato sodico sodica disodico disodica potasico potasica calcico calcica ' +
    'magnesico magnesica trihidrato dihidrato monohidrato hemihidrato sesquihidrato pentahidrato hexahidrato anhidro anhidra ' +
    'besilato besilate mesilato maleato fumarato hemifumarato tartrato hidrogenotartrato bitartrato succinato citrato sulfato ' +
    'bisulfato fosfato acetato propionato dipropionato valerato butirato lactato gluconato hidrogenosulfato tosilato ' +
    'bromuro yoduro nitrato oxalato pamoato estearato palmitato trometamol lisina arginina meglumina ' +
    'micronizado micronizada amorfo amorfa cristalino polvo base')
    .split(' '),
);

/** Minúsculas y sin tildes, sin cambiar la longitud del texto. */
function normalizarCaracter(c: string): string {
  const n = c.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return n.length === 1 ? n : c.toLowerCase().slice(0, 1) || ' ';
}
export function normalizar(s: string): string {
  // Recorre unidades UTF-16 para que cada posición coincida con la del texto original.
  let r = '';
  for (let i = 0; i < s.length; i++) r += normalizarCaracter(s[i]);
  return r;
}

/** Quita las palabras de sal del final: "metformina hidrocloruro" → "metformina". */
function quitarSal(nombre: string): string {
  const palabras = normalizar(nombre).split(/[\s,()/]+/).filter(Boolean);
  while (palabras.length > 1) {
    const ultima = palabras[palabras.length - 1];
    if (PALABRAS_SAL.has(ultima) || /hidrat/.test(ultima)) palabras.pop();
    else break;
  }
  return palabras.join(' ');
}

// Nombres de grupos ATC demasiado genéricos para buscarlos como texto.
const ATC_GENERICOS = /^(otros|otras|varios|combinaciones|asociaciones)\b|combinacion/;

function crearTerminos(pas: string[], atcs: { codigo: string; nombre: string; nivel?: number }[]): Termino[] {
  const vistos = new Set<string>();
  const lista: Termino[] = [];
  const anadir = (texto: string, origen: Termino['origen'], norm: string) => {
    norm = norm.replace(/\s+/g, ' ').trim();
    if (norm.length < 4 || vistos.has(norm)) return;
    vistos.add(norm);
    lista.push({ texto, origen, norm });
  };
  for (const pa of pas) {
    const limpio = quitarSal(pa);
    if (limpio) anadir(limpio, 'Principio activo', limpio);
  }
  for (const a of atcs) {
    // Niveles 3, 4 y 5 (subgrupo farmacológico, químico y principio activo).
    const nivel = a.nivel ?? 0;
    if (nivel < 3) continue;
    const nombre = a.nombre.replace(/\s+/g, ' ').trim();
    const norm = normalizar(nombre);
    if (ATC_GENERICOS.test(norm)) continue;
    anadir(nombre.charAt(0).toUpperCase() + nombre.slice(1).toLowerCase(), 'Grupo ATC', norm);
  }
  return lista;
}

/** Convierte el HTML oficial en fragmentos de texto (párrafos, elementos de lista, filas de tabla). */
function fragmentosDeHtml(html: string, etiqueta?: string): Fragmento[] {
  const div = document.createElement('div');
  div.innerHTML = sanearHtml(html);
  const res: Fragmento[] = [];
  div.querySelectorAll('tr, p, li, h1, h2, h3, h4, h5, h6').forEach((el) => {
    if (el.parentElement?.closest('tr, p, li')) return; // ya incluido en su contenedor
    const texto =
      el.tagName === 'TR'
        ? Array.from(el.children).map((c) => c.textContent?.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' · ')
        : (el.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (texto) res.push({ etiqueta, texto });
  });
  if (res.length === 0) {
    const texto = (div.textContent ?? '').replace(/\s+/g, ' ').trim();
    if (texto) res.push({ etiqueta, texto });
  }
  return res;
}

/** Carga los términos y el texto de interacciones de un medicamento. */
export async function cargarFuente(med: Pick<MedGuardado, 'nregistro' | 'nombre' | 'vet'>): Promise<FuenteCruce> {
  if (med.vet) {
    const m = await obtenerMedicamentoVet(med.nregistro);
    if (!m) return { med, terminos: [], fragmentos: null, origenTexto: 'CIMAVet' };
    const fragmentos = (m.interacciones ?? []).map((i) => ({
      etiqueta: i.especie?.nombre ?? 'Todas las especies',
      texto: i.nombre,
    }));
    return {
      med: { ...med, nombre: m.nombre },
      terminos: crearTerminos((m.principiosActivos ?? []).map((p) => p.nombre), m.atcs ?? []),
      fragmentos: m.interacciones ? fragmentos : null,
      origenTexto: 'CIMAVet, interacciones publicadas como datos estructurados',
      fechaDoc: m.docs?.find((d) => d.tipo === 1)?.fecha,
    };
  }
  const m = await obtenerMedicamento(med.nregistro);
  if (!m) return { med, terminos: [], fragmentos: null, origenTexto: 'CIMA' };
  const terminos = crearTerminos((m.principiosActivos ?? []).map((p) => p.nombre), m.atcs ?? []);
  const ft = m.docs?.find((d) => d.tipo === 1);
  if (!ft?.secc) {
    return { med: { ...med, nombre: m.nombre }, terminos, fragmentos: null, origenTexto: 'CIMA, ficha técnica apartado 4.5', fechaDoc: ft?.fecha };
  }
  const partes = await obtenerSeccion(1, m.nregistro, '4.5');
  const fragmentos = partes.flatMap((p) =>
    fragmentosDeHtml(p.contenido ?? '', p.seccion !== '4.5' ? `${p.seccion} ${p.titulo ?? ''}`.trim() : undefined),
  );
  return {
    med: { ...med, nombre: m.nombre },
    terminos,
    fragmentos: partes.length ? fragmentos : null,
    origenTexto: 'CIMA, ficha técnica apartado 4.5',
    fechaDoc: ft.fecha,
  };
}

/** Busca los términos de un medicamento dentro de los fragmentos del otro. */
export function buscarCoincidencias(fragmentos: Fragmento[], terminos: Termino[]): Coincidencia[] {
  const res: Coincidencia[] = [];
  const esLetra = (c: string | undefined) => !!c && /[a-z0-9ñ]/.test(c);
  for (const f of fragmentos) {
    const norm = normalizar(f.texto);
    const rangos: [number, number][] = [];
    const encontrados: string[] = [];
    for (const t of terminos) {
      let desde = 0;
      let hallado = false;
      for (;;) {
        const i = norm.indexOf(t.norm, desde);
        if (i < 0) break;
        const fin = i + t.norm.length;
        if (!esLetra(norm[i - 1]) && !esLetra(norm[fin])) {
          rangos.push([i, fin]);
          hallado = true;
        }
        desde = i + 1;
      }
      if (hallado) encontrados.push(t.texto);
    }
    if (rangos.length) res.push({ fragmento: f, rangos: unirRangos(rangos), terminos: encontrados });
  }
  return res;
}

function unirRangos(r: [number, number][]): [number, number][] {
  const o = [...r].sort((a, b) => a[0] - b[0]);
  const res: [number, number][] = [];
  for (const x of o) {
    const u = res[res.length - 1];
    if (u && x[0] <= u[1]) u[1] = Math.max(u[1], x[1]);
    else res.push([x[0], x[1]]);
  }
  return res;
}
