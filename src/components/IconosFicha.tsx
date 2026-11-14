// Iconos de los apartados de la ficha técnica (SVG propios, heredan el color del texto).
const base = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };

const RUTAS: Record<string, string> = {
  // 4.1 Indicaciones: diana
  diana: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zm0 4.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9zm0 3.5v2',
  // 4.2 Posología: reloj
  reloj: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7.5V12l3 2',
  // 4.3 Contraindicaciones: prohibido
  prohibido: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM5.7 5.7l12.6 12.6',
  // 4.4 Advertencias: triángulo
  triangulo: 'M12 3.5 2.8 19.5h18.4zM12 9.5v4.5M12 16.8v.2',
  // 4.5 Interacciones: flechas cruzadas
  cruce: 'M4 7h11l-3-3M20 17H9l3 3M15 7l5 0M4 17h5',
  // 4.6 Embarazo y lactancia: corazón
  corazon: 'M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z',
  // 4.8 Reacciones adversas: rayo
  rayo: 'M13 2.5 5 13.5h6l-1 8 8-11h-6z',
  // 4.9 Sobredosis: alarma
  alarma: 'M12 5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15zM12 9v4M12 15.8v.2M4 4.5l2.5-1.5M20 4.5 17.5 3',
  // 5.1 Farmacodinamia: molécula
  molecula: 'M7 7a2.2 2.2 0 1 0 0 .1zM17 7a2.2 2.2 0 1 0 0 .1zM12 17a2.2 2.2 0 1 0 0 .1zM8.8 8.5l2.2 6.6M15.2 8.5 13 15.1M9.2 7h5.6',
  // 5.2 Farmacocinética: curva
  curva: 'M3.5 20.5h17M3.5 20.5v-17M5 18c2-9 4-11 6-11s3.5 5 9 9.5',
  // Prospecto: documento
  documento: 'M7 3h7l4 4v14H7zM14 3v4h4M9.5 12h6M9.5 15.5h6',
};

export function IconoApartado({ nombre }: { nombre: string }) {
  return (
    <svg {...base}>
      <path d={RUTAS[nombre] ?? RUTAS.documento} />
    </svg>
  );
}
