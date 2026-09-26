"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { isOfficialWeights, OFFICIAL_WEIGHTS, weightedJevScore, type JevWeights } from '../lib/jevbench-axis-weights.mjs';

type Point = {
  key: string;
  name: string;
  rank: number | null;
  colorVariable: string;
  capability: number;
  cost: number | null;
  speed: number | null;
  jevbenchScore: number | null;
  inClass: boolean;
  axes: { intelligence: number | null; calibration: number | null; speed: number | null; cost: number | null };
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

function weightsFromUrl(value: string | null): JevWeights | null {
  const values = (value ?? '').split(/[-,]/).map(Number);
  if (values.length !== 4 || values.some((number) => !Number.isFinite(number) || number < 0 || number > 100) || values.every((number) => number === 0)) return null;
  return { intelligence: values[0], calibration: values[1], speed: values[2], cost: values[3] };
}

function isWeights(value: unknown): value is JevWeights {
  if (!value || typeof value !== 'object') return false;
  const weights = value as JevWeights;
  return (['intelligence', 'calibration', 'speed', 'cost'] as const).every((axis) => Number.isFinite(weights[axis]) && weights[axis] >= 0)
    && weights.intelligence + weights.calibration + weights.speed + weights.cost > 0;
}

type View = { yaw: number; pitch: number; zoom: number; panX: number; panY: number };
const INITIAL_VIEW: View = { yaw: 0.55, pitch: 0.32, zoom: 1, panX: 0, panY: 0 };
const clamp = (value: number, minimum: number, maximum: number) => Math.max(minimum, Math.min(maximum, value));

/** Canvas-free projection for browsers that disable WebGL. The same measured point coordinates are used. */
function Projected3D({ points, costBounds, jevClassOnly, tipRef, resetViewRef, rankedPoints }: {
  points: Point[];
  costBounds: [number, number];
  jevClassOnly: boolean;
  tipRef: { current: HTMLDivElement | null };
  resetViewRef: { current: () => void };
  rankedPoints: { point: Point; score: number }[];
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ x: number; y: number; view: View; pan: boolean; distance?: number; midX?: number; midY?: number } | null>(null);
  const [size, setSize] = useState({ width: 800, height: 460 });
  const [view, setView] = useState<View>(INITIAL_VIEW);

  useEffect(() => {
    resetViewRef.current = () => setView(INITIAL_VIEW);
    return () => { resetViewRef.current = () => {}; };
  }, [resetViewRef]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const resize = () => setSize({ width: Math.max(1, host.clientWidth), height: Math.max(1, host.clientHeight) });
    resize();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', resize);
      return () => window.removeEventListener('resize', resize);
    }
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      setView((old) => ({ ...old, zoom: clamp(old.zoom * Math.exp(-event.deltaY * 0.001), 0.6, 3) }));
    };
    svg.addEventListener('wheel', wheel, { passive: false });
    return () => svg.removeEventListener('wheel', wheel);
  }, []);

  const scale = Math.min(size.width / 18, size.height / 13) * view.zoom;
  const project = (x: number, y: number, z: number) => {
    const rotatedX = x * Math.cos(view.yaw) + z * Math.sin(view.yaw);
    const rotatedZ = z * Math.cos(view.yaw) - x * Math.sin(view.yaw);
    const rotatedY = y * Math.cos(view.pitch) - rotatedZ * Math.sin(view.pitch);
    const depth = y * Math.sin(view.pitch) + rotatedZ * Math.cos(view.pitch);
    const perspective = 24 / (24 - depth);
    return { x: size.width / 2 + view.panX + rotatedX * scale * perspective, y: size.height / 2 + view.panY - rotatedY * scale * perspective, depth, perspective };
  };
  const coord = (point: Point) => {
    const fraction = point.cost === 0 ? 0 : (Math.log10(point.cost ?? 1) - costBounds[0]) / (costBounds[1] - costBounds[0]);
    return project(10 * (0.5 - clamp(fraction, 0, 1)), 10 * (point.capability / 100 - 0.5), 10 * ((point.speed ?? 0) / 100 - 0.5));
  };
  const plotted = points.filter((point) => point.cost != null && point.speed != null)
    .map((point) => ({ point, at: coord(point) }))
    .sort((a, b) => a.at.depth - b.at.depth);
  const grid: Array<{ a: ReturnType<typeof project>; b: ReturnType<typeof project>; key: string }> = [];
  for (let step = 0; step <= 5; step += 1) {
    const coordinate = -5 + step * 2;
    grid.push({ a: project(coordinate, -5, -5), b: project(coordinate, -5, 5), key: `floor-x-${step}` });
    grid.push({ a: project(-5, -5, coordinate), b: project(5, -5, coordinate), key: `floor-z-${step}` });
    grid.push({ a: project(-5, coordinate, -5), b: project(-5, coordinate, 5), key: `wall-y-${step}` });
  }

  const showTip = (point: Point, clientX: number, clientY: number) => {
    const tip = tipRef.current;
    const host = hostRef.current;
    if (!tip || !host) return;
    const rect = host.getBoundingClientRect();
    tip.textContent = `${point.name}\nCapability ${point.capability.toFixed(1)} · ${describeCost(point.cost)} / 1,000 decisions · Speed ${point.speed?.toFixed(1) ?? '—'}${point.rank == null ? '' : ` · Official rank ${point.rank}`}`;
    tip.hidden = false;
    tip.style.left = `${clamp(clientX - rect.left + 12, 8, Math.max(8, rect.width - 235))}px`;
    tip.style.top = `${clamp(clientY - rect.top + 12, 8, Math.max(8, rect.height - 70))}px`;
  };
  const hideTip = () => { if (tipRef.current) tipRef.current.hidden = true; };
  const distance = (values: { x: number; y: number }[]) => Math.hypot(values[0].x - values[1].x, values[0].y - values[1].y);
  const beginGesture = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.pointerType === 'touch') event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const values = [...pointers.current.values()];
    if (values.length === 1) gesture.current = { x: event.clientX, y: event.clientY, view, pan: event.shiftKey || event.button === 2 };
    else if (values.length >= 2) gesture.current = { x: 0, y: 0, view, pan: false, distance: distance(values), midX: (values[0].x + values[1].x) / 2, midY: (values[0].y + values[1].y) / 2 };
  };
  const moveGesture = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(event.pointerId) || !gesture.current) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const values = [...pointers.current.values()];
    const start = gesture.current;
    if (values.length >= 2 && start.distance) {
      const midX = (values[0].x + values[1].x) / 2;
      const midY = (values[0].y + values[1].y) / 2;
      setView({ ...start.view, zoom: clamp(start.view.zoom * distance(values) / start.distance, 0.6, 3), panX: start.view.panX + midX - (start.midX ?? midX), panY: start.view.panY + midY - (start.midY ?? midY) });
    } else if (values.length === 1 && !start.distance) {
      const dx = event.clientX - start.x, dy = event.clientY - start.y;
      setView(start.pan ? { ...start.view, panX: start.view.panX + dx, panY: start.view.panY + dy } : { ...start.view, yaw: start.view.yaw + dx * 0.008, pitch: clamp(start.view.pitch + dy * 0.008, -1.35, 1.35) });
    }
  };
  const endGesture = (event: ReactPointerEvent<SVGSVGElement>) => {
    pointers.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const remaining = [...pointers.current.values()];
    gesture.current = remaining.length === 1 ? { x: remaining[0].x, y: remaining[0].y, view, pan: false } : null;
  };

  return <div ref={hostRef} className="absolute inset-0" data-bh-jev14-3d-fallback>
    <svg ref={svgRef} className="block h-full w-full cursor-grab active:cursor-grabbing" viewBox={`0 0 ${size.width} ${size.height}`} role="img" aria-label="Interactive projected 3D scatter. Drag to rotate; Shift drag to pan; scroll or pinch to zoom." style={{ touchAction: 'none' }} onPointerDown={beginGesture} onPointerMove={moveGesture} onPointerUp={endGesture} onPointerCancel={endGesture} onContextMenu={(event) => event.preventDefault()}>
      <g aria-hidden="true" stroke="rgb(var(--line))" strokeOpacity="0.55" strokeWidth="1">
        {grid.map(({ a, b, key }) => <line key={key} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />)}
      </g>
      <g aria-hidden="true" className="bh-jev-3d-axis-labels" data-bh-jev14-3d-axis-labels="true" pointerEvents="none" textAnchor="middle" fill="var(--muted)" fontSize="12" fontFamily="inherit">
        {[
          { name: 'cost', text: 'Cost · $/1k decisions · cheaper →', at: project(5.8, -5, 4.2) },
          { name: 'capability', text: 'Capability 0–100', at: project(0, 6.3, 0) },
          { name: 'speed', text: 'Speed · faster →', at: project(0, -5, 7.2) },
        ].map((label) => (
          <text key={label.name} data-bh-jev14-3d-axis-label={label.name} className="bh-jev-3d-axis-label" x={label.at.x} y={label.at.y}>{label.text}</text>
        ))}
      </g>
      <g aria-hidden="true" className="bh-jev-3d-model-labels" data-bh-jev14-3d-model-labels="true" pointerEvents="none" textAnchor="start" fill="var(--muted)" fontSize="11" fontFamily="inherit">
        {rankedPoints
          .filter((entry) => entry.point.cost != null && entry.point.speed != null)
          .slice(0, 5)
          .map((entry, index) => {
            const at = coord(entry.point);
            return (
              <text key={entry.point.key} data-bh-jev14-3d-model-label={entry.point.key} className="bh-jev-3d-model-label" x={at.x + 8} y={at.y - 8} fill={`rgb(var(${entry.point.colorVariable}))`}>
                {`#${index + 1} ${entry.point.name}`}
              </text>
            );
          })}
      </g>
      {plotted.map(({ point, at }) => {
        const radius = clamp((3 + (point.jevbenchScore ?? 0) / 25) * at.perspective * view.zoom ** 0.25, 3, 9);
        const label = `${point.name}, Capability ${point.capability.toFixed(1)}, cost ${describeCost(point.cost)} per 1,000 decisions, Speed ${point.speed?.toFixed(1) ?? 'not reported'}`;
        return <g key={point.key} tabIndex={0} role="button" aria-label={label} data-bh-jev14-3d-point={point.key}
          onPointerEnter={(event) => showTip(point, event.clientX, event.clientY)}
          onPointerMove={(event) => { if (!pointers.current.size) showTip(point, event.clientX, event.clientY); }}
          onPointerDown={(event) => showTip(point, event.clientX, event.clientY)}
          onPointerLeave={(event) => { if (event.pointerType === 'mouse') hideTip(); }}
          onFocus={(event) => { const rect = event.currentTarget.getBoundingClientRect(); showTip(point, rect.left + rect.width / 2, rect.top + rect.height / 2); }}
          onBlur={hideTip} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); const rect = event.currentTarget.getBoundingClientRect(); showTip(point, rect.left + rect.width / 2, rect.top + rect.height / 2); } }}>
          <circle cx={at.x} cy={at.y} r={radius} fill={`rgb(var(${point.colorVariable}))`} fillOpacity={jevClassOnly && !point.inClass ? 0.08 : 0.88} stroke="var(--surface)" strokeWidth="1.5" strokeOpacity={jevClassOnly && !point.inClass ? 0.12 : 0.9} />
          <circle cx={at.x} cy={at.y} r={Math.max(12, radius)} fill="transparent" pointerEvents="all" />
          <title>{label}</title>
        </g>;
      })}
    </svg>
  </div>;
}

