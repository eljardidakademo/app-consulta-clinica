// Buscador de medicamentos en tiempo real: uso humano (CIMA) o uso veterinario (CIMAVet),
// ambos de la AEMPS. Muestra solo lo que devuelve la fuente, con la fecha de consulta.
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ListaMedicamentos } from './TarjetaMed';
import { buscarMedicamentos, formatearFecha, type ModoBusqueda, type ResultadoBusqueda } from '../lib/cima';
import { buscarMedicamentosVet } from '../lib/cimavet';
import { IconoBuscar } from './Iconos';

export type Uso = 'humano' | 'vet';
/** Uso elegido, guardado en la dirección (?uso=vet). */
export function usoDeParams(p: URLSearchParams): Uso {
  return p.get('uso') === 'vet' ? 'vet' : 'humano';
}

const MODOS: { valor: ModoBusqueda; texto: string; ayuda: string; ayudaVet: string }[] = [
  { valor: 'nombre', texto: 'Nombre', ayuda: 'Ej.: Enantyum, paracetamol cinfa', ayudaVet: 'Ej.: Metacam, Apsamix' },
  { valor: 'principio', texto: 'Principio activo', ayuda: 'Ej.: ibuprofeno, metformina', ayudaVet: 'Ej.: meloxicam, amoxicilina' },
  { valor: 'cn', texto: 'Código nacional', ayuda: 'Ej.: 712729', ayudaVet: 'Ej.: 570972' },
];

type Estado =
  | { tipo: 'inicio' }
  | { tipo: 'cargando' }
  | { tipo: 'error'; mensaje: string }
  | { tipo: 'ok'; datos: ResultadoBusqueda };

export default function BuscadorMedicamentos({ autoFocus = false }: { autoFocus?: boolean }) {
  // La búsqueda se guarda en la dirección (?q=…&modo=…) para que, al volver de una
  // ficha, los resultados sigan ahí sin tener que buscar de nuevo.
  const [params, setParams] = useSearchParams();
  const [texto, setTextoLocal] = useState(params.get('q') ?? '');
  const modoUrl = params.get('modo');
  const modo: ModoBusqueda = modoUrl === 'principio' || modoUrl === 'cn' ? modoUrl : 'nombre';
  const uso = usoDeParams(params);
  const actualizarUrl = (q: string, m: ModoBusqueda, u: Uso) => {
    const nuevos: Record<string, string> = {};
    if (u === 'vet') nuevos.uso = 'vet';
    if (q) nuevos.q = q;
    if (m !== 'nombre') nuevos.modo = m;
    setParams(nuevos, { replace: true });
  };
  const setTexto = (q: string) => {
    setTextoLocal(q);
    actualizarUrl(q, modo, uso);
  };
  const setModo = (m: ModoBusqueda) => actualizarUrl(texto, m, uso);
  const setUso = (u: Uso) => actualizarUrl(texto, modo, u);
  const fuente = uso === 'vet' ? 'CIMAVet' : 'CIMA';
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
        const buscar = uso === 'vet' ? buscarMedicamentosVet : buscarMedicamentos;
        const datos = await buscar(consulta, modo, c.signal);
        setEstado({ tipo: 'ok', datos });
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
        setEstado({
          tipo: 'error',
          mensaje: navigator.onLine
            ? `No se ha podido consultar ${uso === 'vet' ? 'CIMAVet' : 'CIMA'}. Inténtalo de nuevo en unos segundos.`
            : 'Sin conexión. Las búsquedas ya hechas siguen disponibles; las nuevas necesitan internet.',
        });
      }
    }, 400);
    return () => clearTimeout(temporizador);
  }, [texto, modo, uso]);

  const modoActual = MODOS.find((m) => m.valor === modo)!;
  const ayuda = uso === 'vet' ? modoActual.ayudaVet : modoActual.ayuda;

  return (
    <section className="buscador">
      <div className="segmentos selector-uso" role="radiogroup" aria-label="Tipo de medicamento">
        <button type="button" role="radio" aria-checked={uso === 'humano'} className="segmento" onClick={() => setUso('humano')}>
          Uso humano
        </button>
        <button type="button" role="radio" aria-checked={uso === 'vet'} className="segmento" onClick={() => setUso('vet')}>
          Uso veterinario
        </button>
      </div>

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
        {estado.tipo === 'cargando' && <p className="nota">Consultando {fuente}…</p>}
        {estado.tipo === 'error' && <p className="aviso aviso-error">{estado.mensaje}</p>}
        {estado.tipo === 'ok' && <Resultados datos={estado.datos} vet={uso === 'vet'} />}
      </div>
    </section>
  );
}

function Resultados({ datos, vet }: { datos: ResultadoBusqueda; vet: boolean }) {
  const fuente = vet ? 'CIMAVet' : 'CIMA';
  if (datos.resultados.length === 0) {
    return <p className="nota">Información no disponible en la fuente: {fuente} no devuelve medicamentos para esta búsqueda.</p>;
  }
  return (
    <>
      <p className="nota">
        {datos.totalFilas > datos.resultados.length
          ? `Primeros ${datos.resultados.length} de ${datos.totalFilas} resultados. Afina la búsqueda para ver otros.`
          : `${datos.totalFilas} resultado${datos.totalFilas === 1 ? '' : 's'}.`}
      </p>
      <ListaMedicamentos meds={datos.resultados} vet={vet} />
      <p className="fuente">
        Fuente: {fuente}, Agencia Española de Medicamentos y Productos Sanitarios (AEMPS). Consultado el {formatearFecha(datos.consultadoEl)}.
        Toca un medicamento para ver su ficha.
      </p>
    </>
  );
}
