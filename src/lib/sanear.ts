// Limpia el HTML oficial que devuelve CIMA antes de mostrarlo.
// No cambia el texto: solo quita estilos, scripts y atributos que no hacen falta,
// para que se lea bien en el móvil y en modo oscuro.
import DOMPurify from 'dompurify';

const ETIQUETAS = ['p', 'br', 'div', 'span', 'b', 'strong', 'i', 'em', 'u', 'sub', 'sup', 'ul', 'ol', 'li',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img'];

export function sanearHtml(html: string): string {
  const fragmento = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ETIQUETAS,
    ALLOWED_ATTR: ['colspan', 'rowspan', 'href', 'src', 'alt'],
    RETURN_DOM_FRAGMENT: true,
  });
  // Quita los párrafos vacíos (solo espacios) que el documento original usa como separación.
  fragmento.querySelectorAll('p').forEach((p) => {
    if (!p.textContent?.replace(/[\s\u00a0]/g, '') && !p.querySelector('img')) p.remove();
  });
  const contenedor = document.createElement('div');
  contenedor.appendChild(fragmento);
  return contenedor.innerHTML;
}

// Los enlaces del texto oficial se abren en otra pestaña.
// Las rutas relativas (imágenes, enlaces) se completan con el dominio de CIMA.
DOMPurify.addHook('afterSanitizeAttributes', (nodo) => {
  for (const attr of ['src', 'href']) {
    const v = nodo.getAttribute(attr);
    if (v && v.startsWith('/')) nodo.setAttribute(attr, `https://cima.aemps.es${v}`);
  }
  // Los enlaces internos del documento original (#…) no llevan a ningún sitio en la app.
  if (nodo.tagName === 'A' && nodo.getAttribute('href')?.startsWith('#')) nodo.removeAttribute('href');
  if (nodo.tagName === 'A') {
    nodo.setAttribute('target', '_blank');
    nodo.setAttribute('rel', 'noreferrer');
  }
});
