// Iconos propios en SVG (sin librerías externas). Heredan el color del texto.
type P = { className?: string };
const base = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

export const IconoFarmacia = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="8.5" width="18" height="7" rx="3.5" transform="rotate(-35 12 12)" />
    <path d="M9.2 7.9l5.6 8.2" />
  </svg>
);
export const IconoAnatomia = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="4.5" r="2" />
    <path d="M12 7v6M8 21l4-8 4 8M6 10.5h12" />
  </svg>
);
export const IconoImagen = (p: P) => (
  <svg {...base} {...p}>
    <rect x="3" y="3" width="18" height="18" rx="4" />
    <path d="M12 6.5v11M9 9h6M8.5 12h7M9 15h6" />
  </svg>
);
export const IconoBuscar = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="M20 20l-4.2-4.2" />
  </svg>
);
export const IconoInfo = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5M12 7.6v.2" />
  </svg>
);
export const IconoTema = (p: P) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" />
  </svg>
);
