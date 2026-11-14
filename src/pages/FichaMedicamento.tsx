// Ficha de un medicamento de uso humano, con los datos y textos oficiales de CIMA.
// Regla: el texto clínico se muestra tal cual lo publica la AEMPS, sin resumir ni reescribir.
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  fechaCorta, formatearFecha, obtenerIndice, obtenerMedicamento, obtenerNotas, urlEpar, URL_EMA_MEDICAMENTOS, urlFichaCima,
  type MedicamentoDetalle, type NotaSeguridad,
} from '../lib/cima';
import Mazo, { type Apartado } from '../components/Mazo';
import { alternarFavorito, anadirHistorial, useGuardados } from '../lib/guardado';

// Apartados de la ficha técnica que se muestran como tarjetas, con su numeración oficial.
// "tono" solo cambia el color de la tarjeta para reconocerla de un vistazo.
const APARTADOS_FT: Apartado[] = [
  { seccion: '4.1', titulo: 'Indicaciones terapéuticas', corto: 'Indicaciones', icono: 'diana' },
  { seccion: '4.2', titulo: 'Posología y forma de administración', corto: 'Posología', icono: 'reloj' },
  { seccion: '4.3', titulo: 'Contraindicaciones', corto: 'Contraindicaciones', icono: 'prohibido', tono: 'peligro' },
  { seccion: '4.4', titulo: 'Advertencias y precauciones especiales de empleo', corto: 'Advertencias', icono: 'triangulo', tono: 'precaucion' },
  { seccion: '4.5', titulo: 'Interacción con otros medicamentos y otras formas de interacción', corto: 'Interacciones', icono: 'cruce', tono: 'precaucion' },
  { seccion: '4.6', titulo: 'Fertilidad, embarazo y lactancia', corto: 'Embarazo y lactancia', icono: 'corazon' },
  { seccion: '4.8', titulo: 'Reacciones adversas', corto: 'Reacciones adversas', icono: 'rayo', tono: 'precaucion' },
  { seccion: '4.9', titulo: 'Sobredosis', corto: 'Sobredosis', icono: 'alarma', tono: 'peligro' },
  { seccion: '5.1', titulo: 'Propiedades farmacodinámicas', corto: 'Farmacodinamia', icono: 'molecula' },
  { seccion: '5.2', titulo: 'Propiedades farmacocinéticas', corto: 'Farmacocinética', icono: 'curva' },
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
        if (m) anadirHistorial({ nregistro: m.nregistro, nombre: m.nombre, pactivos: m.pactivos });
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
  const [documento, setDocumento] = useState<'ft' | 'prospecto'>('ft');
  const [apartadosProspecto, setApartadosProspecto] = useState<Apartado[] | null>(null);
  const esFavorito = useGuardados('favoritos').some((f) => f.nregistro === m.nregistro);

  // Índice oficial del prospecto (cada punto será una tarjeta).
  useEffect(() => {
    if (!prospecto?.secc) return;
    obtenerIndice(2, m.nregistro)
      .then((ind) => setApartadosProspecto(ind.map((s) => ({ seccion: s.seccion, titulo: s.titulo, corto: acortar(s.titulo), icono: 'documento' }))))
      .catch(() => setApartadosProspecto([]));
  }, [m.nregistro, prospecto?.secc, version]);

  const atc = m.atcs?.length ? m.atcs[m.atcs.length - 1] : undefined;
  const datosRapidos = [
    { t: 'Dispensación', v: m.cpresc },
    { t: 'Estado', v: textoEstado(m) },
    { t: 'Forma', v: m.formaFarmaceutica?.nombre },
    { t: 'Vía', v: m.viasAdministracion?.map((v) => v.nombre).join(', ') },
    { t: 'Dosis', v: m.dosis },
    { t: 'ATC', v: atc ? `${atc.codigo} · ${atc.nombre}` : undefined },
  ].filter((d) => d.v && d.v.trim());

  return (
    <>
      {/* ---------- Cabecera visual ---------- */}
      <header className="ficha-hero">
        <p className="ficha-hero-ante">
          <span className="ficha-hero-sello">Uso humano</span>
          Nº registro {m.nregistro}
        </p>
        <button
          type="button"
          className={`boton-favorito ${esFavorito ? 'activo' : ''}`}
          onClick={() => alternarFavorito({ nregistro: m.nregistro, nombre: m.nombre, pactivos: m.pactivos })}
          aria-pressed={esFavorito}
          aria-label={esFavorito ? 'Quitar de favoritos' : 'Añadir a favoritos'}
          title={esFavorito ? 'Quitar de favoritos' : 'Añadir a favoritos'}
        >
          {esFavorito ? '★' : '☆'}
        </button>
        <h1 className="ficha-nombre">{m.nombre}</h1>
        {m.pactivos && <p className="ficha-pactivos">{m.pactivos}</p>}
        <p className="ficha-lab">{m.labtitular}</p>
        <div className="med-etiquetas">
          {m.generico && <span className="chip chip-claro">Genérico (EFG)</span>}
          {m.comerc === false && <span className="chip chip-claro chip-apagado">No comercializado</span>}
          {m.triangulo && <span className="chip chip-claro">▼ Seguimiento adicional</span>}
          {m.conduc && <span className="chip chip-claro">Afecta a la conducción</span>}
          {m.huerfano && <span className="chip chip-claro">Huérfano</span>}
          {m.biosimilar && <span className="chip chip-claro">Biosimilar</span>}
          {/* Dato de CIMA: autorizado por procedimiento centralizado europeo (EMA) */}
          {m.ema && <span className="chip chip-claro">Autorización centralizada (EMA)</span>}
        </div>
      </header>

      {/* ---------- Datos clave: tarjetas pequeñas que se deslizan en horizontal ---------- */}
      {datosRapidos.length > 0 && (
        <div className="carrusel datos-rapidos" aria-label="Datos clave">
          {datosRapidos.map((d) => (
            <div key={d.t} className="dato-rapido">
              <span className="dato-rapido-t">{d.t}</span>
              <span className="dato-rapido-v">{d.v}</span>
            </div>
          ))}
        </div>
      )}

      {/* ---------- Alertas de la AEMPS: carrusel ---------- */}
      {(notas.length > 0 || conSuministro.length > 0) && (
        <section className="seccion-ficha">
          <h2 className="seccion-ficha-titulo tono-alerta-texto">
            Alertas de la AEMPS <span className="contador">{notas.length + conSuministro.length}</span>
          </h2>
          <div className="carrusel">
            {conSuministro.map((p) => (
              <div key={p.cn} className="tarjeta-alerta">
                <p className="tarjeta-alerta-tipo">Problema de suministro · CN {p.cn}</p>
                <p className="tarjeta-alerta-texto">{p.nombre}</p>
                <p className="nota">
                  Desde {fechaCorta(p.detalleProblemaSuministro!.fini)}
                  {p.detalleProblemaSuministro!.ffin ? `, previsto hasta ${fechaCorta(p.detalleProblemaSuministro!.ffin)}` : ''}.
                  {p.detalleProblemaSuministro!.observ ? ` ${p.detalleProblemaSuministro!.observ}` : ''}
                </p>
              </div>
            ))}
            {notas.map((n, i) => (
              <div key={i} className="tarjeta-alerta">
                <p className="tarjeta-alerta-tipo">Nota de seguridad{n.fecha ? ` · ${fechaCorta(n.fecha)}` : ''}</p>
                <p className="tarjeta-alerta-texto">
                  {n.url ? <a href={n.url} target="_blank" rel="noreferrer">{n.asunto}</a> : n.asunto}
                </p>
                {n.referencia && <p className="nota">{n.referencia}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ---------- Ficha técnica / prospecto: tarjetas deslizables ---------- */}
      <section className="seccion-ficha">
        {prospecto?.secc && apartadosProspecto && apartadosProspecto.length > 0 ? (
          <div className="segmentos segmentos-doc" role="radiogroup" aria-label="Documento">
            <button type="button" role="radio" aria-checked={documento === 'ft'} className="segmento" onClick={() => setDocumento('ft')}>Ficha técnica</button>
            <button type="button" role="radio" aria-checked={documento === 'prospecto'} className="segmento" onClick={() => setDocumento('prospecto')}>Prospecto</button>
          </div>
        ) : (
          <h2 className="seccion-ficha-titulo">Ficha técnica</h2>
        )}

        {documento === 'ft' &&
          (ft?.secc ? (
            <Mazo key="ft" apartados={APARTADOS_FT} tipo={1} nr={m.nregistro} version={version} fechaDoc={ft.fecha} nombreDoc="Ficha técnica" />
          ) : (
            <p className="aviso">CIMA no ofrece esta ficha técnica por apartados. Consúltala en el PDF oficial.</p>
          ))}
        {documento === 'prospecto' && apartadosProspecto && (
          <Mazo key="prospecto" apartados={apartadosProspecto} tipo={2} nr={m.nregistro} version={version} fechaDoc={prospecto?.fecha} nombreDoc="Prospecto" />
        )}
      </section>

      {/* ---------- Resto de datos de autorización ---------- */}
      <section className="seccion-ficha">
        <details className="bloque-plegable">
          <summary>Datos de autorización y presentaciones</summary>
          <dl className="datos">
            <Dato t="Laboratorio titular" v={m.labtitular} />
            {m.labcomercializador && m.labcomercializador !== m.labtitular && <Dato t="Comercializa" v={m.labcomercializador} />}
            <Dato t="Estado" v={textoEstado(m)} />
            <Dato t="Prescripción y dispensación" v={m.cpresc} />
            <Dato t="Composición" v={m.principiosActivos?.map((p) => `${p.nombre} ${p.cantidad ?? ''} ${p.unidad ?? ''}`.trim()).join(' · ')} />
            <Dato t="Clasificación ATC" v={m.atcs?.length ? m.atcs.map((a) => `${a.codigo} ${a.nombre}`).join(' › ') : undefined} />
          </dl>
          {m.presentaciones && m.presentaciones.length > 0 && (
            <ul className="presentaciones">
              {m.presentaciones.map((p) => (
                <li key={p.cn}>
                  <strong>CN {p.cn}</strong> · {p.nombre}
                  {p.comerc === false ? ' · no comercializada' : ''}
                </li>
              ))}
            </ul>
          )}
        </details>
      </section>

      {/* ---------- Documentos oficiales ---------- */}
      <div className="botones-enlace">
        {ft && <a className="boton-enlace" href={ft.url} target="_blank" rel="noreferrer">Ficha técnica (PDF)</a>}
        {prospecto && <a className="boton-enlace" href={prospecto.url} target="_blank" rel="noreferrer">Prospecto (PDF)</a>}
        <a className="boton-enlace" href={urlFichaCima(m.nregistro)} target="_blank" rel="noreferrer">Ver en CIMA</a>
        {m.ema && <a className="boton-enlace" href={urlEpar(m.nombre)} target="_blank" rel="noreferrer">Ficha en la EMA (EPAR)</a>}
      </div>
      {m.ema && (
        <p className="nota">
          Autorización centralizada europea. El enlace a la EMA se forma con el nombre comercial; si no se abre,
          búscalo en el <a href={URL_EMA_MEDICAMENTOS} target="_blank" rel="noreferrer">buscador de medicamentos de la EMA</a>.
        </p>
      )}

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

/** Título breve para la barra de apartados del prospecto (corta el título oficial, no lo cambia). */
function acortar(t: string): string {
  const limpio = t.replace(/\s+/g, ' ').trim();
  return limpio.length > 28 ? `${limpio.slice(0, 26).trimEnd()}…` : limpio;
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
