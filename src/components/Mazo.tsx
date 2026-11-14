// "Mazo" de tarjetas deslizables: cada apartado del documento oficial es una tarjeta.
// Se pasa de una a otra deslizando con el dedo, con la barra de apartados o con las flechas.
// El texto de cada tarjeta se pide a CIMA solo cuando la tarjeta está visible o al lado.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { fechaCorta, obtenerSeccion, type SeccionDoc } from '../lib/cima';
import { sanearHtml } from '../lib/sanear';
import { IconoApartado } from './IconosFicha';

export interface Apartado {
  seccion: string; // número oficial ("4.2") o del prospecto ("1")
  titulo: string; // título por defecto si CIMA aún no lo ha devuelto
  corto: string; // texto breve para la barra de apartados
  icono: string;
  tono?: 'peligro' | 'precaucion';
}

const NO_DISPONIBLE = 'Información no disponible en la fuente.';

export default function Mazo({ apartados, tipo, nr, version, fechaDoc, nombreDoc }: {
  apartados: Apartado[];
  tipo: 1 | 2;
  nr: string;
  version: number;
  fechaDoc?: number;
  nombreDoc: string;
}) {
  const pista = useRef<HTMLDivElement>(null);
  const barra = useRef<HTMLDivElement>(null);
  const tarjetas = useRef<(HTMLElement | null)[]>([]);
  const [activo, setActivo] = useState(0);
  const [alto, setAlto] = useState<number | undefined>(undefined);
  const [vistas, setVistas] = useState<Set<number>>(() => new Set([0, 1]));

  // Detecta qué tarjeta se ve al deslizar.
  const alDeslizar = () => {
    const p = pista.current;
    if (!p) return;
    const i = Math.round(p.scrollLeft / p.clientWidth);
    if (i !== activo) setActivo(Math.max(0, Math.min(apartados.length - 1, i)));
  };

  // Marca como "vistas" la tarjeta activa y sus vecinas, para cargar su texto.
  useEffect(() => {
    setVistas((v) => {
      const n = new Set(v);
      [activo - 1, activo, activo + 1].forEach((i) => i >= 0 && i < apartados.length && n.add(i));
      return n.size === v.size ? v : n;
    });
    // Centra el botón activo en la barra de apartados.
    const b = barra.current;
    const boton = b?.children[activo] as HTMLElement | undefined;
    if (b && boton) b.scrollTo({ left: boton.offsetLeft - b.clientWidth / 2 + boton.clientWidth / 2, behavior: 'smooth' });
  }, [activo, apartados.length]);

  // El mazo toma la altura de la tarjeta activa (así no quedan huecos con tarjetas cortas).
  useLayoutEffect(() => {
    const t = tarjetas.current[activo];
    if (!t) return;
    const medir = () => setAlto(t.offsetHeight);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(t);
    return () => ro.disconnect();
  }, [activo]);

  const ir = useCallback((i: number) => {
    const p = pista.current;
    if (!p) return;
    p.scrollTo({ left: i * p.clientWidth, behavior: 'smooth' });
    // Si el principio del mazo quedó por encima de la pantalla, se sube hasta él.
    const arriba = p.getBoundingClientRect().top;
    if (arriba < 120) window.scrollBy({ top: arriba - 130, behavior: 'smooth' });
  }, []);

  return (
    <div className="mazo">
      <div className="mazo-barra" ref={barra} role="tablist" aria-label={`Apartados de ${nombreDoc}`}>
        {apartados.map((a, i) => (
          <button
            key={a.seccion}
            type="button"
            role="tab"
            aria-selected={i === activo}
            className={`mazo-chip ${a.tono ? `tono-${a.tono}` : ''}`}
            onClick={() => ir(i)}
          >
            {tipo === 1 && <span className="mazo-chip-num">{a.seccion}</span>}
            {a.corto}
          </button>
        ))}
      </div>

      <div className="mazo-pista" ref={pista} onScroll={alDeslizar} style={{ height: alto }}>
        {apartados.map((a, i) => (
          <Tarjeta
            key={a.seccion}
            refTarjeta={(el) => (tarjetas.current[i] = el)}
            apartado={a}
            tipo={tipo}
            nr={nr}
            version={version}
            cargar={vistas.has(i)}
            posicion={`${i + 1} de ${apartados.length}`}
            fuente={`${nombreDoc}${fechaDoc ? `, versión del ${fechaCorta(fechaDoc)}` : ''}`}
            siguiente={i < apartados.length - 1 ? apartados[i + 1] : undefined}
            irSiguiente={() => ir(i + 1)}
            tipoNumero={tipo === 1}
          />
        ))}
      </div>

      <div className="mazo-pie">
        <button type="button" className="mazo-flecha" onClick={() => ir(activo - 1)} disabled={activo === 0} aria-label="Apartado anterior">‹</button>
        <div className="mazo-puntos" aria-hidden="true">
          {apartados.map((a, i) => <span key={a.seccion} className={i === activo ? 'activo' : ''} />)}
        </div>
        <button type="button" className="mazo-flecha" onClick={() => ir(activo + 1)} disabled={activo === apartados.length - 1} aria-label="Apartado siguiente">›</button>
      </div>
    </div>
  );
}

