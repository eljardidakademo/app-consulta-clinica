// Ficha de un medicamento veterinario, con los datos oficiales de CIMAVet (AEMPS).
// CIMAVet no publica la ficha técnica por apartados (solo en PDF), pero sí datos
// estructurados por especie: indicaciones, contraindicaciones, interacciones,
// reacciones adversas y tiempos de espera. Se muestran tal cual, sin reescribirlos.
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fechaCorta, formatearFecha, URL_EMA_MEDICAMENTOS } from '../lib/cima';
import { obtenerMedicamentoVet, urlFichaCimaVet, type MedicamentoVet } from '../lib/cimavet';
import { alternarFavorito, anadirHistorial, useGuardados } from '../lib/guardado';
import { IconoApartado } from '../components/IconosFicha';
import BotonCruce from '../components/BotonCruce';

const NO_DISPONIBLE = 'Información no disponible en la fuente.';
const NOMBRE_DOC: Record<number, string> = { 1: 'Ficha técnica (PDF)', 2: 'Prospecto (PDF)', 3: 'Informe público de evaluación (PDF)' };

type Carga = { estado: 'cargando' } | { estado: 'error' } | { estado: 'ok'; datos: MedicamentoVet | null; fecha: Date };

export default function FichaVeterinaria() {
  const { nregistro = '' } = useParams();
  const navegar = useNavigate();
  const [version, setVersion] = useState(0);
  const [carga, setCarga] = useState<Carga>({ estado: 'cargando' });

  useEffect(() => {
    let vivo = true;
    setCarga({ estado: 'cargando' });
    obtenerMedicamentoVet(nregistro)
      .then((m) => {
        if (!vivo) return;
        setCarga({ estado: 'ok', datos: m, fecha: new Date() });
        if (m) anadirHistorial({ nregistro: m.nregistro, nombre: m.nombre, pactivos: m.pactivos, vet: true });
      })
      .catch(() => vivo && setCarga({ estado: 'error' }));
    return () => {
      vivo = false;
    };
  }, [nregistro, version]);

  const volver = () => (window.history.length > 1 ? navegar(-1) : navegar('/farmacia?uso=vet'));

  return (
    <div className="pagina ficha" data-modulo="farmacia" data-uso="vet">
      <button type="button" className="volver" onClick={volver}>← Volver a los resultados</button>
      {carga.estado === 'cargando' && <p className="nota">Consultando CIMAVet…</p>}
      {carga.estado === 'error' && (
        <div className="aviso aviso-error">
          No se ha podido consultar CIMAVet{navigator.onLine ? '' : ' (sin conexión)'}.{' '}
          <button type="button" className="enlace-boton" onClick={() => setVersion((v) => v + 1)}>Reintentar</button>
        </div>
      )}
      {carga.estado === 'ok' && !carga.datos && <p className="aviso">{NO_DISPONIBLE}</p>}
      {carga.estado === 'ok' && carga.datos && (
        <Contenido m={carga.datos} fecha={carga.fecha} actualizar={() => setVersion((v) => v + 1)} />
      )}
    </div>
  );
}

