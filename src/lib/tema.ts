// Gestión del modo claro / oscuro.
// "auto" sigue el ajuste del sistema; "claro" y "oscuro" lo fuerzan.
import { useEffect, useState } from 'react';

export type Tema = 'auto' | 'claro' | 'oscuro';

function leer(): Tema {
  try {
    const t = localStorage.getItem('tema');
    if (t === 'claro' || t === 'oscuro') return t;
  } catch {
    /* almacenamiento no disponible: se usa el modo automático */
  }
  return 'auto';
}

export function useTema() {
  const [tema, setTema] = useState<Tema>(leer);

  useEffect(() => {
    const raiz = document.documentElement;
    if (tema === 'auto') delete raiz.dataset.theme;
    else raiz.dataset.theme = tema === 'oscuro' ? 'dark' : 'light';
    try {
      if (tema === 'auto') localStorage.removeItem('tema');
      else localStorage.setItem('tema', tema);
    } catch {
      /* sin almacenamiento: el tema dura solo esta sesión */
    }
  }, [tema]);

  // Ciclo al pulsar el botón: auto → oscuro → claro → auto.
  const siguiente = () => setTema((t) => (t === 'auto' ? 'oscuro' : t === 'oscuro' ? 'claro' : 'auto'));
  return { tema, siguiente };
}
