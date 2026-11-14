# Consulta clínica · Farmacia, Anatomía e Imagen

Aplicación web de consulta rápida para uso personal, pensada para el móvil.
Se puede instalar como una app (PWA) desde el navegador y funciona sin servidor propio.

**Dirección de la app:** https://eljardidakademo.github.io/app-consulta-clinica/

## Estado actual (Fase 1, paso 2)

- Navegación inferior con los tres módulos (Farmacia, Anatomía, Imagen) y el buscador.
- Farmacia: buscador de medicamentos de uso humano conectado en tiempo real a CIMA (AEMPS),
  por nombre, principio activo o código nacional. Cada resultado abre la ficha oficial en CIMA.
- Anatomía e Imagen: vacíos por ahora.
- Modo claro, oscuro o automático (botón de la cabecera).
- Página de fuentes y aviso legal (botón ⓘ).

El diseño visual actual es provisional; la identidad definitiva se elegirá más adelante.

## Regla principal

Ningún dato clínico se inventa ni se escribe a mano: los datos de medicamentos se leen
directamente de CIMA y siempre se muestra la fuente y la fecha de consulta.

## Cómo instalarla en el móvil

- **Android (Chrome):** abre la dirección de la app, menú ⋮ → «Instalar aplicación» o «Añadir a pantalla de inicio».
- **iPhone (Safari):** abre la dirección, botón Compartir → «Añadir a pantalla de inicio».

## Cómo se publica (sin tocar código)

La app se publica sola en GitHub Pages cada vez que se actualiza la rama `main`.

**Configuración inicial (una sola vez):**

1. En GitHub, abre el repositorio y entra en **Settings → Pages**.
2. En **Build and deployment → Source**, elige **GitHub Actions**.
3. Listo. A partir de ahí, cada cambio aceptado en `main` publica la app en uno o dos minutos.

**Para ver si una publicación ha ido bien:** pestaña **Actions** del repositorio.
Un círculo verde significa que la app está actualizada; uno rojo, que algo falló y la versión anterior sigue en línea.
También se puede relanzar a mano: Actions → «Publicar en GitHub Pages» → **Run workflow**.

## Para quien programe

Requisitos: Node.js 22.

```bash
npm install      # instala las dependencias
npm run dev      # arranca la app en local para desarrollo
npm run build    # genera la versión final en la carpeta dist/
npm run preview  # sirve la versión final en local
```

Tecnologías: React 19, Vite, TypeScript y vite-plugin-pwa. Rutas con `#` (HashRouter) para que
funcionen en GitHub Pages sin configuración extra.

### Notas técnicas sobre CIMA

- Comprobado el 14/11/2026: CIMA permite consultas GET desde el navegador (CORS abierto), así que no hace falta proxy.
- No añadir cabeceras propias a las peticiones: el navegador haría una consulta previa (OPTIONS) que CIMA no acepta.
- Las búsquedas POST con JSON (por ejemplo `buscarEnFichaTecnica`) sí quedan bloqueadas en el navegador.
- Las respuestas de CIMA se guardan en caché del dispositivo (estrategia «primero la red») para verlas sin conexión.

### Estructura

```
src/
  lib/cima.ts                    acceso a la API de CIMA
  lib/tema.ts                    modo claro/oscuro
  components/                    cabecera, navegación, buscador, iconos
  pages/                         Farmacia, Anatomía, Imagen, Buscar, Fuentes y aviso legal
  styles.css                     estilos (colores en variables, fáciles de cambiar)
.github/workflows/deploy.yml     publicación automática en GitHub Pages
.github/workflows/comprobar.yml  comprueba que compila en cada propuesta de cambio
```