function Contenido({ m, fecha, actualizar }: { m: MedicamentoVet; fecha: Date; actualizar: () => void }) {
  const esFavorito = useGuardados('favoritos').some((f) => f.nregistro === m.nregistro);
  const atc = m.atcs?.length ? m.atcs[m.atcs.length - 1] : undefined;
  const datosRapidos = [
    { t: 'Especies', v: m.especies?.map((e) => e.nombre).join(', ') },
    { t: 'Dispensación', v: m.dispensacion?.nombre },
    { t: 'Administración', v: m.administracion?.nombre },
    { t: 'Estado', v: textoEstado(m) },
    { t: 'Forma', v: m.formasFarmaceuticas?.map((f) => f.nombre).join(', ') },
    { t: 'Vía', v: m.viasAdministracion?.map((v) => v.nombre).join(', ') },
    { t: 'ATCvet', v: atc ? `${atc.codigo} · ${atc.nombre}` : undefined },
  ].filter((d) => d.v && d.v.trim());
  const datosFav = { nregistro: m.nregistro, nombre: m.nombre, pactivos: m.pactivos, vet: true };

  return (
    <>
      <header className="ficha-hero">
        <p className="ficha-hero-ante">
          <span className="ficha-hero-sello">Uso veterinario</span>
          Nº registro {m.nregistro}
        </p>
        <button
          type="button"
          className={`boton-favorito ${esFavorito ? 'activo' : ''}`}
          onClick={() => alternarFavorito(datosFav)}
          aria-pressed={esFavorito}
          aria-label={esFavorito ? 'Quitar de favoritos' : 'Añadir a favoritos'}
        >
          {esFavorito ? '★' : '☆'}
        </button>
        <h1 className="ficha-nombre">{m.nombre}</h1>
        {m.pactivos && <p className="ficha-pactivos">{m.pactivos}</p>}
        <p className="ficha-lab">{m.labtitular}</p>
        <div className="med-etiquetas">
          {m.antibiotico && <span className="chip chip-claro">Antibiótico</span>}
          {m.comerc === false && <span className="chip chip-claro chip-apagado">No comercializado</span>}
          {m.psum && <span className="chip chip-claro">Problema de suministro</span>}
          {m.estupefaciente && <span className="chip chip-claro">Estupefaciente</span>}
          {m.psicotropo && <span className="chip chip-claro">Psicótropo</span>}
          {m.ema && <span className="chip chip-claro">Autorización centralizada (EMA)</span>}
        </div>
      </header>

      <BotonCruce {...datosFav} />

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

      <section className="seccion-ficha">
        <h2 className="seccion-ficha-titulo">Datos clínicos por especie</h2>
        <p className="nota">
          CIMAVet no ofrece la ficha técnica por apartados. Estos son los datos que publica de forma estructurada;
          el texto completo está en la ficha técnica en PDF.
        </p>
        <Bloque titulo="Indicaciones" icono="diana" abierto>
          <PorEspecie items={m.indicaciones} />
        </Bloque>
        <Bloque titulo="Contraindicaciones" icono="prohibido" tono="peligro">
          <PorEspecie items={m.contraindicaciones} />
        </Bloque>
        <Bloque titulo="Interacciones" icono="cruce" tono="precaucion">
          <PorEspecie items={m.interacciones} />
        </Bloque>
        <Bloque titulo="Reacciones adversas" icono="rayo" tono="precaucion">
          <PorEspecie items={m.reaccionesAdversas?.map((r) => ({ ...r, nombre: r.frecuencia ? `${r.nombre} (${r.frecuencia.nombre})` : r.nombre }))} />
        </Bloque>
        <Bloque titulo="Tiempos de espera" icono="reloj">
          <TiemposEspera m={m} />
        </Bloque>
      </section>

      <section className="seccion-ficha">
        <details className="bloque-plegable">
          <summary>Datos de autorización y presentaciones</summary>
          <dl className="datos">
            <Dato t="Laboratorio titular" v={m.labtitular} />
            {m.labcomercializador && m.labcomercializador !== m.labtitular && <Dato t="Comercializa" v={m.labcomercializador} />}
            <Dato t="Estado" v={textoEstado(m)} />
            <Dato t="Tipo de medicamento" v={m.tipoMedicamento?.nombre} />
            <Dato t="Composición" v={m.principiosActivos?.map((p) => `${p.nombre} ${p.cantidad?.trim() ?? ''} ${p.unidad ?? ''}`.trim()).join(' · ')} />
            <Dato t="Excipientes" v={m.excipientes?.map((p) => p.nombre).join(' · ')} />
            <Dato t="Clasificación ATCvet" v={m.atcs?.length ? m.atcs.map((a) => `${a.codigo} ${a.nombre}`).join(' › ') : undefined} />
          </dl>
          {m.presentaciones && m.presentaciones.length > 0 && (
            <ul className="presentaciones">
              {m.presentaciones.map((p) => (
                <li key={p.cn}>
                  <strong>CN {p.cn}</strong> · {p.nombre}
                  {p.comerc === false ? ' · no comercializada' : ''}
                  {p.psum ? ' · problema de suministro' : ''}
                </li>
              ))}
            </ul>
          )}
        </details>
      </section>

      <div className="botones-enlace">
        {(m.docs ?? []).filter((d) => NOMBRE_DOC[d.tipo]).map((d) => (
          <a key={d.tipo} className="boton-enlace" href={d.url} target="_blank" rel="noreferrer">{NOMBRE_DOC[d.tipo]}</a>
        ))}
        <a className="boton-enlace" href={urlFichaCimaVet(m.nregistro)} target="_blank" rel="noreferrer">Ver en CIMAVet</a>
      </div>
      {m.ema && (
        <p className="nota">
          Autorización centralizada europea: más información en el{' '}
          <a href={URL_EMA_MEDICAMENTOS} target="_blank" rel="noreferrer">buscador de medicamentos de la EMA</a>.
        </p>
      )}

      <p className="fuente">
        Fuente: CIMAVet, Agencia Española de Medicamentos y Productos Sanitarios (AEMPS). Consultado el {formatearFecha(fecha)}.
        {(() => {
          const ft = m.docs?.find((d) => d.tipo === 1);
          return ft?.fecha ? ` Ficha técnica del ${fechaCorta(ft.fecha)}.` : '';
        })()}{' '}
        Datos oficiales sin modificar; no sustituyen a la ficha técnica completa ni al criterio profesional.{' '}
        <button type="button" className="enlace-boton" onClick={actualizar}>Actualizar</button>
      </p>
      <p className="nota"><Link to="/acerca">Fuentes y aviso legal</Link></p>
    </>
  );
}

