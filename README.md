# Consulta clínica · Farmacia, Anatomía e Imagen

Aplicación web de consulta rápida para uso personal (2 usuarios), pensada para el móvil.
Se instala como una app desde el navegador (PWA), no necesita servidor propio y no cuesta nada mantenerla.

**Dirección de la app:** https://eljardidakademo.github.io/app-consulta-clinica/

---

## 1. Qué hace ahora (Fases 1 y 2: Farmacia)

- **Buscador de medicamentos** por nombre, principio activo o código nacional, conectado en tiempo real a CIMA (AEMPS).
- **Ficha del medicamento** dentro de la app:
  - cabecera con nombre, principio activo, laboratorio y datos clave;
  - alertas de la AEMPS (notas de seguridad y problemas de suministro);
  - apartados 4.1 a 5.2 de la ficha técnica en tarjetas que se deslizan, con el **texto oficial sin modificar**;
  - prospecto por puntos, enlaces a los PDF oficiales y a CIMA;
  - fuente y fecha de consulta, con botón «Actualizar».
- **Árbol ATC**: del grupo anatómico al principio activo y a sus medicamentos.
- **Problemas de suministro** activos (lista oficial completa, con filtro).
- **Notas de seguridad** de la AEMPS de los últimos 90 días.
- **Favoritos** (★ en la ficha) e **historial**, guardados solo en el móvil.
- **Uso veterinario** (Fase 2): selector «Uso humano / Uso veterinario» en Farmacia. Los medicamentos
  veterinarios salen de CIMAVet (AEMPS), con distintivo morado. CIMAVet no publica la ficha técnica por
  apartados, así que su ficha muestra los datos estructurados por especie (indicaciones,
  contraindicaciones, interacciones, reacciones adversas, tiempos de espera) y los PDF oficiales.
- **Cruce de fichas** (Fase 2): se añaden de 2 a 4 medicamentos con «Añadir al cruce» y la app busca el
  principio activo y los grupos ATC de cada uno en el apartado 4.5 de la ficha técnica de los demás
  (o en las interacciones de CIMAVet). Muestra el fragmento oficial con la palabra resaltada. Siempre
  avisa: *Búsqueda textual en fichas técnicas. La ausencia de resultados NO garantiza ausencia de
  interacción.* No usa bases de interacciones externas (ninguna gratuita tiene licencia clara).
- Modo claro, oscuro o automático. Página «Fuentes y aviso legal» (botón ⓘ).
- **Anatomía 3D** (Fase 3): visor con 8 capas (piel y regiones, músculos, articulaciones, huesos,
  corazón y vasos, linfático, nervioso y sentidos, vísceras), cada una con su opacidad. Se gira con un
  dedo y se amplía o desplaza con dos. Al tocar una estructura sale su ficha (nombre en castellano y
  latín según TA2, lado y sistema) con botones para enfocar, aislar u ocultar. Buscador por nombre.
  Modelos de Z-Anatomy (CC BY-SA 4.0). Las descripciones (origen, inserción…) aún no están: la ficha
  dice «Información no disponible en la fuente».
- Imagen: vacío de momento (fase 5).

## 2. Regla principal: cero invenciones

Ningún dato clínico se escribe a mano ni lo genera una IA. Todo se lee de CIMA en el momento y se muestra
con su fuente y su fecha. Si CIMA no tiene un dato, la app muestra «Información no disponible en la fuente».

## 3. Instalar la app en el móvil

- **Android (Chrome):** abre la dirección de la app → menú ⋮ → «Instalar aplicación».
- **iPhone (Safari):** abre la dirección → botón Compartir → «Añadir a pantalla de inicio».

Después ábrela siempre desde el icono.

## 4. Cómo se actualiza la app (sin programar)

Cada cambio llega como una **propuesta de cambios** (pull request, «PR») en GitHub.

1. Abre el enlace de la PR que te pase Claude (o la pestaña **Pull requests** del repositorio).
2. Espera a que aparezca la marca verde ✓ («All checks have passed»): significa que la app compila bien.
3. Pulsa **Merge pull request** y luego **Confirm merge**.
4. En uno o dos minutos la nueva versión está publicada. En el móvil, cierra la app y vuelve a abrirla.

**Ver si la publicación ha ido bien:** pestaña **Actions** del repositorio, flujo «Publicar en GitHub Pages».
Verde = publicada. Rojo = algo falló, y la versión anterior sigue funcionando.

