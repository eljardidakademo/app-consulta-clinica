// Ficha de un medicamento de uso humano, con los datos y textos oficiales de CIMA.
// Regla: el texto clínico se muestra tal cual lo publica la AEMPS, sin resumir ni reescribir.
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  fechaCorta, formatearFecha, obtenerIndice, obtenerMedicamento, obtenerNotas, obtenerSeccion, urlFichaCima,
  type MedicamentoDetalle, type NotaSeguridad, type SeccionDoc,
} from '../lib/cima';
import { sanearHtml } from '../lib/sanear';

// Secciones de la ficha técnica que se muestran en la tarjeta rápida, con su numeración oficial.
const SECCIONES_FT = [
  { n: '4.1', t: 'Indicaciones terapéuticas' },
  { n: '4.2', t: 'Posología y forma de administración' },
  { n: '4.3', t: 'Contraindicaciones' },
  { n: '4.4', t: 'Advertencias y precauciones especiales de empleo' },
  { n: '4.5', t: 'Interacción con otros medicamentos y otras formas de interacción' },
  { n: '4.6', t: 'Fertilidad, embarazo y lactancia' },
  { n: '4.8', t: 'Reacciones adversas' },
  { n: '4.9', t: 'Sobredosis' },
  { n: '5.1', t: 'Propiedades farmacodinámicas' },
  { n: '5.2', t: 'Propiedades farmacocinéticas' },
];

const NO_DISPONIBLE = 'Información no disponible en la fuente.';

