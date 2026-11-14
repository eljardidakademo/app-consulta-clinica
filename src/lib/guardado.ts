// Favoritos e historial de fichas consultadas, guardados solo en este dispositivo.
// No se envían a ningún sitio. Si el navegador no permite guardar, la app sigue funcionando.
import { useEffect, useState } from 'react';

export interface MedGuardado {
  nregistro: string;
  nombre: string;
  pactivos?: string;
  fecha: string; // ISO: cuándo se guardó o se consultó
}

const CLAVES = { favoritos: 'farmacia-favoritos', historial: 'farmacia-historial' } as const;
type Lista = keyof typeof CLAVES;
const MAX_HISTORIAL = 30;
const EVENTO = 'guardado-cambiado';

function leer(lista: Lista): MedGuardado[] {
  try {
    return JSON.parse(localStorage.getItem(CLAVES[lista]) ?? '[]');
  } catch {
    return [];
  }
}
function escribir(lista: Lista, datos: MedGuardado[]) {
  try {
    localStorage.setItem(CLAVES[lista], JSON.stringify(datos));
  } catch {
    /* sin almacenamiento */
  }
  window.dispatchEvent(new Event(EVENTO));
}

export function anadirHistorial(m: Omit<MedGuardado, 'fecha'>) {
  const resto = leer('historial').filter((x) => x.nregistro !== m.nregistro);
  escribir('historial', [{ ...m, fecha: new Date().toISOString() }, ...resto].slice(0, MAX_HISTORIAL));
}
export function borrarHistorial() {
  escribir('historial', []);
}
export function alternarFavorito(m: Omit<MedGuardado, 'fecha'>) {
  const actual = leer('favoritos');
  const existe = actual.some((x) => x.nregistro === m.nregistro);
  escribir('favoritos', existe ? actual.filter((x) => x.nregistro !== m.nregistro) : [{ ...m, fecha: new Date().toISOString() }, ...actual]);
}

/** Lista guardada que se actualiza sola cuando cambia (también desde otra pestaña). */
export function useGuardados(lista: Lista): MedGuardado[] {
  const [datos, setDatos] = useState(() => leer(lista));
  useEffect(() => {
    const refrescar = () => setDatos(leer(lista));
    window.addEventListener(EVENTO, refrescar);
    window.addEventListener('storage', refrescar);
    return () => {
      window.removeEventListener(EVENTO, refrescar);
      window.removeEventListener('storage', refrescar);
    };
  }, [lista]);
  return datos;
}