type Carga = { estado: 'cargando' } | { estado: 'error' } | { estado: 'ok'; datos: SeccionDoc[] };

function Tarjeta({ refTarjeta, apartado, tipo, nr, version, cargar, posicion, fuente, siguiente, irSiguiente, tipoNumero }: {
  refTarjeta: (el: HTMLElement | null) => void;
  apartado: Apartado;
  tipo: 1 | 2;
  nr: string;
  version: number;
  cargar: boolean;
  posicion: string;
  fuente: string;
  siguiente?: Apartado;
  irSiguiente: () => void;
  tipoNumero: boolean;
}) {
  const [carga, setCarga] = useState<Carga | null>(null);

  const pedir = useCallback(() => {
    setCarga({ estado: 'cargando' });
    obtenerSeccion(tipo, nr, apartado.seccion)
      .then((d) => setCarga({ estado: 'ok', datos: d }))
      .catch(() => setCarga({ estado: 'error' }));
  }, [tipo, nr, apartado.seccion]);

  useEffect(() => setCarga(null), [version]); // "Actualizar" vuelve a pedirlo todo
  useEffect(() => {
    if (cargar && carga === null) pedir();
  }, [cargar, carga, pedir]);

  const principal = carga?.estado === 'ok' ? carga.datos.find((d) => d.seccion === apartado.seccion) : undefined;
  const titulo = principal?.titulo || apartado.titulo;

  return (
    <article ref={refTarjeta} className={`tarjeta-apartado ${apartado.tono ? `tono-${apartado.tono}` : ''}`} aria-label={titulo}>
      <header className="tarjeta-apartado-cabecera">
        <span className="tarjeta-apartado-icono"><IconoApartado nombre={apartado.icono} /></span>
        <div>
          <p className="tarjeta-apartado-num">{tipoNumero ? `Apartado ${apartado.seccion}` : `Punto ${apartado.seccion}`} · {posicion}</p>
          <h3 className="tarjeta-apartado-titulo">{titulo}</h3>
        </div>
      </header>

      <div className="tarjeta-apartado-cuerpo">
        {(carga === null || carga.estado === 'cargando') && (
          <div className="esqueleto" aria-label="Cargando texto oficial">
            <span /><span /><span /><span />
          </div>
        )}
        {carga?.estado === 'error' && (
          <p className="aviso aviso-error">
            No se ha podido cargar. <button type="button" className="enlace-boton" onClick={pedir}>Reintentar</button>
          </p>
        )}
        {carga?.estado === 'ok' && carga.datos.length === 0 && <p className="nota">{NO_DISPONIBLE}</p>}
        {carga?.estado === 'ok' &&
          carga.datos.map((parte) => (
            <div key={parte.seccion}>
              {parte.seccion !== apartado.seccion && (
                <h4 className="subseccion">{tipoNumero ? `${parte.seccion} ` : ''}{parte.titulo}</h4>
              )}
              <div className="texto-oficial" dangerouslySetInnerHTML={{ __html: sanearHtml(parte.contenido ?? '') }} />
            </div>
          ))}
      </div>

      <footer className="tarjeta-apartado-pie">
        <span className="nota">Texto oficial · {fuente}</span>
        {siguiente && (
          <button type="button" className="boton-siguiente" onClick={irSiguiente}>
            {tipoNumero ? `${siguiente.seccion} ` : ''}{siguiente.corto} →
          </button>
        )}
      </footer>
    </article>
  );
}
