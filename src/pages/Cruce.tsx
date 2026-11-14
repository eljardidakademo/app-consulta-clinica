// Cruce de fichas: busca cada medicamento elegido en el apartado de interacciones
// de los demás y muestra los fragmentos oficiales donde aparece, sin interpretarlos.
// Ver src/lib/cruce.ts para el detalle de qué se busca y dónde.
import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AVISO_CRUCE, buscarCoincidencias, cargarFuente, type FuenteCruce } from '../lib/cruce';
import { fechaCorta, formatearFecha } from '../lib/cima';
import { alternarCruce, MAX_CRUCE, rutaFicha, useGuardados, vaciarCruce } from '../lib/guardado';

type Carga = { estado: 'cargando' } | { estado: 'error' } | { estado: 'ok'; fuente: FuenteCruce };

export default function Cruce() {
  const elegidos = useGuardados('cruce');
  const [cargas, setCargas] = useState<Record<string, Carga>>({});
  const [consultado, setConsultado] = useState<Date | null>(null);
  const [version, setVersion] = useState(0);
  const clave = elegidos.map((m) => m.nregistro).join('|');

  // Carga (o recarga) los textos de cada medicamento elegido.
  useEffect(() => {
    let vivo = true;
    const lista = elegidos;
    setCargas(Object.fromEntries(lista.map((m) => [m.nregistro, { estado: 'cargando' } as Carga])));
    lista.forEach((m) => {
      cargarFuente(m)
        .then((fuente) => vivo && setCargas((c) => ({ ...c, [m.nregistro]: { estado: 'ok', fuente } })))
        .catch(() => vivo && setCargas((c) => ({ ...c, [m.nregistro]: { estado: 'error' } })));
    });
    setConsultado(new Date());
    return () => {
      vivo = false;
    };
  }, [clave, version]);

  const fuentes = elegidos
    .map((m) => cargas[m.nregistro])
    .filter((c): c is Extract<Carga, { estado: 'ok' }> => c?.estado === 'ok')
    .map((c) => c.fuente);
  const cargando = elegidos.some((m) => !cargas[m.nregistro] || cargas[m.nregistro].estado === 'cargando');
  const conError = elegidos.filter((m) => cargas[m.nregistro]?.estado === 'error');

  return (
    <div className="pagina" data-modulo="farmacia">
      <header className="pagina-cabecera">
        <p className="pagina-antetitulo">Farmacia · Herramienta de consulta</p>
        <h1>Cruce de fichas</h1>
      </header>

      <p className="aviso-cruce" role="note">{AVISO_CRUCE}</p>

      <p className="nota">
        Para cada pareja, se busca el principio activo y los grupos ATC de un medicamento dentro del apartado de
        interacciones del otro: el 4.5 de la ficha técnica en CIMA (uso humano) o las interacciones que publica
        CIMAVet (uso veterinario). Se muestra el texto oficial tal cual, con la palabra encontrada resaltada.
      </p>

      <section className="seccion-ficha">
        <h2 className="seccion-ficha-titulo">
          Medicamentos elegidos <span className="contador contador-modulo">{elegidos.length}</span>
          {elegidos.length > 0 && (
            <button type="button" className="enlace-boton enlace-pequeno" onClick={vaciarCruce}>Vaciar</button>
          )}
        </h2>
        {elegidos.length > 0 && (
          <ul className="lista-cruce">
            {elegidos.map((m) => (
              <li key={m.nregistro}>
                <span className={`chip ${m.vet ? 'chip-vet' : 'chip-humano'}`}>{m.vet ? 'Vet.' : 'Humano'}</span>
                <Link to={rutaFicha(m)}>{m.nombre}</Link>
                <button type="button" className="boton-quitar" aria-label={`Quitar ${m.nombre} del cruce`} onClick={() => alternarCruce(m)}>×</button>
              </li>
            ))}
          </ul>
        )}
        {elegidos.length < 2 && (
          <p className="aviso">
            Elige al menos dos medicamentos (hasta {MAX_CRUCE}). Busca cada uno en{' '}
            <Link to="/farmacia">Farmacia</Link>, abre su ficha y pulsa «Añadir al cruce».
          </p>
        )}
      </section>

      {elegidos.length >= 2 && (
        <section className="seccion-ficha">
          <h2 className="seccion-ficha-titulo">Resultados</h2>
          {cargando && <p className="nota">Consultando las fichas oficiales…</p>}
          {conError.length > 0 && (
            <div className="aviso aviso-error">
              No se ha podido consultar la fuente para: {conError.map((m) => m.nombre).join(', ')}.{' '}
              <button type="button" className="enlace-boton" onClick={() => setVersion((v) => v + 1)}>Reintentar</button>
            </div>
          )}
          {!cargando &&
            fuentes.flatMap((a) =>
              fuentes.filter((b) => b !== a).map((b) => <Par key={`${a.med.nregistro}>${b.med.nregistro}`} donde={a} que={b} />),
            )}
          {!cargando && (
            <p className="fuente">
              Fuentes: CIMA y CIMAVet, Agencia Española de Medicamentos y Productos Sanitarios (AEMPS).
              {consultado && ` Consultado el ${formatearFecha(consultado)}.`} {AVISO_CRUCE} No sustituye a la ficha técnica
              completa ni al criterio profesional.{' '}
              <button type="button" className="enlace-boton" onClick={() => setVersion((v) => v + 1)}>Actualizar</button>
            </p>
          )}
        </section>
      )}
    </div>
  );
}