function Bloque({ titulo, icono, tono, abierto, children }: { titulo: string; icono: string; tono?: 'peligro' | 'precaucion'; abierto?: boolean; children: ReactNode }) {
  return (
    <details className={`bloque-vet ${tono ? `tono-${tono}` : ''}`} open={abierto}>
      <summary>
        <span className="tarjeta-apartado-icono"><IconoApartado nombre={icono} /></span>
        <span className="bloque-vet-titulo">{titulo}</span>
        <span aria-hidden="true">▾</span>
      </summary>
      <div className="bloque-vet-cuerpo">{children}</div>
    </details>
  );
}

/** Agrupa una lista de datos por especie, conservando el orden de la fuente. */
function PorEspecie({ items }: { items?: { nombre: string; especie?: { nombre: string } }[] }) {
  if (!items || items.length === 0) return <p className="nota">{NO_DISPONIBLE}</p>;
  const grupos = new Map<string, string[]>();
  for (const i of items) {
    const e = i.especie?.nombre ?? 'Todas las especies';
    if (!grupos.has(e)) grupos.set(e, []);
    grupos.get(e)!.push(i.nombre);
  }
  return (
    <>
      {[...grupos].map(([especie, lista]) => (
        <div key={especie}>
          <h4>{especie}</h4>
          <ul>{lista.map((t, k) => <li key={k}>{t}</li>)}</ul>
        </div>
      ))}
    </>
  );
}

function TiemposEspera({ m }: { m: MedicamentoVet }) {
  const conDato = (m.tiemposEspera ?? []).filter((t) => t.cantidad);
  if (conDato.length === 0) return <p className="nota">{NO_DISPONIBLE}</p>;
  return (
    <ul>
      {conDato.map((t, i) => (
        <li key={i}>
          <strong>{t.especie?.nombre ?? 'Todas las especies'}</strong>
          {t.tejido ? ` · ${t.tejido.nombre}` : ''}: {t.cantidad} {t.unidadTiempo?.nombre?.toLowerCase() ?? ''}
          {t.viaAdministracion ? ` (${t.viaAdministracion.nombre.toLowerCase()})` : ''}
        </li>
      ))}
    </ul>
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

function textoEstado(m: MedicamentoVet): string | undefined {
  const e = m.estado;
  if (!e) return undefined;
  if (e.rev) return `Revocado el ${fechaCorta(e.rev)}`;
  if (e.susp) return `Suspendido el ${fechaCorta(e.susp)}`;
  if (e.aut) return `Autorizado el ${fechaCorta(e.aut)}${m.comerc === false ? ' · no comercializado' : ''}`;
  return undefined;
}
