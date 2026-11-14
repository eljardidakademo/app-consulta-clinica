// Acceso a la API REST pública de CIMAVet (medicamentos veterinarios, AEMPS).
// Comprobado el 14/11/2026:
// - La API está en https://cimavet.aemps.es/cimavet/rest/ y responde con
//   Access-Control-Allow-Origin: *, así que se puede consultar desde el navegador.
// - Busca por nombre (nombre=), principio activo (practiv1=) y código nacional (cn=).
// - El detalle (medicamento?nregistro=) incluye datos estructurados por especie:
//   indicaciones, contraindicaciones, interacciones, reacciones adversas y tiempos de espera.
// - NO ofrece la ficha técnica por apartados (docSegmentado da 404): solo PDF.
// - No tiene notas de seguridad. La tabla maestra 7 es la de especies, no la de ATC.

import type { ModoBusqueda, ResultadoBusqueda } from './cima';

const BASE = 'https://cimavet.aemps.es/cimavet/rest';
const JSON_ACCEPT = { Accept: 'application/json' };

interface Nombrado {
  id?: number;
  nombre: string;
}
interface PorEspecie extends Nombrado {
  /** Especie a la que se refiere el dato. Si falta, vale para todas. */
  especie?: Nombrado;
}

export interface MedicamentoVet {
  nregistro: string;
  nombre: string;
  pactivos?: string;
  labtitular?: string;
  labcomercializador?: string;
  dispensacion?: Nombrado;
  tipoMedicamento?: Nombrado;
  administracion?: Nombrado;
  estado?: { aut?: number; susp?: number; rev?: number };
  comerc?: boolean;
  psum?: boolean;
  receta?: boolean;
  estupefaciente?: boolean;
  psicotropo?: boolean;
  antibiotico?: boolean;
  ema?: boolean;
  docs?: { tipo: number; url: string; fecha?: number }[];
  atcs?: { codigo: string; nombre: string; nivel: number }[];
  formasFarmaceuticas?: Nombrado[];
  principiosActivos?: { nombre: string; cantidad?: string; unidad?: string }[];
  excipientes?: { nombre: string; cantidad?: string; unidad?: string }[];
  viasAdministracion?: Nombrado[];
  especies?: Nombrado[];
  indicaciones?: PorEspecie[];
  contraindicaciones?: PorEspecie[];
  interacciones?: PorEspecie[];
  reaccionesAdversas?: (PorEspecie & { frecuencia?: Nombrado })[];
  tiemposEspera?: {
    especie?: Nombrado;
    tejido?: Nombrado;
    cantidad?: string;
    unidadTiempo?: Nombrado;
    viaAdministracion?: Nombrado;
  }[];
  presentaciones?: { cn: string; nombre: string; comerc?: boolean; psum?: boolean }[];
}

async function pedirJson<T>(ruta: string, vacio: T, senal?: AbortSignal): Promise<T> {
  const respuesta = await fetch(`${BASE}/${ruta}`, { headers: JSON_ACCEPT, signal: senal });
  if (respuesta.status === 204 || respuesta.status === 404) return vacio;
  if (!respuesta.ok) throw new Error(`CIMAVet respondió con el código ${respuesta.status}`);
  const cuerpo = await respuesta.text();
  return cuerpo ? (JSON.parse(cuerpo) as T) : vacio;
}

/** Busca medicamentos veterinarios en CIMAVet. */
export async function buscarMedicamentosVet(texto: string, modo: ModoBusqueda, senal?: AbortSignal): Promise<ResultadoBusqueda> {
  const parametro = modo === 'nombre' ? 'nombre' : modo === 'principio' ? 'practiv1' : 'cn';
  const d = await pedirJson<Partial<ResultadoBusqueda>>(
    `medicamentos?${parametro}=${encodeURIComponent(texto.trim())}&pagesize=25`,
    {},
    senal,
  );
  return {
    totalFilas: d.totalFilas ?? 0,
    pagina: d.pagina ?? 1,
    tamanioPagina: d.tamanioPagina ?? 25,
    // CIMAVet usa "dispensacion" en lugar de "cpresc": se adapta para la lista común.
    resultados: (d.resultados ?? []).map((m) => ({
      ...m,
      cpresc: (m as unknown as MedicamentoVet).dispensacion?.nombre,
    })),
    consultadoEl: new Date(),
  };
}

/** Ficha de un medicamento veterinario (null si CIMAVet no lo tiene). */
export function obtenerMedicamentoVet(nregistro: string) {
  return pedirJson<MedicamentoVet | null>(`medicamento?nregistro=${encodeURIComponent(nregistro)}`, null);
}

/** Enlace a la ficha pública del medicamento en la web oficial de CIMAVet. */
export function urlFichaCimaVet(nregistro: string): string {
  return `https://cimavet.aemps.es/cimavet/publico/detalle.html?nregistro=${encodeURIComponent(nregistro)}`;
}
