"use client";

import { useEffect, useRef, useState } from 'react';

type Point = {
  key: string;
  name: string;
  colorVariable: string;
  capability: number;
  cost: number | null;
  speed: number | null;
  jevbenchScore: number | null;
};

type ThreeNamespace = Record<string, any>;
type ThreeWindow = Window & { THREE?: ThreeNamespace };

const THREE_SRC = '/vendor/three-r128.min.js';
const CONTROLS_SRC = '/vendor/OrbitControls-r128.js';
const THREE_SRI = 'sha512-dLxUelApnYxpLt6K2iomGngnHO83iUvZytA3YjDUCjT0HDOHKXnVYdf3hU4JjM8uEhxf9nD1/ey98U3t2vZ0qQ==';
const CONTROLS_SRI = 'sha512-OWjUR2x9gBIRwr3XoaFoDXJzmEnVBXMj32nSjd701AcX852h17fmwreGY3Ne/BuLN4bemMBrnE+RAtLekdUqZg==';

let threeLoad: Promise<ThreeNamespace> | null = null;

function appendPinnedScript(src: string, integrity: string, marker: string): Promise<void> {
  const existing = document.querySelector<HTMLScriptElement>(`script[data-bh-jev-three="${marker}"]`);
  if (existing?.dataset.loaded === 'true') return Promise.resolve();
  if (existing?.dataset.failed === 'true') return Promise.reject(new Error('The local 3D library could not be loaded.'));
  if (existing) return new Promise((resolve, reject) => {
    existing.addEventListener('load', () => resolve(), { once: true });
    existing.addEventListener('error', () => reject(new Error('The local 3D library could not be loaded.')), { once: true });
  });
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.integrity = integrity;
    script.crossOrigin = 'anonymous';
    script.async = true;
    script.dataset.bhJevThree = marker;
    script.addEventListener('load', () => { script.dataset.loaded = 'true'; resolve(); }, { once: true });
    script.addEventListener('error', () => { script.dataset.failed = 'true'; reject(new Error('The local 3D library could not be loaded.')); }, { once: true });
    document.head.appendChild(script);
  });
}

function loadThree(): Promise<ThreeNamespace> {
  if (!threeLoad) {
    threeLoad = appendPinnedScript(THREE_SRC, THREE_SRI, 'core')
      .then(() => appendPinnedScript(CONTROLS_SRC, CONTROLS_SRI, 'controls'))
      .then(() => {
        const three = (window as ThreeWindow).THREE;
        if (!three?.OrbitControls) throw new Error('The local 3D controls could not be loaded.');
        return three;
      })
      .catch((error: unknown) => {
        threeLoad = null;
        throw error;
      });
  }
  return threeLoad;
}

function colourTriplet(three: ThreeNamespace, colorVariable: string): any {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(colorVariable).trim();
  const channels = raw.split(/\s+/).map(Number);
  if (channels.length !== 3 || channels.some((value) => !Number.isFinite(value))) return new three.Color('#6b7280');
  return new three.Color(channels[0] / 255, channels[1] / 255, channels[2] / 255);
}

function describeCost(value: number | null): string {
  if (value == null) return 'not reported';
  if (value === 0) return 'Free';
  return value >= 1 ? `$${value.toFixed(2)}` : `$${value.toPrecision(2)}`;
}