export function JevCapability3D({ points, costBounds }: { points: Point[]; costBounds: [number, number] }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const resetViewRef = useRef<() => void>(() => {});
  const updateOpacityRef = useRef<(enabled: boolean) => void>(() => {});
  const updateLabelsRef = useRef<(entries: { point: Point; score: number }[]) => void>(() => {});
  const [visible, setVisible] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [jevClassOnly, setJevClassOnly] = useState(true);
  const jevClassOnlyRef = useRef(jevClassOnly);
  jevClassOnlyRef.current = jevClassOnly;
  const [expanded, setExpanded] = useState(false);
  const [weights, setWeights] = useState<JevWeights>(OFFICIAL_WEIGHTS);
  const [status, setStatus] = useState('The interactive 3D view loads when this panel scrolls into view.');

  useEffect(() => {
    setWeights(weightsFromUrl(new URLSearchParams(window.location.search).get('w')) ?? OFFICIAL_WEIGHTS);
    const onWeightsChange = (event: Event) => {
      const next = (event as CustomEvent<{ weights?: JevWeights }>).detail?.weights;
      if (isWeights(next)) setWeights(next);
    };
    window.addEventListener('jevbench-weights-change', onWeightsChange);
    return () => window.removeEventListener('jevbench-weights-change', onWeightsChange);
  }, []);

  useEffect(() => { updateOpacityRef.current(jevClassOnly); }, [jevClassOnly]);

  useEffect(() => {
    if (!expanded) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [expanded]);

  const officialWeights = isOfficialWeights(weights);
  const ranked = points
    .filter((point) => point.rank != null && (!jevClassOnly || point.inClass))
    .map((point) => ({ point, score: officialWeights ? point.jevbenchScore ?? weightedJevScore(point.axes, weights) : weightedJevScore(point.axes, weights) }))
    .filter((entry): entry is { point: Point; score: number } => entry.score != null)
    .sort((a, b) => b.score - a.score || (a.point.rank ?? Infinity) - (b.point.rank ?? Infinity) || a.point.name.localeCompare(b.point.name))
    .slice(0, 5);
  const rankedKey = ranked.map((entry) => `${entry.point.key}:${entry.score.toFixed(2)}`).join('|');

  useEffect(() => {
    updateLabelsRef.current(ranked);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rankedKey]);

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
    if (!visible || !box || fallback) return;
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
        resetViewRef.current = () => {
          camera.position.set(13, 10, 15);
          controls.target.set(0, 0, 0);
          controls.update();
          renderer.render(scene, camera);
        };

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
          const material = new three.MeshStandardMaterial({ color: colourTriplet(three, point.colorVariable), roughness: 0.5, metalness: 0.05, transparent: true, opacity: !point.inClass && jevClassOnlyRef.current ? 0.08 : 1 });
          materials.push(material);
          const sphere = new three.Mesh(sphereGeometry, material);
          const score = Math.max(0, Math.min(100, point.jevbenchScore ?? 0));
          sphere.scale.setScalar(0.12 + score / 100 * 0.22);
          sphere.position.set(pointX(point), pointY(point), pointZ(point));
          sphere.userData.point = point;
          scene.add(sphere);
          objects.push(sphere);
        }

        updateOpacityRef.current = (enabled) => {
          for (const sphere of objects) {
            const point = sphere.userData.point as Point;
            sphere.material.opacity = enabled && !point.inClass ? 0.08 : 1;
          }
          renderer?.render(scene, camera);
        };

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

        // CR-176.6: axis names for all three axes and permanent labels for the top five
        // systems, kept on screen as DOM overlays anchored to their projected world
        // positions through every rotation, pan and zoom. The top-five set follows the
        // ranked control list (weights / Jev-class toggle) via updateLabelsRef.
        const half = size / 2;
        const labelLayer = document.createElement('div');
        labelLayer.setAttribute('data-bh-jev14-3d-labels', 'true');
        labelLayer.className = 'bh-jev-3d-labels';
        box.appendChild(labelLayer);
        const fixedRefs: { world: any; el: HTMLElement }[] = [];
        let modelRefs: { world: any; el: HTMLElement }[] = [];
        const axisDefs: Array<{ name: 'cost' | 'capability' | 'speed'; text: string; anchor: [number, number, number] }> = [
          { name: 'cost', text: 'Cost · $/1k decisions · cheaper →', anchor: [half * 1.16, -half, half * 0.84] },
          { name: 'capability', text: 'Capability 0–100', anchor: [0, half * 1.26, 0] },
          { name: 'speed', text: 'Speed · faster →', anchor: [0, -half, half * 1.44] },
        ];
        for (const def of axisDefs) {
          const el = document.createElement('div');
          el.textContent = def.text;
          el.setAttribute('data-bh-jev14-3d-axis-label', def.name);
          el.className = 'bh-jev-3d-axis-label';
          el.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;opacity:0;white-space:nowrap;';
          labelLayer.appendChild(el);
          fixedRefs.push({ world: new three.Vector3(def.anchor[0], def.anchor[1], def.anchor[2]), el });
        }
        const layoutLabels = () => {
          const canvas = renderer?.domElement;
          if (!canvas) return;
          const w = canvas.clientWidth || box.clientWidth;
          const h = canvas.clientHeight || box.clientHeight;
          if (!w || !h) return;
          const inset = 6;
          for (const item of [...fixedRefs, ...modelRefs]) {
            const projected = item.world.clone().project(camera);
            const behind = projected.z > 1;
            const px = Math.min(Math.max(((projected.x + 1) / 2) * w, inset), w - inset);
            const py = Math.min(Math.max(((1 - (projected.y + 1) / 2)) * h, inset), h - inset);
            item.el.style.transform = `translate(${px.toFixed(1)}px, ${py.toFixed(1)}px) translate(-50%, -115%)`;
            item.el.style.opacity = behind ? '0' : '1';
          }
        };
        updateLabelsRef.current = (entries: { point: Point; score: number }[]) => {
          for (const ref of modelRefs) ref.el.remove();
          modelRefs = [];
          entries
            .filter((entry) => entry.point.cost != null && entry.point.speed != null)
            .slice(0, 5)
            .forEach((entry, index) => {
              const sphere = objects.find((candidate: any) => (candidate.userData.point as Point) === entry.point);
              if (!sphere) return;
              const el = document.createElement('div');
              el.setAttribute('data-bh-jev14-3d-model-label', entry.point.key);
              el.className = 'bh-jev-3d-model-label';
              const dot = document.createElement('span');
              dot.className = 'bh-jev-3d-model-dot';
              dot.style.backgroundColor = `rgb(var(${entry.point.colorVariable}))`;
              el.appendChild(dot);
              el.appendChild(document.createTextNode(`#${index + 1} ${entry.point.name}`));
              labelLayer.appendChild(el);
              modelRefs.push({ world: sphere.position.clone(), el });
            });
          layoutLabels();
        };
        updateLabelsRef.current(ranked);

        const render = () => { renderer?.render(scene, camera); layoutLabels(); };
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
        const hideTip = () => { if (tooltip) tooltip.hidden = true; };
        renderer.domElement.addEventListener('pointerleave', hideTip);
        cleanupPointer = () => {
          renderer?.domElement.removeEventListener('pointermove', showTip);
          renderer?.domElement.removeEventListener('pointerdown', showTip);
          renderer?.domElement.removeEventListener('pointerleave', hideTip);
        };
        render();
        setStatus(''); // F-176 (Fable pass 33): a ready view needs no announcement; the live region stays for the loading and failure states.
      } catch {
        setFallback(true);
        setStatus('Using the interactive 3D fallback. Drag to rotate; Shift-drag to pan; scroll or pinch to zoom.');
      }
    }).catch(() => {
      if (!disposed) {
        setFallback(true);
        setStatus('Using the interactive 3D fallback. Drag to rotate; Shift-drag to pan; scroll or pinch to zoom.');
      }
    });

    return () => {
      disposed = true;
      resetViewRef.current = () => {};
      updateOpacityRef.current = () => {};
      updateLabelsRef.current = () => {};
      box.querySelector('[data-bh-jev14-3d-labels]')?.remove();
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
  }, [visible, points, costBounds, fallback]);

  return <div className={expanded ? 'fixed inset-0 z-[100] overflow-y-auto bg-panel p-3 shadow-2xl sm:p-6' : 'mt-4'} role={expanded ? 'dialog' : undefined} aria-modal={expanded ? true : undefined} aria-label={expanded ? 'Expanded Capability, cost and speed in 3D' : undefined} data-bh-jev14-3d-expanded={expanded ? 'true' : 'false'}>
    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
      <label className="flex cursor-pointer items-center gap-2 text-xs sm:text-sm"><input type="checkbox" checked={jevClassOnly} onChange={(event) => setJevClassOnly(event.target.checked)} data-bh-jev14-3d-jev-class-only />Jev-class only <span className="bh-muted text-[11px]">(others faded)</span></label>
      <div className="flex gap-2">
        <button type="button" className="bh-jev-preset" onClick={() => resetViewRef.current()} data-bh-jev14-3d-reset>Reset view</button>
        <button type="button" className="bh-jev-preset" onClick={() => setExpanded((value) => !value)} data-bh-jev14-3d-expand>{expanded ? 'Close expanded view' : 'Expand / Show fullscreen'}</button>
      </div>
    </div>
    <div ref={boxRef} className={`relative overflow-hidden rounded-lg border border-line bg-black/[.02] dark:bg-white/[.02] ${expanded ? 'h-[min(72vh,850px)] min-h-[350px]' : 'h-[350px] sm:h-[460px]'}`} data-bh-jev14-capability-3d-view>
      {fallback && <Projected3D points={points} costBounds={costBounds} jevClassOnly={jevClassOnly} tipRef={tipRef} resetViewRef={resetViewRef} rankedPoints={ranked} />}
      <div className="pointer-events-none absolute left-2 top-2 z-10 grid gap-1 rounded-md border border-line bg-panel/90 px-2 py-1.5 text-[11px] font-semibold leading-tight shadow-sm sm:left-3 sm:top-3 sm:text-xs" data-bh-jev14-3d-axes>
        <span>Capability ↑ · 0–100</span><span>Cost · $/1k tasks (log), cheaper →</span><span>Speed · 0–100, faster →</span>
      </div>
      <div ref={tipRef} hidden role="status" className="pointer-events-none absolute z-10 max-w-[230px] whitespace-pre-line rounded-lg border border-line bg-panel px-3 py-2 text-xs shadow-xl" />
      {!visible && <p className="bh-muted absolute inset-x-4 top-1/2 -translate-y-1/2 text-center text-sm">Scroll here to load the interactive 3D view.</p>}
    </div>
    <p className="bh-muted mt-2 text-xs">Top five {jevClassOnly ? 'Jev-class ' : ''}systems by {officialWeights ? 'official JevBench Composite Score' : 'Composite Score with the selected weights (unofficial)'}.</p>
    <ol className="mt-2 grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2" aria-label={`Top five ${jevClassOnly ? 'Jev-class ' : ''}systems by ${officialWeights ? 'official' : 'custom'} composite score in the 3D view`} data-bh-jev14-3d-top-five>
      {ranked.map(({ point, score }, index) => <li key={point.key} className="flex min-w-0 items-start gap-2" data-bh-jev14-3d-leader={point.key}>
        <span className="mt-1 inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: `rgb(var(${point.colorVariable}))` }} aria-hidden="true" />
        <span className="min-w-0"><b>Composite #{index + 1} · {point.name}</b><br /><span className="bh-muted">Score {score.toFixed(1)} · Capability {point.capability.toFixed(1)} · Cost {describeCost(point.cost)} / 1,000 decisions · Speed {point.speed?.toFixed(1) ?? '—'}{point.rank == null ? '' : ` · Official JevBench #${point.rank}`}</span></span>
      </li>)}
    </ol>
    <p className="bh-muted mt-2 text-center text-[11px]">Vertical: Capability · Right: cheaper · Toward you: faster</p>
    <p className="bh-muted mt-1 text-center text-xs" role="status" aria-live="polite" data-bh-jev14-capability-3d-status>{status}</p>
  </div>;
}
