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

      <h2 className="seccion-titulo">Fuentes</h2>
      <ul className="lista-fuentes">
        <li>
          <strong>Medicamentos de uso humano:</strong> CIMA, Agencia Española de Medicamentos y Productos Sanitarios (AEMPS),
          consultada en tiempo real. <a href="https://cima.aemps.es" target="_blank" rel="noreferrer">cima.aemps.es</a>
        </li>
      </ul>
      <p className="nota">Las fuentes de Anatomía e Imagen se añadirán aquí cuando se incorporen sus contenidos.</p>
    </div>
  );
}
