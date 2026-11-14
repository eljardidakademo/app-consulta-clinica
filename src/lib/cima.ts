// Acceso a la API REST pública de CIMA (Agencia Española de Medicamentos, AEMPS).
// Documentación oficial: apartado "API REST" de la web de CIMA (https://cima.aemps.es).
// CORS comprobado el 14/11/2026: las consultas GET se pueden hacer desde el navegador
// sin proxy (la API responde con Access-Control-Allow-Origin: *).
// Importante: solo se puede enviar la cabecera Accept (es "segura" para CORS). Cualquier
// otra cabecera obligaría al navegador a hacer una consulta previa (OPTIONS) que CIMA no acepta.

const BASE = 'https://cima.aemps.es/cima/rest';
// Sin esta cabecera, CIMA a veces devuelve texto plano en lugar de JSON.
const JSON_ACCEPT = { Accept: 'application/json' };

/** Documento oficial asociado al medicamento (1 = ficha técnica, 2 = prospecto). */
export interface DocumentoCima {
  tipo: number;
  url: string;
  urlHtml?: string;
  secc?: boolean;
  fecha?: number;
}

/** Datos de un medicamento tal como los devuelve CIMA (solo los campos que usamos). */
export interface MedicamentoCima {
  nregistro: string;
  nombre: string;
  labtitular?: string;
  cpresc?: string;
  comerc?: boolean;
  receta?: boolean;
  generico?: boolean;
  psum?: boolean;
  notas?: boolean;
  docs?: DocumentoCima[];
}

export interface ResultadoBusqueda {
  totalFilas: number;
  pagina: number;
  tamanioPagina: number;
  resultados: MedicamentoCima[];
  /** Momento en que se hizo la consulta, para mostrar "Consultado el …". */
  consultadoEl: Date;
}

export type ModoBusqueda = 'nombre' | 'principio' | 'cn';

/** Busca medicamentos de uso humano en CIMA. */
export async function buscarMedicamentos(
  texto: string,
  modo: ModoBusqueda,
  senal?: AbortSignal,
): Promise<ResultadoBusqueda> {
  const parametro = modo === 'nombre' ? 'nombre' : modo === 'principio' ? 'practiv1' : 'cn';
  const url = `${BASE}/medicamentos?${parametro}=${encodeURIComponent(texto.trim())}&pagesize=25`;
  const respuesta = await fetch(url, { signal: senal, headers: JSON_ACCEPT });
  if (!respuesta.ok) throw new Error(`CIMA respondió con el código ${respuesta.status}`);
  // Algunas búsquedas sin resultados devuelven el cuerpo vacío.
  const cuerpo = await respuesta.text();
  const datos = cuerpo ? JSON.parse(cuerpo) : { totalFilas: 0, pagina: 1, tamanioPagina: 25, resultados: [] };
  return { ...datos, resultados: datos.resultados ?? [], consultadoEl: new Date() };
}

// ---------------------------------------------------------------------------
// Ficha completa de un medicamento
// ---------------------------------------------------------------------------

/** Fechas en milisegundos: aut = autorizado, susp = suspendido, rev = revocado. */
export interface EstadoCima {
  aut?: number;
  susp?: number;
  rev?: number;
}

export interface PresentacionCima {
  cn: string;
  nombre: string;
  comerc?: boolean;
  psum?: boolean;
  detalleProblemaSuministro?: { fini?: number; ffin?: number; activo?: boolean; observ?: string };
}

export interface MedicamentoDetalle extends MedicamentoCima {
  pactivos?: string;
  labcomercializador?: string;
  estado?: EstadoCima;
  triangulo?: boolean;
  huerfano?: boolean;
  biosimilar?: boolean;
  conduc?: boolean;
  ema?: boolean;
  atcs?: { codigo: string; nombre: string; nivel: number }[];
  principiosActivos?: { nombre: string; cantidad?: string; unidad?: string }[];
  viasAdministracion?: { nombre: string }[];
  formaFarmaceutica?: { nombre: string };
  dosis?: string;
  presentaciones?: PresentacionCima[];
}

export interface SeccionDoc {
  seccion: string;
  titulo: string;
  contenido?: string;
}

export interface NotaSeguridad {
  tipo: number;
  num?: string;
  referencia?: string;
  asunto: string;
  fecha?: number;
  url?: string;
}

async function pedirJson<T>(ruta: string, vacio: T): Promise<T> {
  const respuesta = await fetch(`${BASE}/${ruta}`, { headers: JSON_ACCEPT });
  if (respuesta.status === 204 || respuesta.status === 404) return vacio;
  if (!respuesta.ok) throw new Error(`CIMA respondió con el código ${respuesta.status}`);
  const cuerpo = await respuesta.text();
  return cuerpo ? (JSON.parse(cuerpo) as T) : vacio;
}

/** Datos administrativos del medicamento (titular, estado, ATC, presentaciones…). */
export function obtenerMedicamento(nregistro: string) {
  return pedirJson<MedicamentoDetalle | null>(`medicamento?nregistro=${encodeURIComponent(nregistro)}`, null);
}

/** Índice de secciones de un documento: tipo 1 = ficha técnica, 2 = prospecto. */
export function obtenerIndice(tipo: 1 | 2, nregistro: string) {
  return pedirJson<SeccionDoc[]>(`docSegmentado/secciones/${tipo}?nregistro=${encodeURIComponent(nregistro)}`, []);
}

/**
 * Texto oficial (HTML) de una sección. CIMA devuelve la sección pedida y sus subsecciones
 * (p. ej. 4.2 → 4.2.1 Posología, 4.2.2 Forma de administración); a veces el texto está
 * solo en las subsecciones. Devuelve las partes que tienen texto, o una lista vacía si
 * la sección no existe en la fuente.
 */
export async function obtenerSeccion(tipo: 1 | 2, nregistro: string, seccion: string): Promise<SeccionDoc[]> {
  const lista = await pedirJson<SeccionDoc[]>(
    `docSegmentado/contenido/${tipo}?nregistro=${encodeURIComponent(nregistro)}&seccion=${encodeURIComponent(seccion)}`,
    [],
  );
  return lista.filter(
    (x) => (x.seccion === seccion || x.seccion.startsWith(`${seccion}.`)) && x.contenido && x.contenido.trim(),
  );
}

/** Notas de seguridad de la AEMPS asociadas al medicamento. */
export function obtenerNotas(nregistro: string) {
  return pedirJson<NotaSeguridad[]>(`notas?nregistro=${encodeURIComponent(nregistro)}`, []);
}

/** Fecha corta en castellano a partir de milisegundos, p. ej. "14/11/2026". */
export function fechaCorta(ms?: number): string {
  return ms ? new Date(ms).toLocaleDateString('es-ES') : '';
}

/** Enlace a la ficha pública del medicamento en la web oficial de CIMA. */
export function urlFichaCima(nregistro: string): string {
  return `https://cima.aemps.es/cima/publico/detalle.html?nr=${encodeURIComponent(nregistro)}`;
}

/** Formatea una fecha en castellano, p. ej. "14/11/2026, 13:25". */
export function formatearFecha(fecha: Date): string {
  return fecha.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
}
