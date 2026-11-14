// Buscador de medicamentos de uso humano contra CIMA (AEMPS), en tiempo real.
// Muestra solo lo que devuelve CIMA, con la fuente y la fecha de consulta.
import { useEffect, useRef, useState } from 'react';
import { buscarMedicamentos, formatearFecha, urlFichaCima, type ModoBusqueda, type ResultadoBusqueda } from '../lib/cima';
import { IconoBuscar } from './Iconos';

const MODOS: { valor: ModoBusqueda; texto: string; ayuda: string }[] = [
  { valor: 'nombre', texto: 'Nombre', ayuda: 'Ej.: Enantyum, paracetamol cinfa' },
  { valor: 'principio', texto: 'Principio activo', ayuda: 'Ej.: ibuprofeno, metformina' },
  { valor: 'cn', texto: 'Código nacional', ayuda: 'Ej.: 712729' },
];

type Estado =
  | { tipo: 'inicio' }
  | { tipo: 'cargando' }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'ok'; datos: ResultadoBusqueda };

export default function BuscadorMedicamentos({ autoFocus = false }: { autoFocus?: boolean }) {
  const [texto, setTexto] = useState('');
  const [modo, setModo] = useState<ModoBusqueda>('nombre');
  const [estado, setEstado] = useState<Estado>({ tipo: 'inicio' });
  const controlador = useRef<AbortController | null>(null);

  // Busca automáticamente 400 ms después de dejar de escribir (mínimo 3 caracteres).
  useEffect(() => {
    const consulta = texto.trim();
    if (consulta.length < 3) {
      setEstado({ tipo: 'inicio' });
      return;
    }
    const temporizador = setTimeout(async () => {
      controlador.current?.abort();
      const c = new AbortController();
      controlador.current = c;
      setEstado({ tipo: 'cargando' });
      try {
        const datos = await buscarMedicamentos(consulta, modo, c.signal);
        setEstado({ tipo: 'ok', datos });
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setEstado({
          tipo: 'error',
          mensaje: navigator.onLine
            ? 'No se ha podido consultar CIMA. Inténtalo de nuevo en unos segundos.'
            : 'Sin conexión. Las búsquedas ya hechas siguen disponibles; las nuevas necesitan internet.',
        });
      }
    }, 400);
    return () => clearTimeout(temporizador);
  }, [texto, modo]);

  const ayuda = MODOS.find((m) => m.valor === modo)!.ayuda;

  return (
    <section className="buscador">
      <div className="segmentos" role="radiogroup" aria-label="Buscar por">
        {MODOS.map((m) => (
          <button
            key={m.valor}
            type="button"
            role="radio"
            aria-checked={modo === m.valor}
            className="segmento"
            onClick={() => setModo(m.valor)}
          >
            {m.texto}
          </button>
        ))}
      </div>

      <label className="campo">
        <IconoBuscar className="campo-icono" />
        <input
          type="search"
          inputMode={modo === 'cn' ? 'numeric' : 'search'}
          placeholder={ayuda}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          autoFocus={autoFocus}
          aria-label="Buscar medicamento"
        />
      </label>

      <div aria-live="polite">
        {estado.tipo === 'cargando' && <p className="nota">Consultando CIMA…</p>}
        {estado.tipo === 'error' && <p className="aviso aviso-error">{estado.mensaje}</p>}
        {estado.tipo === 'ok' && <Resultados datos={estado.datos} />}
      </div>
    </section>
  );
}

function Resultados({ datos }: { datos: ResultadoBusqueda }) {
  if (datos.resultados.length === 0) {
    return <p className="nota">Información no disponible en la fuente: CIMA no devuelve medicamentos para esta búsqueda.</p>;
  }
  return (
    <>
      <p className="nota">
        {datos.totalFilas > datos.resultados.length
          ? `Primeros ${datos.resultados.length} de ${datos.totalFilas} resultados. Afina la búsqueda para ver otros.`
          : `${datos.totalFilas} resultado${datos.totalFilas === 1 ? '' : 's'}.`}
      </p>
      <ul className="lista-resultados">
        {datos.resultados.map((m) => (
          <li key={m.nregistro}>
            <a className="tarjeta-med" href={urlFichaCima(m.nregistro)} target="_blank" rel="noreferrer">
              <span className="med-nombre">{m.nombre}</span>
              <span className="med-lab">{m.labtitular}</span>
              <span className="med-etiquetas">
                <span className="chip chip-humano">Uso humano</span>
                {m.cpresc && <span className="chip">{m.cpresc}</span>}
                {m.comerc === false && <span className="chip chip-apagado">No comercializado</span>}
                {m.psum && <span className="chip chip-alerta">Problema de suministro</span>}
              </span>
            </a>
          </li>
        ))}
      </ul>
      <p className="fuente">
        Fuente: CIMA, Agencia Española de Medicamentos y Productos Sanitarios (AEMPS). Consultado el {formatearFecha(datos.consultadoEl)}.
        Cada resultado abre la ficha oficial en CIMA.
      </p>
    </>
  );
}