export function JevCapability3D({ points, costBounds }: { points: Point[]; costBounds: [number, number] }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState('The interactive 3D view loads when this panel scrolls into view.');

  useEffect(() => {
    const box = boxRef.current;
    if (!box || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: '0px' });
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const box = boxRef.current;
    if (!visible || !box) return;
    let disposed = false;
    let renderer: any;
    let controls: any;
    let observer: ResizeObserver | undefined;
    let resizeListener: (() => void) | undefined;
    let cleanupPointer: (() => void) | undefined;
    const materials: any[] = [];
    const geometries: any[] = [];
    let scene: any;
    const tooltip = tipRef.current;

    setStatus('Loading the interactive 3D view…');
    loadThree().then((three) => {
      if (disposed) return;
      try {
        const width = Math.max(1, box.clientWidth);
        const height = Math.max(1, box.clientHeight);
        scene = new three.Scene();
        const camera = new three.PerspectiveCamera(42, width / height, 0.1, 100);
        camera.position.set(13, 10, 15);
        renderer = new three.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
        renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
        renderer.setSize(width, height);
        renderer.domElement.setAttribute('aria-label', 'Interactive 3D scatter of Capability, cost and Speed');
        renderer.domElement.setAttribute('role', 'img');
        renderer.domElement.style.touchAction = 'none';
        box.prepend(renderer.domElement);

        const controlsInstance = new three.OrbitControls(camera, renderer.domElement);
        controls = controlsInstance;
        controls.enableDamping = false;
        controls.enablePan = true;
        controls.minDistance = 8;
        controls.maxDistance = 30;
        controls.target.set(0, 0, 0);

        scene.add(new three.AmbientLight(0xffffff, 0.72));
        const directional = new three.DirectionalLight(0xffffff, 0.5);
        directional.position.set(7, 11, 8);
        scene.add(directional);

        const size = 10;
        const lowCost = costBounds[0], highCost = costBounds[1];
        const pointX = (point: Point) => {
          const cost = point.cost ?? 0;
          const position = cost === 0 ? 0 : (Math.log10(cost) - lowCost) / (highCost - lowCost);
          return size * (0.5 - Math.max(0, Math.min(1, position)));
        };
        const pointY = (point: Point) => size * (point.capability / 100 - 0.5);
        const pointZ = (point: Point) => size * ((point.speed ?? 0) / 100 - 0.5);
        const lines = new three.BufferGeometry();
        const vertices: number[] = [];
        const gridN = 5;
        const addLine = (a: number[], b: number[]) => { vertices.push(...a, ...b); };
        for (let index = 0; index <= gridN; index += 1) {
          const offset = -size / 2 + size * index / gridN;
          addLine([offset, -size / 2, -size / 2], [offset, -size / 2, size / 2]);
          addLine([-size / 2, -size / 2, offset], [size / 2, -size / 2, offset]);
          addLine([offset, -size / 2, -size / 2], [offset, size / 2, -size / 2]);
          addLine([-size / 2, offset, -size / 2], [size / 2, offset, -size / 2]);
          addLine([-size / 2, -size / 2, offset], [-size / 2, size / 2, offset]);
          addLine([-size / 2, offset, -size / 2], [-size / 2, offset, size / 2]);
        }
        lines.setAttribute('position', new three.Float32BufferAttribute(vertices, 3));
        geometries.push(lines);
        const gridMaterial = new three.LineBasicMaterial({ color: 0x7d8799, transparent: true, opacity: 0.35 });
        scene.add(new three.LineSegments(lines, gridMaterial));
        materials.push(gridMaterial);

        const sphereGeometry = new three.SphereGeometry(1, 16, 12);
        geometries.push(sphereGeometry);
        const objects: any[] = [];
        for (const point of points) {
          if (point.cost == null || point.speed == null) continue;
          const material = new three.MeshStandardMaterial({ color: colourTriplet(three, point.colorVariable), roughness: 0.5, metalness: 0.05 });
          materials.push(material);
          const sphere = new three.Mesh(sphereGeometry, material);
          const score = Math.max(0, Math.min(100, point.jevbenchScore ?? 0));
          sphere.scale.setScalar(0.12 + score / 100 * 0.22);
          sphere.position.set(pointX(point), pointY(point), pointZ(point));
          sphere.userData.point = point;
          scene.add(sphere);
          objects.push(sphere);
        }

        const recolour = () => {
          for (const sphere of objects) {
            const point = sphere.userData.point as Point;
            sphere.material.color.copy(colourTriplet(three, point.colorVariable));
          }
          renderer?.render(scene, camera);
        };
        const themeObserver = new MutationObserver(recolour);
        themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        materials.push({ dispose: () => themeObserver.disconnect() });

        const render = () => renderer?.render(scene, camera);
        controls.addEventListener('change', render);
        const resize = () => {
          const nextWidth = Math.max(1, box.clientWidth);
          const nextHeight = Math.max(1, box.clientHeight);
          renderer?.setSize(nextWidth, nextHeight);
          camera.aspect = nextWidth / nextHeight;
          camera.updateProjectionMatrix();
          render();
        };
        if (typeof ResizeObserver !== 'undefined') {
          observer = new ResizeObserver(resize);
          observer.observe(box);
        } else {
          resizeListener = resize;
          window.addEventListener('resize', resizeListener);
        }

        const raycaster = new three.Raycaster();
        const pointer = new three.Vector2();
        const showTip = (event: PointerEvent) => {
          if (!tooltip) return;
          const rect = renderer.domElement.getBoundingClientRect();
          pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
          pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(pointer, camera);
          const hit = raycaster.intersectObjects(objects, false)[0];
          if (!hit) { tooltip.hidden = true; return; }
          const point = hit.object.userData.point as Point;
          tooltip.textContent = `${point.name}\nCapability ${point.capability.toFixed(1)} · ${describeCost(point.cost)} / 1,000 decisions · Speed ${point.speed?.toFixed(1) ?? '—'}`;
          tooltip.hidden = false;
          tooltip.style.left = `${Math.max(8, Math.min(rect.width - 240, event.clientX - rect.left + 12))}px`;
          tooltip.style.top = `${Math.max(8, Math.min(rect.height - 60, event.clientY - rect.top + 12))}px`;
        };
        renderer.domElement.addEventListener('pointermove', showTip);
        renderer.domElement.addEventListener('pointerdown', showTip);
        cleanupPointer = () => {
          renderer?.domElement.removeEventListener('pointermove', showTip);
          renderer?.domElement.removeEventListener('pointerdown', showTip);
        };
        render();
        setStatus('Interactive 3D view ready.');
      } catch {
        setStatus('This browser could not create the interactive 3D view. Use the Capability and scatter charts above.');
      }
    }).catch(() => {
      if (!disposed) setStatus('The interactive 3D view could not load. Use the Capability and scatter charts above.');
    });

    return () => {
      disposed = true;
      observer?.disconnect();
      if (resizeListener) window.removeEventListener('resize', resizeListener);
      cleanupPointer?.();
      controls?.dispose();
      materials.forEach((material) => material.dispose?.());
      geometries.forEach((item) => item.dispose?.());
      renderer?.dispose?.();
      renderer?.domElement.remove();
      scene?.clear?.();
    };
  }, [visible, points, costBounds]);

  return <div className="mt-4">
    <div ref={boxRef} className="relative h-[350px] overflow-hidden rounded-lg border border-line bg-black/[.02] dark:bg-white/[.02] sm:h-[460px]" data-bh-jev14-capability-3d-view>
      <div ref={tipRef} hidden role="status" className="pointer-events-none absolute z-10 max-w-[230px] whitespace-pre-line rounded-lg border border-line bg-panel px-3 py-2 text-xs shadow-xl" />
      {!visible && <p className="bh-muted absolute inset-x-4 top-1/2 -translate-y-1/2 text-center text-sm">Scroll here to load the interactive 3D view.</p>}
    </div>
    <p className="bh-muted mt-2 text-center text-[11px]">Vertical: Capability · Right: cheaper · Toward you: faster</p>
    <p className="bh-muted mt-1 text-center text-xs" role="status" aria-live="polite" data-bh-jev14-capability-3d-status>{status}</p>
  </div>;
}