**Deshacer un cambio que no os guste:** en la PR ya aceptada, pulsa **Revert**. GitHub crea una PR nueva que
deshace el cambio; acéptala igual que cualquier otra.

**Volver a publicar a mano** (por ejemplo, si GitHub tuvo un fallo): Actions → «Publicar en GitHub Pages» →
**Run workflow**.

### Configuración inicial (ya está hecha)

En **Settings → Pages → Build and deployment → Source** debe estar elegido **GitHub Actions**.

## 5. Privacidad

- Sin datos de pacientes, sin registro, sin analíticas ni rastreadores.
- Favoritos e historial se guardan solo en el dispositivo.
- La app solo se conecta a `cima.aemps.es` (datos oficiales) y a GitHub Pages (la propia app).

---

## Para quien programe

Requisitos: Node.js 22.

```bash
npm install      # instala las dependencias
npm run dev      # arranca la app en local para desarrollo
npm run build    # comprueba los tipos y genera la versión final en dist/
npm run preview  # sirve la versión final en local
```

Tecnologías: React 19, React Router (HashRouter, para que las rutas funcionen en GitHub Pages),
Vite, TypeScript, vite-plugin-pwa (Workbox) y DOMPurify.

### Notas técnicas sobre CIMA (comprobado el 14/11/2026)

- CORS abierto para GET (`Access-Control-Allow-Origin: *`): no hace falta proxy.
- Solo se envía la cabecera `Accept: application/json`, que es segura para CORS. Cualquier otra cabecera
  obliga al navegador a una consulta previa (OPTIONS) que CIMA no acepta. Sin `Accept`, algunos
  endpoints devuelven texto plano. Las peticiones POST con JSON (`buscarEnFichaTecnica`) quedan bloqueadas.
- `docSegmentado/contenido` devuelve el apartado pedido y sus subapartados (4.2 → 4.2.1, 4.2.2); a veces
  el texto solo está en los subapartados.
- La tabla ATC (`maestras?maestra=7`) devuelve vacío sin filtro; con `codigo=A&pagesize=10000` devuelve
  los 7.358 códigos.
- `medicamentos?atc=` acepta códigos parciales; `notas` exige `nregistro` o `ndias`.
- El service worker guarda las respuestas de CIMA con estrategia «primero la red» para verlas sin conexión.

### Notas técnicas sobre CIMAVet (comprobado el 14/11/2026)

- API en `https://cimavet.aemps.es/cimavet/rest/`, con CORS abierto (`Access-Control-Allow-Origin: *`).
- `medicamentos` busca con `nombre=`, `practiv1=` y `cn=`; `medicamento?nregistro=` da el detalle, con
  datos clínicos estructurados por especie. También existe `psuministro`.
- No hay `docSegmentado` (404) ni `notas`. La tabla maestra 7 es la de especies, no la de ATC.

### Notas técnicas sobre Anatomía

- Los modelos están en `public/anatomia/` (un GLB por sistema, unos 22 MB en total) y
  `estructuras.json` (nombres). Se generaron con Blender (módulo `bpy`) a partir de `Startup.blend`
  de Z-Anatomy: objetos visibles de cada colección, simplificados con el modificador Decimate y
  exportados sin materiales ni normales (las normales se calculan en el móvil).
- El 93 % de las estructuras tiene nombre en castellano en TA2.csv; el resto muestra el nombre del modelo.
- El visor (three.js) se descarga aparte, solo al abrir Anatomía. Los modelos se guardan en caché la
  primera vez que se abren.

### Estructura

```
src/
  lib/cima.ts          acceso a la API de CIMA
  lib/cimavet.ts       acceso a la API de CIMAVet (veterinaria)
  lib/cruce.ts         cruce de fichas (búsqueda textual en el apartado 4.5)
  lib/sanear.ts        limpieza del HTML oficial (DOMPurify)
  lib/guardado.ts      favoritos, historial y cruce (localStorage)
  lib/tema.ts          modo claro/oscuro
  components/          cabecera, navegación, buscador, mazo de tarjetas, iconos
  pages/               Farmacia, ficha, ATC, suministro, Anatomía, Imagen, Buscar, fuentes
  styles.css           estilos (colores en variables, fáciles de cambiar)
.github/workflows/
  deploy.yml           publicación automática en GitHub Pages al actualizar main
  comprobar.yml        comprueba que compila en cada PR
```