// Fecha de la última consulta con conexión, guardada en el dispositivo.
function leerFechaConsulta(nr: string): Date | null {
  try {
    const v = localStorage.getItem(`cima-consulta:${nr}`);
    return v ? new Date(v) : null;
  } catch {
    return null;
  }
}
function guardarFechaConsulta(nr: string, fecha: Date) {
  try {
    localStorage.setItem(`cima-consulta:${nr}`, fecha.toISOString());
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
}

type Carga<T> = { estado: 'cargando' } | { estado: 'error' } | { estado: 'ok'; datos: T };

export default function FichaMedicamento() {
  const { nregistro = '' } = useParams();
  const navegar = useNavigate();
  const [version, setVersion] = useState(0); // al cambiar, se vuelve a pedir todo
  const [med, setMed] = useState<Carga<MedicamentoDetalle | null>>({ estado: 'cargando' });
  const [notas, setNotas] = useState<NotaSeguridad[]>([]);
  const [consultado, setConsultado] = useState<{ fecha: Date; sinConexion: boolean } | null>(null);

  useEffect(() => {
    let vivo = true;
    setMed({ estado: 'cargando' });
    Promise.all([obtenerMedicamento(nregistro), obtenerNotas(nregistro).catch(() => [])])
      .then(([m, n]) => {
        if (!vivo) return;
        setMed({ estado: 'ok', datos: m });
        setNotas(n);
        if (navigator.onLine) {
          const ahora = new Date();
          guardarFechaConsulta(nregistro, ahora);
          setConsultado({ fecha: ahora, sinConexion: false });
        } else {
          const f = leerFechaConsulta(nregistro);
          setConsultado(f ? { fecha: f, sinConexion: true } : null);
        }
      })
      .catch(() => vivo && setMed({ estado: 'error' }));
    return () => {
      vivo = false;
    };
  }, [nregistro, version]);

  const volver = () => (window.history.length > 1 ? navegar(-1) : navegar('/farmacia'));

  return (
    <div className="pagina ficha" data-modulo="farmacia">
      <button type="button" className="volver" onClick={volver}>
        ← Volver a los resultados
      </button>

      {med.estado === 'cargando' && <p className="nota">Consultando CIMA…</p>}
      {med.estado === 'error' && (
        <div className="aviso aviso-error">
          No se ha podido consultar CIMA{navigator.onLine ? '' : ' (sin conexión)'}.{' '}
          <button type="button" className="enlace-boton" onClick={() => setVersion((v) => v + 1)}>Reintentar</button>
        </div>
      )}
      {med.estado === 'ok' && !med.datos && <p className="aviso">{NO_DISPONIBLE}</p>}
      {med.estado === 'ok' && med.datos && (
        <Contenido
          m={med.datos}
          notas={notas}
          version={version}
          consultado={consultado}
          actualizar={() => setVersion((v) => v + 1)}
        />
      )}
    </div>
  );
}

function Contenido({ m, notas, version, consultado, actualizar }: {
  m: MedicamentoDetalle;
  notas: NotaSeguridad[];
  version: number;
  consultado: { fecha: Date; sinConexion: boolean } | null;
  actualizar: () => void;
}) {
  const ft = m.docs?.find((d) => d.tipo === 1);
  const prospecto = m.docs?.find((d) => d.tipo === 2);
  const conSuministro = (m.presentaciones ?? []).filter((p) => p.psum && p.detalleProblemaSuministro);

  return (
    <>
      {/* ---------- Cabecera ---------- */}
      <header className="ficha-cabecera">
        <p className="pagina-antetitulo">Ficha del medicamento</p>
        <h1 className="ficha-nombre">{m.nombre}</h1>
        {m.pactivos && <p className="ficha-pactivos">{m.pactivos}</p>}
        <div className="med-etiquetas">
          <span className="chip chip-humano">Uso humano</span>
          {m.cpresc && <span className="chip">{m.cpresc}</span>}
          {m.generico && <span className="chip">Genérico (EFG)</span>}
          {m.comerc === false && <span className="chip chip-apagado">No comercializado</span>}
          {m.triangulo && <span className="chip chip-alerta">▼ Seguimiento adicional</span>}
          {m.conduc && <span className="chip chip-alerta">Afecta a la conducción</span>}
          {m.huerfano && <span className="chip">Medicamento huérfano</span>}
          {m.biosimilar && <span className="chip">Biosimilar</span>}
        </div>
      </header>

      {/* ---------- Alertas ---------- */}
      {(notas.length > 0 || conSuministro.length > 0) && (
        <section className="bloque bloque-alerta">
          <h2 className="bloque-titulo">Alertas de la AEMPS</h2>
          {conSuministro.map((p) => (
            <div key={p.cn} className="alerta">
              <strong>Problema de suministro</strong> · CN {p.cn}
              <br />
              <span className="nota">
                {p.nombre}. Desde {fechaCorta(p.detalleProblemaSuministro!.fini)}
                {p.detalleProblemaSuministro!.ffin ? `, previsto hasta ${fechaCorta(p.detalleProblemaSuministro!.ffin)}` : ''}.
              </span>
              {p.detalleProblemaSuministro!.observ && <p className="alerta-texto">{p.detalleProblemaSuministro!.observ}</p>}
            </div>
          ))}
          {notas.map((n, i) => (
            <div key={i} className="alerta">
              <strong>Nota de seguridad</strong>
              {n.fecha ? ` · ${fechaCorta(n.fecha)}` : ''}
              {n.referencia ? ` · ${n.referencia}` : ''}
              <p className="alerta-texto">
                {n.url ? <a href={n.url} target="_blank" rel="noreferrer">{n.asunto}</a> : n.asunto}
              </p>
            </div>
          ))}
        </section>
      )}

      {/* ---------- Datos administrativos ---------- */}
      <section className="bloque">
        <h2 className="bloque-titulo">Datos de autorización</h2>
        <dl className="datos">
          <Dato t="Laboratorio titular" v={m.labtitular} />
          {m.labcomercializador && m.labcomercializador !== m.labtitular && <Dato t="Comercializa" v={m.labcomercializador} />}
          <Dato t="Estado" v={textoEstado(m)} />
          <Dato t="Prescripción y dispensación" v={m.cpresc} />
          <Dato t="Forma farmacéutica" v={m.formaFarmaceutica?.nombre} />
          <Dato t="Vía" v={m.viasAdministracion?.map((v) => v.nombre).join(', ')} />
          <Dato t="Composición" v={m.principiosActivos?.map((p) => `${p.nombre} ${p.cantidad ?? ''} ${p.unidad ?? ''}`.trim()).join(' · ')} />
          <Dato t="ATC" v={m.atcs?.length ? m.atcs.map((a) => `${a.codigo} ${a.nombre}`).join(' › ') : undefined} />
          <Dato t="Nº de registro" v={m.nregistro} />
        </dl>
        {m.presentaciones && m.presentaciones.length > 0 && (
          <details className="plegable plegable-simple">
            <summary>Presentaciones y códigos nacionales ({m.presentaciones.length})</summary>
            <ul className="presentaciones">
              {m.presentaciones.map((p) => (
                <li key={p.cn}>
                  <strong>CN {p.cn}</strong> · {p.nombre}
                  {p.comerc === false ? ' · no comercializada' : ''}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {/* ---------- Ficha técnica por secciones ---------- */}
      <section className="bloque">
        <h2 className="bloque-titulo">Ficha técnica</h2>
        {ft?.fecha && <p className="nota">Texto oficial de la ficha técnica, versión del {fechaCorta(ft.fecha)}. Toca cada apartado para desplegarlo.</p>}
        {ft?.secc ? (
          SECCIONES_FT.map((s) => <SeccionPlegable key={s.n} tipo={1} nr={m.nregistro} seccion={s.n} tituloPorDefecto={s.t} version={version} />)
        ) : (
          <p className="aviso">CIMA no ofrece esta ficha técnica por secciones. Consúltala en el PDF oficial.</p>
        )}
      </section>

      {/* ---------- Prospecto ---------- */}
      {prospecto?.secc && <Prospecto nr={m.nregistro} version={version} fecha={prospecto.fecha} />}

      {/* ---------- Documentos oficiales ---------- */}
      <section className="bloque">
        <h2 className="bloque-titulo">Documentos oficiales</h2>
        <div className="botones-enlace">
          {ft && <a className="boton-enlace" href={ft.url} target="_blank" rel="noreferrer">Ficha técnica (PDF)</a>}
          {prospecto && <a className="boton-enlace" href={prospecto.url} target="_blank" rel="noreferrer">Prospecto (PDF)</a>}
          <a className="boton-enlace" href={urlFichaCima(m.nregistro)} target="_blank" rel="noreferrer">Ver en CIMA</a>
        </div>
      </section>

      <p className="fuente">
        Fuente: CIMA, Agencia Española de Medicamentos y Productos Sanitarios (AEMPS).{' '}
        {consultado && (
          <>
            Consultado el {formatearFecha(consultado.fecha)}
            {consultado.sinConexion ? ' (copia guardada, sin conexión)' : ''}.{' '}
          </>
        )}
        Texto oficial sin modificar; no sustituye a la ficha técnica completa ni al criterio profesional.{' '}
        <button type="button" className="enlace-boton" onClick={actualizar}>Actualizar</button>
      </p>
      <p className="nota">
        <Link to="/acerca">Fuentes y aviso legal</Link>
      </p>
    </>
  );
}

function Dato({ t, v }: { t: string; v?: string }) {
  return (
    <div className="dato">
      <dt>{t}</dt>
      <dd>{v && v.trim() ? v : <span className="nota">{NO_DISPONIBLE}</span>}</dd>
    </div>
  );
}

function textoEstado(m: MedicamentoDetalle): string | undefined {
  const e = m.estado;
  if (!e) return undefined;
  if (e.rev) return `Revocado el ${fechaCorta(e.rev)}`;
  if (e.susp) return `Suspendido el ${fechaCorta(e.susp)}`;
  if (e.aut) return `Autorizado el ${fechaCorta(e.aut)}${m.comerc === false ? ' · no comercializado' : ''}`;
  return undefined;
}

/** Apartado plegable: el texto se pide a CIMA la primera vez que se abre. */
function SeccionPlegable({ tipo, nr, seccion, tituloPorDefecto, version }: {
  tipo: 1 | 2; nr: string; seccion: string; tituloPorDefecto: string; version: number;
}) {
  const [abierto, setAbierto] = useState(false);
  const [carga, setCarga] = useState<Carga<SeccionDoc[]> | null>(null);

  const cargar = useCallback(() => {
    setCarga({ estado: 'cargando' });
    obtenerSeccion(tipo, nr, seccion)
      .then((d) => setCarga({ estado: 'ok', datos: d }))
      .catch(() => setCarga({ estado: 'error' }));
  }, [tipo, nr, seccion]);

  // Si se pulsa "Actualizar", se vacía lo cargado y se vuelve a pedir al abrir.
  useEffect(() => {
    setCarga(null);
  }, [version]);
  useEffect(() => {
    if (abierto && carga === null) cargar();
  }, [abierto, carga, cargar]);

  const numero = tipo === 1 ? `${seccion} ` : '';
  const principal = carga?.estado === 'ok' ? carga.datos.find((d) => d.seccion === seccion) : undefined;
  const titulo = principal?.titulo || tituloPorDefecto;

  return (
    <details className="plegable" onToggle={(e) => setAbierto((e.target as HTMLDetailsElement).open)}>
      <summary>
        <span className="plegable-num">{numero}</span>
        {titulo}
      </summary>
      <div className="plegable-cuerpo">
        {carga?.estado === 'cargando' && <p className="nota">Cargando texto oficial…</p>}
        {carga?.estado === 'error' && (
          <p className="aviso aviso-error">
            No se ha podido cargar. <button type="button" className="enlace-boton" onClick={cargar}>Reintentar</button>
          </p>
        )}
        {carga?.estado === 'ok' && carga.datos.length === 0 && <p className="nota">{NO_DISPONIBLE}</p>}
        {carga?.estado === 'ok' &&
          carga.datos.map((parte) => (
            <div key={parte.seccion}>
              {/* Las subsecciones (4.2.1, 4.6.2…) llevan su número y título oficiales */}
              {parte.seccion !== seccion && (
                <h3 className="subseccion">
                  {tipo === 1 ? `${parte.seccion} ` : ''}
                  {parte.titulo}
                </h3>
              )}
              <div className="texto-oficial" dangerouslySetInnerHTML={{ __html: sanearHtml(parte.contenido ?? '') }} />
            </div>
          ))}
      </div>
    </details>
  );
}

/** Prospecto: se muestra su índice oficial y cada apartado se carga al abrirlo. */
function Prospecto({ nr, version, fecha }: { nr: string; version: number; fecha?: number }) {
  const [indice, setIndice] = useState<SeccionDoc[] | null>(null);
  useEffect(() => {
    obtenerIndice(2, nr).then(setIndice).catch(() => setIndice([]));
  }, [nr, version]);
  if (!indice || indice.length === 0) return null;
  return (
    <section className="bloque">
      <h2 className="bloque-titulo">Prospecto</h2>
      {fecha && <p className="nota">Texto oficial del prospecto, versión del {fechaCorta(fecha)}.</p>}
      {indice.map((s) => (
        <SeccionPlegable key={s.seccion} tipo={2} nr={nr} seccion={s.seccion} tituloPorDefecto={s.titulo} version={version} />
      ))}
    </section>
  );
}