/** Resultado de buscar el medicamento "que" en el texto de interacciones de "donde". */
function Par({ donde, que }: { donde: FuenteCruce; que: FuenteCruce }) {
  const coincidencias = donde.fragmentos ? buscarCoincidencias(donde.fragmentos, que.terminos) : [];
  return (
    <article className={`par-cruce ${coincidencias.length ? 'con-resultados' : ''}`}>
      <h3>
        En la ficha de <Link to={rutaFicha(donde.med)}>{donde.med.nombre}</Link>, menciones de {que.med.nombre}
      </h3>
      <p className="nota">
        Texto revisado: {donde.origenTexto}
        {donde.fechaDoc ? ` (documento del ${fechaCorta(donde.fechaDoc)})` : ''}.
      </p>
      {que.terminos.length > 0 && (
        <div className="terminos" aria-label="Términos buscados">
          {que.terminos.map((t) => (
            <span key={t.norm} className="chip" title={t.origen}>{t.texto}</span>
          ))}
        </div>
      )}

      {donde.fragmentos === null ? (
        <p className="aviso">
          Información no disponible en la fuente: {donde.med.vet ? 'CIMAVet' : 'CIMA'} no ofrece el texto de interacciones de
          este medicamento. Consulta la ficha técnica en PDF.
        </p>
      ) : que.terminos.length === 0 ? (
        <p className="aviso">Información no disponible en la fuente: no constan principio activo ni grupo ATC para buscar.</p>
      ) : coincidencias.length === 0 ? (
        <p className="nota">
          Sin menciones literales de estos términos. {AVISO_CRUCE}
        </p>
      ) : (
        coincidencias.map((c, i) => (
          <blockquote key={i} className="fragmento">
            {c.fragmento.etiqueta && <span className="fragmento-etiqueta">{c.fragmento.etiqueta}</span>}
            {resaltar(c.fragmento.texto, c.rangos)}
          </blockquote>
        ))
      )}
    </article>
  );
}

function resaltar(texto: string, rangos: [number, number][]): ReactNode[] {
  const partes: ReactNode[] = [];
  let pos = 0;
  rangos.forEach(([a, b], i) => {
    if (a > pos) partes.push(texto.slice(pos, a));
    partes.push(<mark key={i}>{texto.slice(a, b)}</mark>);
    pos = b;
  });
  if (pos < texto.length) partes.push(texto.slice(pos));
  return partes;
}
