// Motor del visor 3D (three.js). Se encarga de la escena, la cámara, los gestos
// táctiles (girar, pellizcar para ampliar, arrastrar con dos dedos para desplazar),
// la carga de cada sistema y la selección de estructuras al tocarlas.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { colorEstructura, SISTEMAS } from './anatomia';

const COLOR_SELECCION = new THREE.Color('#ffb020');

export class VisorAnatomia {
  private renderer: THREE.WebGLRenderer;
  private escena = new THREE.Scene();
  private camara: THREE.PerspectiveCamera;
  private controles: OrbitControls;
  private grupos = new Map<string, THREE.Group>();
  private cargando = new Map<string, Promise<void>>();
  private mallas = new Map<string, THREE.Mesh>();
  private materiales = new Map<string, THREE.MeshStandardMaterial>(); // por color + sistema
  private opacidades = new Map<string, number>();
  private seleccion: THREE.Mesh | null = null;
  private materialSeleccion = new THREE.MeshStandardMaterial({ color: COLOR_SELECCION, emissive: COLOR_SELECCION, emissiveIntensity: 0.35, roughness: 0.5 });
  private rayo = new THREE.Raycaster();
  private observador: ResizeObserver;
  private pendiente = false;
  private inicioToque: { x: number; y: number; t: number } | null = null;
  private encuadrado = false;
  private contenedor: HTMLElement;
  private alSeleccionar: (nodo: string | null) => void;
  private base: string;

  constructor(contenedor: HTMLElement, base: string, alSeleccionar: (nodo: string | null) => void) {
    this.contenedor = contenedor;
    this.base = base;
    this.alSeleccionar = alSeleccionar;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    contenedor.appendChild(this.renderer.domElement);
    this.camara = new THREE.PerspectiveCamera(35, 1, 0.01, 50);
    this.camara.position.set(0, 1, 4);
    this.escena.add(new THREE.HemisphereLight(0xffffff, 0x8a8070, 1.6));
    const luz = new THREE.DirectionalLight(0xffffff, 1.4);
    luz.position.set(0.5, 1, 1);
    this.camara.add(luz); // la luz acompaña a la cámara
    this.escena.add(this.camara);
    this.controles = new OrbitControls(this.camara, this.renderer.domElement);
    this.controles.addEventListener('change', () => this.pedirDibujo());
    this.controles.screenSpacePanning = true;
    this.observador = new ResizeObserver(() => this.ajustarTamano());
    this.observador.observe(contenedor);
    this.ajustarTamano();
    const lienzo = this.renderer.domElement;
    lienzo.addEventListener('pointerdown', this.alPulsar);
    lienzo.addEventListener('pointerup', this.alSoltar);
  }

  private ajustarTamano() {
    const { clientWidth: an, clientHeight: al } = this.contenedor;
    if (!an || !al) return;
    this.renderer.setSize(an, al);
    this.camara.aspect = an / al;
    this.camara.updateProjectionMatrix();
    this.pedirDibujo();
  }

  private pedirDibujo() {
    if (this.pendiente) return;
    this.pendiente = true;
    requestAnimationFrame(() => {
      this.pendiente = false;
      this.renderer.render(this.escena, this.camara);
    });
  }

