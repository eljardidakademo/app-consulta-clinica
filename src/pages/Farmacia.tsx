// Módulo 1: Farmacia. Portada con selector de uso humano (CIMA) o veterinario (CIMAVet),
// buscador, accesos rápidos, favoritos, historial y alertas de la AEMPS.
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import BuscadorMedicamentos, { usoDeParams } from '../components/BuscadorMedicamentos';
import { fechaCorta, formatearFecha, notasRecientes, problemasSuministro, type NotaSeguridad } from '../lib/cima';
import { borrarHistorial, rutaFicha, useGuardados, type MedGuardado } from '../lib/guardado';

const DIAS_NOTAS = 90;

export default function Farmacia() {
  const [params] = useSearchParams();
  const buscando = (params.get('q') ?? '').trim().length >= 3;
  const vet = usoDeParams(params) === 'vet';
  const favoritos = useGuardados('favoritos');
  const historial = useGuardados('historial');
  const cruce = useGuardados('cruce');

  return (
    <div className="pagina" data-modulo="farmacia" data-uso={vet ? 'vet' : 'humano'}>
      <header className="pagina-cabecera">
        <p className="pagina-antetitulo">Módulo 1 · Medicamentos de uso {vet ? 'veterinario' : 'humano'}</p>
        <h1>Farmacia</h1>
      </header>

      <BuscadorMedicamentos />

      {!buscando && (
        <>
          <div className="accesos">
            {!vet && (
              <Link to="/farmacia/atc" className="acceso">
                <span className="acceso-titulo">Explorar por grupo ATC</span>
                <span className="acceso-texto">De grupo anatómico a principio activo</span>
              </Link>
            )}
            {!vet && <ResumenSuministro />}
            <Link to="/farmacia/cruce" className="acceso acceso-cruce">
              <span className="acceso-titulo">Cruce de fichas</span>
              <span className="acceso-texto">
                {cruce.length ? `${cruce.length} medicamento${cruce.length === 1 ? '' : 's'} elegido${cruce.length === 1 ? '' : 's'}` : 'Busca un medicamento en el apartado de interacciones de otro'}
              </span>
            </Link>
          </div>

          {favoritos.length > 0 && (
            <section className="seccion-ficha">
              <h2 className="seccion-ficha-titulo">★ Favoritos</h2>
              <div className="carrusel">
                {favoritos.map((m) => <MiniTarjeta key={m.nregistro} m={m} />)}
              </div>
            </section>
          )}

          {historial.length > 0 && (
            <section className="seccion-ficha">
              <h2 className="seccion-ficha-titulo">
                Consultados recientemente
                <button type="button" className="enlace-boton enlace-pequeno" onClick={borrarHistorial}>Borrar</button>
              </h2>
              <div className="carrusel">
                {historial.slice(0, 12).map((m) => <MiniTarjeta key={m.nregistro} m={m} />)}
              </div>
            </section>
          )}

          {!vet && <NotasSeguridad />}
        </>
      )}
    </div>
  );
}

function MiniTarjeta({ m }: { m: MedGuardado }) {
  return (
    <Link to={rutaFicha(m)} className={`mini-tarjeta ${m.vet ? 'mini-tarjeta-vet' : ''}`}>
      {m.vet && <span className="chip chip-vet">Uso veterinario</span>}
      <span className="mini-tarjeta-nombre">{m.nombre}</span>
      {m.pactivos && <span className="mini-tarjeta-pa">{m.pactivos}</span>}
    </Link>
  );
}

function ResumenSuministro() {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    problemasSuministro().then((l) => setN(l.length)).catch(() => setN(null));
  }, []);
  return (
    <Link to="/farmacia/suministro" className="acceso acceso-alerta">
      <span className="acceso-titulo">Problemas de suministro</span>
      <span className="acceso-texto">{n === null ? 'Lista oficial de la AEMPS' : `${n} presentaciones afectadas ahora`}</span>
    </Link>
  );
}

function NotasSeguridad() {
  const [notas, setNotas] = useState<NotaSeguridad[] | null>(null);
  const [consultado, setConsultado] = useState<Date | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    notasRecientes(DIAS_NOTAS)
      .then((n) => {
        setNotas(n);
        setConsultado(new Date());
      })
      .catch(() => setError(true));
  }, []);
  // Si CIMA no responde, se dice claramente: no es lo mismo que "no hay notas".
  if (error) return <p className="aviso aviso-error">No se han podido consultar las notas de seguridad de la AEMPS.</p>;
  if (!notas) return null;
  return (
    <section className="seccion-ficha">
      <h2 className="seccion-ficha-titulo tono-alerta-texto">Notas de seguridad recientes</h2>
      {notas.length === 0 ? (
        <p className="nota">La AEMPS no ha publicado notas de seguridad en los últimos {DIAS_NOTAS} días.</p>
      ) : (
        <div className="carrusel">
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
      )}
      <p className="fuente">
        Fuente: CIMA (AEMPS), notas publicadas en los últimos {DIAS_NOTAS} días.{consultado && ` Consultado el ${formatearFecha(consultado)}.`}
      </p>
    </section>
  );
}
