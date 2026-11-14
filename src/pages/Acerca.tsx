// Fuentes, créditos y aviso legal.
export default function Acerca() {
  return (
    <div className="pagina" data-modulo="buscar">
      <header className="pagina-cabecera">
        <p className="pagina-antetitulo">Información</p>
        <h1>Fuentes y aviso legal</h1>
      </header>

      <h2 className="seccion-titulo">Aviso legal</h2>
      <p>
        Herramienta de consulta personal. No sustituye la ficha técnica oficial ni el criterio profesional.
        No guarda datos de pacientes y no usa analíticas ni rastreadores.
      </p>
      <p>
        Los favoritos y el historial se guardan solo en este dispositivo y no se envían a ningún sitio.
        Las consultas a CIMA se guardan en la memoria del navegador para poder verlas sin conexión,
        siempre con su fecha de consulta.
      </p>

      <h2 className="seccion-titulo">Fuentes de datos</h2>
      <p className="nota">Todos los datos clínicos se leen en tiempo real de la fuente oficial y se muestran sin modificar.</p>
      <ul className="lista-fuentes">
        <li>
          <strong>Medicamentos de uso humano</strong> (búsqueda, datos de autorización, ficha técnica y prospecto por
          apartados, documentos PDF): CIMA, Agencia Española de Medicamentos y Productos Sanitarios (AEMPS).{' '}
          <a href="https://cima.aemps.es" target="_blank" rel="noreferrer">cima.aemps.es</a>
        </li>
        <li>
          <strong>Clasificación ATC</strong>: códigos y nombres tal como los publica CIMA (AEMPS).
        </li>
        <li>
          <strong>Notas de seguridad y problemas de suministro</strong>: CIMA (AEMPS). Cada nota enlaza a su
          publicación en aemps.gob.es.
        </li>
        <li>
          <strong>Medicamentos de autorización centralizada</strong>: enlace complementario a su página en la
          Agencia Europea de Medicamentos (EMA).{' '}
          <a href="https://www.ema.europa.eu/en/medicines" target="_blank" rel="noreferrer">ema.europa.eu</a>
        </li>
      </ul>
      <p className="nota">Las fuentes de Anatomía e Imagen se añadirán aquí cuando se incorporen sus contenidos.</p>

      <h2 className="seccion-titulo">Créditos del software</h2>
      <ul className="lista-fuentes">
        <li>React (licencia MIT), React Router (MIT), Vite (MIT).</li>
        <li>Workbox, mediante vite-plugin-pwa (MIT), para el funcionamiento sin conexión.</li>
        <li>DOMPurify (Apache 2.0 o MPL 2.0), para limpiar el formato del texto oficial sin cambiar su contenido.</li>
        <li>Iconos y diseño propios.</li>
      </ul>
    </div>
  );
}
