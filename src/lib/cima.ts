// Acceso a la API REST pública de CIMA (Agencia Española de Medicamentos, AEMPS).
// Documentación oficial: apartado "API REST" de la web de CIMA (https://cima.aemps.es).
// CORS comprobado el 14/11/2026: las consultas GET se pueden hacer desde el navegador
// sin proxy (la API responde con Access-Control-Allow-Origin: *).
// Importante: no añadir cabeceras personalizadas a fetch, porque eso obligaría al
// navegador a hacer una consulta previa (OPTIONS) que CIMA no acepta.

const BASE = 'https://cima.aemps.es/cima/rest';

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
  const respuesta = await fetch(url, { signal: senal });
  if (!respuesta.ok) throw new Error(`CIMA respondió con el código ${respuesta.status}`);
  // Algunas búsquedas sin resultados devuelven el cuerpo vacío.
  const cuerpo = await respuesta.text();
  const datos = cuerpo ? JSON.parse(cuerpo) : { totalFilas: 0, pagina: 1, tamanioPagina: 25, resultados: [] };
  return { ...datos, resultados: datos.resultados ?? [], consultadoEl: new Date() };
}

/** Enlace a la ficha pública del medicamento en la web oficial de CIMA. */
export function urlFichaCima(nregistro: string): string {
  return `https://cima.aemps.es/cima/publico/detalle.html?nr=${encodeURIComponent(nregistro)}`;
}

/** Formatea una fecha en castellano, p. ej. "14/11/2026, 13:25". */
export function formatearFecha(fecha: Date): string {
  return fecha.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
}
