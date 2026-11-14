// Navegación inferior: los 3 módulos y el buscador global.
// Cada módulo tiene su propio color (definido en styles.css con data-modulo).
import { NavLink } from 'react-router-dom';
import { IconoAnatomia, IconoBuscar, IconoFarmacia, IconoImagen } from './Iconos';

const PESTANAS = [
  { a: '/farmacia', texto: 'Farmacia', modulo: 'farmacia', Icono: IconoFarmacia },
  { a: '/anatomia', texto: 'Anatomía', modulo: 'anatomia', Icono: IconoAnatomia },
  { a: '/imagen', texto: 'Imagen', modulo: 'imagen', Icono: IconoImagen },
  { a: '/buscar', texto: 'Buscar', modulo: 'buscar', Icono: IconoBuscar },
];

export default function BottomNav() {
  return (
    <nav className="nav-inferior" aria-label="Módulos">
      {PESTANAS.map(({ a, texto, modulo, Icono }) => (
        <NavLink key={a} to={a} className="nav-boton" data-modulo={modulo}>
          <Icono />
          <span>{texto}</span>
        </NavLink>
      ))}
    </nav>
  );
}
