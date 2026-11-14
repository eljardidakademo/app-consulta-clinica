// Módulo 2: Anatomía. Atlas 3D por capas con modelos de licencia abierta (Z-Anatomy).
// Cada sistema se descarga solo cuando se activa, para no saturar el móvil.
// Regla del proyecto: no se inventan datos. La ficha muestra solo lo que traen el modelo
// y la tabla TA2; el resto aparece como «Información no disponible en la fuente».
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { cargarEstructuras, nombreVisible, SISTEMAS, textoLado, type Estructura } from '../lib/anatomia';
import { normalizar } from '../lib/cruce';
import type { VisorAnatomia } from '../lib/visor';

const BASE = import.meta.env.BASE_URL;
const NO_DISPONIBLE = 'Información no disponible en la fuente.';

type EstadoCapa = { activa: boolean; opacidad: number; carga: 'no' | 'cargando' | 'ok' | 'error'; progreso: number };

export default function Anatomia() {
  const lienzo = useRef<HTMLDivElement>(null);
  const visor = useRef<VisorAnatomia | null>(null);
  const [errorVisor, setErrorVisor] = useState<string | null>(null);
  const [capas, setCapas] = useState<Record<string, EstadoCapa>>(() =>
    Object.fromEntries(SISTEMAS.map((s) => [s.id, { activa: s.id === 'esqueleto', opacidad: s.opacidad, carga: 'no', progreso: 0 }])),
  );
  const [estructuras, setEstructuras] = useState<Map<string, Estructura> | null>(null);
  const [seleccion, setSeleccion] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');

  // Crea el visor (three.js se descarga aparte, solo al entrar en Anatomía).
  useEffect(() => {
    let vivo = true;
    let instancia: VisorAnatomia | null = null;
    import('../lib/visor')
      .then(({ VisorAnatomia }) => {
        if (!vivo || !lienzo.current) return;
        try {
          instancia = new VisorAnatomia(lienzo.current, BASE, setSeleccion);
          visor.current = instancia;
          activar('esqueleto', true);
        } catch {
          setErrorVisor('Este dispositivo o navegador no permite mostrar gráficos 3D (WebGL).');
        }
      })
      .catch(() => setErrorVisor('No se ha podido cargar el visor 3D. Comprueba la conexión.'));
    cargarEstructuras(BASE).then((m) => vivo && setEstructuras(m)).catch(() => undefined);
    return () => {
      vivo = false;
      instancia?.destruir();
      visor.current = null;
    };
  }, []);

  const cambiarCapa = (id: string, cambios: Partial<EstadoCapa>) => setCapas((c) => ({ ...c, [id]: { ...c[id], ...cambios } }));

  /** Activa o desactiva una capa; la primera vez descarga su modelo. */
  function activar(id: string, activa: boolean): Promise<void> {
    const v = visor.current;
    cambiarCapa(id, { activa });
    if (!v) return Promise.resolve();
    if (!activa) {
      v.mostrarSistema(id, false);
      return Promise.resolve();
    }
    if (v.estaCargado(id)) {
      v.mostrarSistema(id, true);
      return Promise.resolve();
    }
    cambiarCapa(id, { carga: 'cargando', progreso: 0 });
    return v
      .cargarSistema(id, (p) => cambiarCapa(id, { progreso: p }))
      .then(() => {
        cambiarCapa(id, { carga: 'ok' });
        v.mostrarSistema(id, true);
      })
      .catch(() => cambiarCapa(id, { carga: 'error', activa: false }));
  }

  function cambiarOpacidad(id: string, valor: number) {
    cambiarCapa(id, { opacidad: valor });
    visor.current?.opacidad(id, valor);
  }

  async function irA(e: Estructura) {
    setBusqueda('');
    await activar(e.sistema, true);
    visor.current?.seleccionar(e.nodo, true);
    setSeleccion(e.nodo);
    lienzo.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  const resultados = useMemo(() => {
    const q = normalizar(busqueda.trim());
    if (!estructuras || q.length < 3) return [];
    // Primero los nombres que empiezan por lo buscado y, entre ellos, los más cortos.
    const lista: { e: Estructura; orden: number }[] = [];
    for (const e of estructuras.values()) {
      const es = normalizar(e.es);
      const todo = normalizar(`${e.es} ${e.la} ${e.ingles}`);
      if (!todo.includes(q)) continue;
      const empieza = es.startsWith(q) || normalizar(e.la).startsWith(q) || normalizar(e.ingles).startsWith(q);
      const palabra = new RegExp(`(^|\\s)${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).test(es);
      lista.push({ e, orden: (empieza ? 0 : palabra ? 1000 : 2000) + nombreVisible(e).length });
    }
    return lista.sort((a, b) => a.orden - b.orden).slice(0, 40).map((x) => x.e);
  }, [busqueda, estructuras]);

  const sel = seleccion && estructuras ? estructuras.get(seleccion) : undefined;

  return (
    <div className="pagina pagina-anatomia" data-modulo="anatomia">
      <header className="pagina-cabecera">
        <p className="pagina-antetitulo">Módulo 2 · Atlas 3D</p>
        <h1>Anatomía</h1>
      </header>

      <label className="campo">
        <input
          type="search"
          placeholder="Buscar estructura: fémur, nervio ciático…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          aria-label="Buscar estructura anatómica"
        />
      </label>
      {busqueda.trim().length >= 3 && (
        <ul className="resultados-anatomia">
          {!estructuras && <li className="nota">Cargando la lista de estructuras…</li>}
          {estructuras && resultados.length === 0 && <li className="nota">No hay estructuras con ese nombre en el modelo.</li>}
          {resultados.map((e) => (
            <li key={e.nodo}>
              <button type="button" onClick={() => irA(e)}>
                <span className="res-nombre">{nombreVisible(e)}{e.lado ? ` (${textoLado(e.lado)})` : ''}</span>
                <span className="res-detalle">{e.la || e.ingles} · {SISTEMAS.find((s) => s.id === e.sistema)?.nombre}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="visor-3d" ref={lienzo}>
        {errorVisor && <p className="aviso aviso-error visor-error">{errorVisor}</p>}
        <button type="button" className="visor-boton" onClick={() => visor.current?.recentrar()} aria-label="Recentrar la vista">⤢</button>
        {SISTEMAS.some((s) => capas[s.id].carga === 'cargando') && (
          <p className="visor-carga">
            Cargando{' '}
            {SISTEMAS.filter((s) => capas[s.id].carga === 'cargando').map((s) => `${s.nombre.toLowerCase()} ${Math.round(capas[s.id].progreso * 100)} %`).join(', ')}
          </p>
        )}
      </div>
      <p className="nota visor-ayuda">Un dedo gira, dos dedos amplían y desplazan. Toca una estructura para ver su ficha.</p>

      {sel && (
        <section className="ficha-estructura" aria-live="polite">
          <p className="ficha-estructura-sistema">
            {SISTEMAS.find((s) => s.id === sel.sistema)?.nombre}
            {sel.lado ? ` · lado ${textoLado(sel.lado)}` : ''}
          </p>
          <h2>{sel.es || <span className="nota">Nombre en castellano no disponible en la fuente</span>}</h2>
          <dl className="datos">
            <div className="dato"><dt>Latín (TA2)</dt><dd>{sel.la || <span className="nota">{NO_DISPONIBLE}</span>}</dd></div>
            <div className="dato"><dt>Nombre en el modelo</dt><dd>{sel.ingles}</dd></div>
            <div className="dato"><dt>Identificador TA2</dt><dd>{sel.ta2 || <span className="nota">{NO_DISPONIBLE}</span>}</dd></div>
            <div className="dato">
              <dt>Descripción (origen, inserción, inervación, irrigación, función…)</dt>
              <dd><span className="nota">{NO_DISPONIBLE} Se añadirá con fuente citada y validación.</span></dd>
            </div>
          </dl>
          <div className="botones-enlace">
            <button type="button" className="boton-enlace" onClick={() => visor.current?.seleccionar(sel.nodo, true)}>Enfocar</button>
            <button type="button" className="boton-enlace" onClick={() => visor.current?.aislar(sel.nodo)}>Aislar</button>
            <button type="button" className="boton-enlace" onClick={() => visor.current?.ocultar(sel.nodo)}>Ocultar</button>
            <button type="button" className="boton-enlace" onClick={() => visor.current?.mostrarTodo()}>Mostrar todo</button>
            <button type="button" className="boton-enlace" onClick={() => { visor.current?.seleccionar(null); setSeleccion(null); }}>Cerrar</button>
          </div>
          <p className="fuente">
            Nombres: tabla TA2 incluida en Z-Anatomy (Terminologia Anatomica, 2.ª ed.). Traducción al castellano sin validar
            (borrador).
          </p>
        </section>
      )}

      <section className="seccion-ficha">
        <h2 className="seccion-ficha-titulo">Capas</h2>
        <p className="nota">De la más superficial a la más profunda. Cada capa se descarga la primera vez que la activas.</p>
        <ul className="lista-capas">
          {SISTEMAS.map((s) => {
            const c = capas[s.id];
            return (
              <li key={s.id} className={`capa ${c.activa ? 'activa' : ''}`}>
                <label className="capa-fila">
                  <input type="checkbox" checked={c.activa} onChange={(e) => activar(s.id, e.target.checked)} />
                  <span className="capa-color" style={{ background: s.color }} aria-hidden="true" />
                  <span className="capa-nombre">{s.nombre}</span>
                  {c.carga === 'cargando' && <span className="nota">{Math.round(c.progreso * 100)} %</span>}
                  {c.carga === 'error' && <span className="nota aviso-error">Error al descargar</span>}
                </label>
                {c.activa && c.carga === 'ok' && (
                  <label className="capa-opacidad">
                    <span>Opacidad</span>
                    <input type="range" min={0.1} max={1} step={0.05} value={c.opacidad} onChange={(e) => cambiarOpacidad(s.id, Number(e.target.value))} />
                  </label>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <p className="fuente">
        Modelo 3D: Z-Anatomy, el atlas 3D libre de anatomía (CC BY-SA 4.0), basado en BodyParts3D, © The Database Center
        for Life Science (CC BY-SA 2.1 Japón). Malla simplificada para el móvil. <Link to="/acerca">Créditos completos</Link>
      </p>
    </div>
  );
}