  private material(sistema: string, color: string): THREE.MeshStandardMaterial {
    const clave = `${sistema}|${color}`;
    let m = this.materiales.get(clave);
    if (!m) {
      m = new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0 });
      m.userData.sistema = sistema;
      this.aplicarOpacidad(m, this.opacidades.get(sistema) ?? SISTEMAS.find((s) => s.id === sistema)?.opacidad ?? 1);
      this.materiales.set(clave, m);
    }
    return m;
  }

  private aplicarOpacidad(m: THREE.MeshStandardMaterial, valor: number) {
    m.opacity = valor;
    m.transparent = valor < 1;
    m.depthWrite = valor >= 1;
    m.needsUpdate = true;
  }

  /** Descarga y añade un sistema (solo la primera vez). */
  cargarSistema(id: string, alProgreso?: (fraccion: number) => void): Promise<void> {
    if (this.grupos.has(id)) return Promise.resolve();
    const enCurso = this.cargando.get(id);
    if (enCurso) return enCurso;
    const promesa = new GLTFLoader()
      .loadAsync(`${this.base}anatomia/${id}.glb`, (e) => e.total && alProgreso?.(e.loaded / e.total))
      .then((gltf) => {
        const grupo = new THREE.Group();
        grupo.name = id;
        const nodos = gltf.parser.json.nodes as { name?: string }[];
        gltf.scene.traverse((obj) => {
          const asoc = gltf.parser.associations.get(obj);
          const idx = asoc && 'nodes' in asoc ? asoc.nodes : undefined;
          if (idx === undefined) return;
          const nombre = nodos[idx]?.name ?? '';
          const mallas: THREE.Mesh[] = [];
          if ((obj as THREE.Mesh).isMesh) mallas.push(obj as THREE.Mesh);
          else obj.children.forEach((h) => (h as THREE.Mesh).isMesh && mallas.push(h as THREE.Mesh));
          for (const malla of mallas) {
            malla.geometry.computeVertexNormals(); // el GLB no lleva normales para pesar menos
            malla.userData.nodo = nombre;
            malla.userData.sistema = id;
            malla.material = this.material(id, colorEstructura(id, nombre));
            malla.userData.material = malla.material;
            this.mallas.set(nombre, malla);
          }
        });
        grupo.add(gltf.scene);
        this.escena.add(grupo);
        this.grupos.set(id, grupo);
        if (!this.encuadrado) {
          this.encuadrar(grupo);
          this.encuadrado = true;
        }
        this.pedirDibujo();
      })
      .finally(() => this.cargando.delete(id));
    this.cargando.set(id, promesa);
    return promesa;
  }

  estaCargado(id: string) {
    return this.grupos.has(id);
  }

  mostrarSistema(id: string, visible: boolean) {
    const g = this.grupos.get(id);
    if (g) g.visible = visible;
    this.pedirDibujo();
  }

  opacidad(id: string, valor: number) {
    this.opacidades.set(id, valor);
    for (const m of this.materiales.values()) if (m.userData.sistema === id) this.aplicarOpacidad(m, valor);
    this.pedirDibujo();
  }

  /** Selecciona una estructura (o ninguna). Con enfocar, acerca la cámara a ella. */
  seleccionar(nodo: string | null, enfocar = false) {
    if (this.seleccion) this.seleccion.material = this.seleccion.userData.material;
    this.seleccion = nodo ? this.mallas.get(nodo) ?? null : null;
    if (this.seleccion) {
      this.seleccion.visible = true;
      this.seleccion.material = this.materialSeleccion;
      if (enfocar) this.encuadrar(this.seleccion, 4);
    }
    this.pedirDibujo();
  }

  ocultar(nodo: string) {
    const m = this.mallas.get(nodo);
    if (m) m.visible = false;
    if (this.seleccion === m) this.seleccionar(null);
    this.pedirDibujo();
  }

  /** Deja visible solo esta estructura. */
  aislar(nodo: string) {
    for (const [n, m] of this.mallas) m.visible = n === nodo;
    const m = this.mallas.get(nodo);
    if (m) this.encuadrar(m, 1.6);
    this.pedirDibujo();
  }

  mostrarTodo() {
    for (const m of this.mallas.values()) m.visible = true;
    this.pedirDibujo();
  }

  recentrar() {
    const visibles = [...this.grupos.values()].filter((g) => g.visible);
    if (visibles.length) {
      const caja = new THREE.Box3();
      visibles.forEach((g) => caja.expandByObject(g));
      this.encuadrarCaja(caja, 1.1);
    }
  }

  private encuadrar(obj: THREE.Object3D, margen = 1.1) {
    this.encuadrarCaja(new THREE.Box3().setFromObject(obj), margen);
  }

  private encuadrarCaja(caja: THREE.Box3, margen: number) {
    if (caja.isEmpty()) return;
    const centro = caja.getCenter(new THREE.Vector3());
    const tam = caja.getSize(new THREE.Vector3());
    const radio = Math.max(tam.x, tam.y, tam.z) / 2;
    const dist = (radio * margen) / Math.sin(THREE.MathUtils.degToRad(this.camara.fov / 2));
    const dir = this.camara.position.clone().sub(this.controles.target).normalize();
    if (dir.lengthSq() === 0) dir.set(0, 0, 1);
    this.controles.target.copy(centro);
    this.camara.position.copy(centro).add(dir.multiplyScalar(Math.max(dist, 0.05)));
    this.camara.near = Math.max(dist / 200, 0.001);
    this.camara.far = dist * 20;
    this.camara.updateProjectionMatrix();
    this.controles.update();
    this.pedirDibujo();
  }

  // Un toque corto (sin arrastrar) selecciona la estructura que hay debajo del dedo.
  private alPulsar = (e: PointerEvent) => {
    this.inicioToque = { x: e.clientX, y: e.clientY, t: performance.now() };
  };
  private alSoltar = (e: PointerEvent) => {
    const ini = this.inicioToque;
    this.inicioToque = null;
    if (!ini || Math.hypot(e.clientX - ini.x, e.clientY - ini.y) > 8 || performance.now() - ini.t > 500) return;
    const r = this.renderer.domElement.getBoundingClientRect();
    const p = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.rayo.setFromCamera(p, this.camara);
    const candidatos = [...this.mallas.values()].filter((m) => m.visible && m.parent && this.visibleEnArbol(m));
    // Las capas casi transparentes (p. ej. piel) no tapan la selección de lo que hay debajo.
    const impacto = this.rayo
      .intersectObjects(candidatos, false)
      .find((i) => ((i.object as THREE.Mesh).userData.material as THREE.Material).opacity > 0.5);
    const nodo = impacto ? (impacto.object.userData.nodo as string) : null;
    this.seleccionar(nodo);
    this.alSeleccionar(nodo);
  };

  private visibleEnArbol(o: THREE.Object3D): boolean {
    for (let x: THREE.Object3D | null = o; x; x = x.parent) if (!x.visible) return false;
    return true;
  }

  destruir() {
    this.observador.disconnect();
    this.controles.dispose();
    this.renderer.domElement.removeEventListener('pointerdown', this.alPulsar);
    this.renderer.domElement.removeEventListener('pointerup', this.alSoltar);
    for (const m of this.mallas.values()) m.geometry.dispose();
    for (const m of this.materiales.values()) m.dispose();
    this.materialSeleccion.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
