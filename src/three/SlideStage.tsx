import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ACCENT_HEX, SLIDES, SlideData, SurfaceTheme } from '../data/slides';
import { createMaterialBank, MaterialBank } from './materials';
import { buildScenePart1 } from './modelsPart1';
import { buildScenePart2 } from './modelsPart2';
import { SceneClickResult, SceneControlState, SceneLabelAnchor, SceneRuntime } from './types';
import { preloadSceneModels } from './sceneModels';
import { dampValue } from '../utils/presentationLogic';

interface SlideStageProps {
  slide: SlideData;
  navDirection: 'forward' | 'backward';
  controlState: SceneControlState;
  onSceneClickFeedback: (result: SceneClickResult) => void;
}

const THEME_BG_HEX: Record<SurfaceTheme, number> = {
  cream: 0xfff9f2,
  linen: 0xf5ede3,
  peach: 0xfceee4,
  dark: 0x3d3028,
};

/**
 * Two-stop gradient painted on a large inward-facing sphere behind every model.
 * One draw call, no depth writes — gives the deck depth and warmth for free.
 */
const THEME_GRADIENT: Record<SurfaceTheme, { top: number; bottom: number }> = {
  cream: { top: 0xfffcf7, bottom: 0xf3dfca },
  linen: { top: 0xf8f1e8, bottom: 0xe6d3bf },
  peach: { top: 0xfdf1e7, bottom: 0xf5d9c4 },
  dark: { top: 0x3b2f28, bottom: 0x201914 },
};

const BACKDROP_VERT = /* glsl */ `
  varying vec3 vWorldPos;
  void main() {
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const BACKDROP_FRAG = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uBottom;
  uniform vec3 uAccent;
  uniform float uTime;
  varying vec3 vWorldPos;
  void main() {
    float h = clamp(vWorldPos.y * 0.42 + 0.5, 0.0, 1.0);
    vec3 base = mix(uBottom, uTop, smoothstep(0.0, 1.0, h));
    float dist = length(vWorldPos.xz) * 0.09;
    float glow = smoothstep(1.15, 0.0, dist);
    base = mix(base, uAccent, glow * 0.14);
    base += 0.012 * sin(uTime * 0.25 + vWorldPos.y * 1.6);
    gl_FragColor = vec4(base, 1.0);
  }
`;

const _projVec = new THREE.Vector3();
const _worldPos = new THREE.Vector3();
const _tmpColor = new THREE.Color();
const _desiredCamPos = new THREE.Vector3();
const _desiredTarget = new THREE.Vector3();

/** Number of built 3D scenes kept warm so revisiting a slide is instant. */
const RUNTIME_CACHE_MAX = 4;

function detectSoftwareWebGL(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export const SlideStage: React.FC<SlideStageProps> = ({
  slide,
  navDirection,
  controlState,
  onSceneClickFeedback,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const labelLayerRef = useRef<HTMLDivElement | null>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  const slideRef = useRef<SlideData>(slide);
  slideRef.current = slide;

  const navDirRef = useRef<'forward' | 'backward'>(navDirection);
  navDirRef.current = navDirection;

  const stateRef = useRef<SceneControlState>(controlState);
  stateRef.current = controlState;

  const onClickFeedbackRef = useRef(onSceneClickFeedback);
  onClickFeedbackRef.current = onSceneClickFeedback;

  const activeRuntimeRef = useRef<SceneRuntime | null>(null);
  const activeSceneIdRef = useRef<string | null>(null);
  const sceneRootRef = useRef<THREE.Scene | null>(null);
  const matsRef = useRef<MaterialBank | null>(null);
  const keyLightRef = useRef<THREE.DirectionalLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const rimLightRef = useRef<THREE.DirectionalLight | null>(null);
  const accentLightRef = useRef<THREE.PointLight | null>(null);
  const ambientMotesMatRef = useRef<THREE.PointsMaterial | null>(null);
  const backdropRef = useRef<THREE.ShaderMaterial | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const userInteractingRef = useRef(false);
  const cameraTransitionActiveRef = useRef(false);
  const labelNodesRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const runtimeCacheRef = useRef<Map<string, SceneRuntime>>(new Map());
  const transitionStateRef = useRef({
    inProgress: 1,
    dirSign: 1,
    targetKeyIntensity: 1.85,
    targetHemiIntensity: 0.72,
    targetRimIntensity: 0.52,
    targetRimHex: 0xe8775a,
    outgoing: null as {
      runtime: SceneRuntime;
      sceneId: string | null;
      progress: number;
      dirSign: number;
    } | null,
  });

  // ── Runtime cache: reuse a built scene instead of rebuilding geometry ──
  const disposeRuntime = (runtime: SceneRuntime) => {
    runtime.cleanup?.();
    runtime.dispose();
  };

  const releaseRuntime = (sceneId: string | null, runtime: SceneRuntime) => {
    runtime.root.position.set(0, 0, 0);
    runtime.root.rotation.set(0, 0, 0);
    runtime.root.scale.setScalar(1);
    if (!sceneId) {
      disposeRuntime(runtime);
      return;
    }
    const cache = runtimeCacheRef.current;
    cache.set(sceneId, runtime);
    while (cache.size > RUNTIME_CACHE_MAX) {
      const oldestKey = cache.keys().next().value as string | undefined;
      if (oldestKey === undefined) break;
      const evicted = cache.get(oldestKey);
      cache.delete(oldestKey);
      if (evicted) disposeRuntime(evicted);
    }
  };

  const acquireRuntime = (sceneId: string, mats: MaterialBank): SceneRuntime | null => {
    const cache = runtimeCacheRef.current;
    const cached = cache.get(sceneId);
    if (cached) {
      cache.delete(sceneId);
      return cached;
    }
    return buildScenePart1(sceneId, mats) ?? buildScenePart2(sceneId, mats);
  };

  // 1. Mount WebGLRenderer, environment, lights and the render loop ONCE.
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: false,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglFailed(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;

    const basePixelRatio = isSoftwareGl
      ? 1
      : Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(basePixelRatio);
    renderer.setSize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight,
    );
    renderer.shadowMap.enabled = !isSoftwareGl;
    // PCFSoftShadowMap was removed in three r182; PCFShadowMap is the current
    // soft-shadow type.
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.shadowMap.autoUpdate = true;
    rendererRef.current = renderer;

    const domEl = renderer.domElement;
    domEl.style.display = 'block';
    domEl.style.width = '100%';
    domEl.style.height = '100%';
    domEl.style.touchAction = 'none';
    container.appendChild(domEl);

    const onContextLost = (e: Event) => {
      e.preventDefault();
      setWebglFailed(true);
    };
    const onContextRestored = () => setWebglFailed(false);
    domEl.addEventListener('webglcontextlost', onContextLost);
    domEl.addEventListener('webglcontextrestored', onContextRestored);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(THEME_BG_HEX[slideRef.current.theme]);
    scene.fog = new THREE.FogExp2(THEME_BG_HEX[slideRef.current.theme], 0.028);
    sceneRootRef.current = scene;

    // Gradient backdrop (single draw call, no depth write).
    const backdropMat = new THREE.ShaderMaterial({
      uniforms: {
        uTop: { value: new THREE.Color(THEME_GRADIENT[slideRef.current.theme].top) },
        uBottom: { value: new THREE.Color(THEME_GRADIENT[slideRef.current.theme].bottom) },
        uAccent: { value: new THREE.Color(ACCENT_HEX[slideRef.current.accent]) },
        uTime: { value: 0 },
      },
      vertexShader: BACKDROP_VERT,
      fragmentShader: BACKDROP_FRAG,
      side: THREE.BackSide,
      depthWrite: false,
      fog: false,
    });
    backdropRef.current = backdropMat;
    const backdrop = new THREE.Mesh(new THREE.SphereGeometry(42, 24, 16), backdropMat);
    backdrop.frustumCulled = false;
    backdrop.renderOrder = -10;
    scene.add(backdrop);

    // Studio PBR reflections.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.045);
    scene.environment = envTarget.texture;
    pmrem.dispose();

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 90);
    camera.position.set(3.2, 1.35, 5.4);
    cameraRef.current = camera;

    const controls = new OrbitControls(camera, domEl);
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.minDistance = 2.4;
    controls.maxDistance = 12;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.85;
    controls.addEventListener('start', () => {
      userInteractingRef.current = true;
      cameraTransitionActiveRef.current = false;
    });
    controls.addEventListener('end', () => {
      userInteractingRef.current = false;
    });
    controlsRef.current = controls;

    // Warm three-point studio rig + cool hemisphere fill.
    const hemi = new THREE.HemisphereLight(0xdde8f0, 0x6b5344, 0.72);
    scene.add(hemi);
    hemiLightRef.current = hemi;

    const key = new THREE.DirectionalLight(0xfff0dc, 1.85);
    key.position.set(5, 8, 5);
    key.castShadow = !isSoftwareGl;
    key.shadow.mapSize.set(isSoftwareGl ? 512 : 1024, isSoftwareGl ? 512 : 1024);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 24;
    key.shadow.camera.left = -5;
    key.shadow.camera.right = 5;
    key.shadow.camera.top = 5;
    key.shadow.camera.bottom = -5;
    key.shadow.bias = -0.0005;
    key.shadow.normalBias = 0.02;
    scene.add(key);
    keyLightRef.current = key;

    const rim = new THREE.DirectionalLight(0xe8775a, 0.52);
    rim.position.set(-4, 2, -5);
    scene.add(rim);
    rimLightRef.current = rim;

    // Slide-accent point light: a soft coloured glow that shifts per slide.
    const accentLight = new THREE.PointLight(0xe87b5a, 0.0, 14, 2);
    accentLight.position.set(-2.4, -1.6, 3.2);
    scene.add(accentLight);
    accentLightRef.current = accentLight;

    // Ambient workshop motes.
    const moteCount = 56;
    const motePos = new Float32Array(moteCount * 3);
    const moteSpeeds = new Float32Array(moteCount);
    for (let i = 0; i < moteCount; i++) {
      motePos[i * 3] = (Math.random() - 0.5) * 11;
      motePos[i * 3 + 1] = (Math.random() - 0.5) * 6;
      motePos[i * 3 + 2] = (Math.random() - 0.5) * 5 - 1;
      moteSpeeds[i] = 0.2 + Math.random() * 0.45;
    }
    const moteGeo = new THREE.BufferGeometry();
    const motePosAttr = new THREE.BufferAttribute(motePos, 3);
    moteGeo.setAttribute('position', motePosAttr);
    const moteMat = new THREE.PointsMaterial({
      color: 0xd99b3c,
      size: 0.045,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    });
    ambientMotesMatRef.current = moteMat;
    const ambientMotes = new THREE.Points(moteGeo, moteMat);
    ambientMotes.frustumCulled = false;
    scene.add(ambientMotes);

    const maxAniso = Math.min(renderer.capabilities.getMaxAnisotropy(), 8);
    const mats = createMaterialBank(maxAniso);
    matsRef.current = mats;

    // Raycasting + pointer tracking.
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(0);
    let pointerDownPos = { x: 0, y: 0 };
    let lastRaycastMs = 0;
    let lastHoverCheck = 0;

    const onPointerDown = (e: PointerEvent) => {
      pointerDownPos = { x: e.clientX, y: e.clientY };
    };

    const onPointerMove = (e: PointerEvent) => {
      const rect = domEl.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      stateRef.current.pointerNDC.set(ndcX, ndcY);

      const now = performance.now();
      const runtime = activeRuntimeRef.current;
      if (!runtime || runtime.interactables.length === 0) return;
      if (now - lastRaycastMs < 60) return;
      lastRaycastMs = now;

      raycaster.setFromCamera(stateRef.current.pointerNDC, camera);
      const hits = raycaster.intersectObjects(runtime.interactables, true);
      domEl.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
      if (hits.length > 0) {
        const hitObj = hits[0].object;
        if (stateRef.current.hoveredMeshName !== hitObj.uuid) {
          stateRef.current.hoveredMeshName = hitObj.uuid;
          runtime.triggerWobble?.(hitObj);
        }
      } else {
        stateRef.current.hoveredMeshName = null;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      const dist = Math.hypot(e.clientX - pointerDownPos.x, e.clientY - pointerDownPos.y);
      if (dist > 6) return; // orbit drag, not a click
      const runtime = activeRuntimeRef.current;
      if (!runtime || runtime.interactables.length === 0) return;

      const rect = domEl.getBoundingClientRect();
      stateRef.current.pointerNDC.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      raycaster.setFromCamera(stateRef.current.pointerNDC, camera);
      const hits = raycaster.intersectObjects(runtime.interactables, true);
      if (hits.length > 0 && runtime.onObjectClick) {
        const res = runtime.onObjectClick(hits[0].object);
        if (res) {
          if (res.focusPos && res.focusTarget) {
            _desiredCamPos.set(...res.focusPos);
            _desiredTarget.set(...res.focusTarget);
            cameraTransitionActiveRef.current = true;
          }
          onClickFeedbackRef.current(res);
        }
      }
    };

    domEl.addEventListener('pointerdown', onPointerDown);
    domEl.addEventListener('pointermove', onPointerMove);
    domEl.addEventListener('pointerup', onPointerUp);

    const resize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    window.addEventListener('resize', resize);

    // Frame-rate independent clock (Timer replaces the deprecated Clock).
    const timer = new THREE.Timer();
    timer.connect(document);

    // Adaptive quality: drop resolution on slow machines, restore when fast.
    const quality = {
      ratio: basePixelRatio,
      acc: 0,
      frames: 0,
      cooldown: 3,
    };

    function syncProjectedLabels(runtime: SceneRuntime, viewW: number, viewH: number) {
      const layer = labelLayerRef.current;
      if (!layer) return;

      const activeIds = new Set<string>();
      runtime.labelAnchors.forEach((anchor: SceneLabelAnchor) => {
        const shouldShow =
          (!anchor.requiresExploded || stateRef.current.exploded) &&
          (!anchor.requiresAxes || stateRef.current.cncAxesVisible);
        if (!shouldShow) return;
        activeIds.add(anchor.id);

        let node = labelNodesRef.current.get(anchor.id);
        if (!node) {
          node = document.createElement('div');
          node.className = 'label-3d-anchor';
          node.innerHTML =
            '<div class="label-3d-card"><div class="text-[13px] sm:text-sm font-bold leading-tight"></div><div class="text-xs text-[#463E37] mt-0.5 leading-snug"></div></div>';
          layer.appendChild(node);
          labelNodesRef.current.set(anchor.id, node);
        }

        const titleEl = node.firstElementChild?.children[0] as HTMLElement | undefined;
        const descEl = node.firstElementChild?.children[1] as HTMLElement | undefined;
        if (titleEl && titleEl.textContent !== anchor.title) titleEl.textContent = anchor.title;
        if (descEl) {
          const hasDesc = Boolean(anchor.description);
          if (descEl.textContent !== anchor.description) descEl.textContent = anchor.description;
          // A label with no description keeps just the title line.
          const nextDisplay = hasDesc ? '' : 'none';
          if (descEl.style.display !== nextDisplay) descEl.style.display = nextDisplay;
        }

        anchor.object.getWorldPosition(_worldPos);
        _worldPos.add(anchor.offset);
        _projVec.copy(_worldPos).project(camera);

        if (_projVec.z > 1) {
          if (node.dataset.op !== '0') {
            node.dataset.op = '0';
            node.style.opacity = '0';
          }
          return;
        }
        const rawX = (_projVec.x * 0.5 + 0.5) * viewW;
        const rawY = (-_projVec.y * 0.5 + 0.5) * viewH;
        const sx = Math.max(145, Math.min(viewW - 145, rawX));
        const sy = Math.max(105, Math.min(viewH - 115, rawY));
        const qx = Math.round(sx * 2) / 2;
        const qy = Math.round(sy * 2) / 2;
        if (node.dataset.op !== '1') {
          node.dataset.op = '1';
          node.style.opacity = '1';
        }
        if (node.dataset.tx !== String(qx) || node.dataset.ty !== String(qy)) {
          node.dataset.tx = String(qx);
          node.dataset.ty = String(qy);
          node.style.transform = `translate3d(${qx}px, ${qy}px, 0)`;
        }
      });

      labelNodesRef.current.forEach((el, id) => {
        if (!activeIds.has(id)) {
          el.remove();
          labelNodesRef.current.delete(id);
        }
      });
    }

    let disposed = false;

    function tick() {
      if (disposed) return;
      timer.update();
      const dt = Math.min(timer.getDelta(), 0.05);
      const elapsed = timer.getElapsed();

      const theme = slideRef.current.theme;

      // Backdrop + fog colour drift toward the active slide theme.
      const grad = THEME_GRADIENT[theme];
      const backdropMat = backdropRef.current;
      if (backdropMat) {
        _tmpColor.setHex(grad.top);
        (backdropMat.uniforms.uTop.value as THREE.Color).lerp(_tmpColor, 1 - Math.exp(-4 * dt));
        _tmpColor.setHex(grad.bottom);
        (backdropMat.uniforms.uBottom.value as THREE.Color).lerp(_tmpColor, 1 - Math.exp(-4 * dt));
        _tmpColor.setStyle(ACCENT_HEX[slideRef.current.accent]);
        (backdropMat.uniforms.uAccent.value as THREE.Color).lerp(_tmpColor, 1 - Math.exp(-3 * dt));
        backdropMat.uniforms.uTime.value = elapsed;
      }
      _tmpColor.setHex(THEME_BG_HEX[theme]);
      if (scene.background instanceof THREE.Color) {
        scene.background.lerp(_tmpColor, 1 - Math.exp(-5 * dt));
      }
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.color.copy(scene.background as THREE.Color);
      }

      const tr = transitionStateRef.current;

      // Studio rig crossfade between light and dark slides.
      if (keyLightRef.current && hemiLightRef.current && rimLightRef.current) {
        keyLightRef.current.intensity = dampValue(keyLightRef.current.intensity, tr.targetKeyIntensity, 5.5, dt);
        hemiLightRef.current.intensity = dampValue(hemiLightRef.current.intensity, tr.targetHemiIntensity, 5.5, dt);
        rimLightRef.current.intensity = dampValue(rimLightRef.current.intensity, tr.targetRimIntensity, 5.5, dt);
        _tmpColor.setHex(tr.targetRimHex);
        rimLightRef.current.color.lerp(_tmpColor, 1 - Math.exp(-5 * dt));
      }

      // Slide-accent point light: colour and gentle pulse follow the accent.
      if (accentLightRef.current) {
        _tmpColor.setStyle(ACCENT_HEX[slideRef.current.accent]);
        accentLightRef.current.color.lerp(_tmpColor, 1 - Math.exp(-4 * dt));
        const targetIntensity = theme === 'dark' ? 2.1 : 1.25;
        accentLightRef.current.intensity = dampValue(
          accentLightRef.current.intensity,
          targetIntensity + Math.sin(elapsed * 1.6) * 0.18,
          4,
          dt,
        );
      }

      // Atmospheric motes.
      if (ambientMotesMatRef.current) {
        const isDarkTheme = theme === 'dark';
        ambientMotesMatRef.current.opacity = dampValue(
          ambientMotesMatRef.current.opacity,
          isDarkTheme ? 0.55 : 0.28,
          4,
          dt,
        );
        _tmpColor.setHex(isDarkTheme ? 0xffb347 : 0xd99b3c);
        ambientMotesMatRef.current.color.lerp(_tmpColor, 1 - Math.exp(-4 * dt));
      }
      for (let i = 0; i < moteCount; i++) {
        motePos[i * 3 + 1] += moteSpeeds[i] * dt * 0.35;
        motePos[i * 3] += Math.sin(elapsed * 0.6 + i) * dt * 0.08;
        if (motePos[i * 3 + 1] > 3.2) motePos[i * 3 + 1] = -3.2;
      }
      motePosAttr.needsUpdate = true;

      // Glide the outgoing scene away, then park it in the cache.
      if (tr.outgoing) {
        tr.outgoing.progress = Math.min(1, tr.outgoing.progress + dt * 3.6);
        const easedOut = 1 - Math.pow(1 - tr.outgoing.progress, 2);
        const sOut = Math.max(0.001, 1 - easedOut * 0.32);
        tr.outgoing.runtime.root.scale.setScalar(sOut);
        tr.outgoing.runtime.root.position.x = -tr.outgoing.dirSign * easedOut * 0.45;
        tr.outgoing.runtime.root.position.y = easedOut * 0.26;
        tr.outgoing.runtime.root.rotation.y += tr.outgoing.dirSign * dt * 1.1;
        if (tr.outgoing.progress >= 1) {
          scene.remove(tr.outgoing.runtime.root);
          releaseRuntime(tr.outgoing.sceneId, tr.outgoing.runtime);
          tr.outgoing = null;
        }
      }

      const runtime = activeRuntimeRef.current;
      if (runtime) {
        // Directional entrance glide for the newly mounted scene.
        if (tr.inProgress < 1) {
          tr.inProgress = dampValue(tr.inProgress, 1, 6.4, dt);
          if (1 - tr.inProgress < 0.003) tr.inProgress = 1;
          const rem = 1 - tr.inProgress;
          const sIn = 0.85 + tr.inProgress * 0.15;
          runtime.root.scale.setScalar(sIn);
          runtime.root.position.x = tr.dirSign * rem * 0.46;
          runtime.root.position.y = rem * -0.18;
          runtime.root.rotation.y = -tr.dirSign * rem * 0.28;
        }

        runtime.update(dt, elapsed, stateRef.current);

        if (cameraTransitionActiveRef.current && !userInteractingRef.current) {
          camera.position.x = dampValue(camera.position.x, _desiredCamPos.x, 4.8, dt);
          camera.position.y = dampValue(camera.position.y, _desiredCamPos.y, 4.8, dt);
          camera.position.z = dampValue(camera.position.z, _desiredCamPos.z, 4.8, dt);
          controls.target.x = dampValue(controls.target.x, _desiredTarget.x, 5.2, dt);
          controls.target.y = dampValue(controls.target.y, _desiredTarget.y, 5.2, dt);
          controls.target.z = dampValue(controls.target.z, _desiredTarget.z, 5.2, dt);
          if (camera.position.distanceTo(_desiredCamPos) < 0.03) {
            cameraTransitionActiveRef.current = false;
          }
        } else if (runtime.autoOrbit && !userInteractingRef.current) {
          const radius = Math.hypot(camera.position.x - controls.target.x, camera.position.z - controls.target.z);
          const curAng = Math.atan2(camera.position.z - controls.target.z, camera.position.x - controls.target.x);
          const nextAng = curAng + runtime.orbitSpeed * dt;
          camera.position.x = controls.target.x + Math.cos(nextAng) * radius;
          camera.position.z = controls.target.z + Math.sin(nextAng) * radius;
        }

        controls.update();
        syncProjectedLabels(runtime, domEl.clientWidth || width, domEl.clientHeight || height);
      }

      renderer.render(scene, camera);

      // Adaptive resolution.
      if (!isSoftwareGl) {
        quality.acc += dt;
        quality.frames++;
        if (quality.frames >= 60) {
          const avg = quality.acc / quality.frames;
          quality.acc = 0;
          quality.frames = 0;
          if (quality.cooldown > 0) {
            quality.cooldown--;
          } else if (avg > 0.027 && quality.ratio > 1) {
            quality.ratio = Math.max(1, quality.ratio - 0.25);
            renderer.setPixelRatio(quality.ratio);
            quality.cooldown = 3;
          } else if (avg < 0.014 && quality.ratio < basePixelRatio) {
            quality.ratio = Math.min(basePixelRatio, quality.ratio + 0.25);
            renderer.setPixelRatio(quality.ratio);
            quality.cooldown = 3;
          }
        }
      }
    }

    renderer.setAnimationLoop(tick);

    return () => {
      disposed = true;
      renderer.setAnimationLoop(null);
      timer.disconnect();
      resizeObserver.disconnect();
      window.removeEventListener('resize', resize);
      domEl.removeEventListener('pointerdown', onPointerDown);
      domEl.removeEventListener('pointermove', onPointerMove);
      domEl.removeEventListener('pointerup', onPointerUp);
      domEl.removeEventListener('webglcontextlost', onContextLost);
      domEl.removeEventListener('webglcontextrestored', onContextRestored);

      if (transitionStateRef.current.outgoing) {
        scene.remove(transitionStateRef.current.outgoing.runtime.root);
        disposeRuntime(transitionStateRef.current.outgoing.runtime);
        transitionStateRef.current.outgoing = null;
      }
      if (activeRuntimeRef.current) disposeRuntime(activeRuntimeRef.current);
      activeRuntimeRef.current = null;
      runtimeCacheRef.current.forEach((rt) => disposeRuntime(rt));
      runtimeCacheRef.current.clear();
      moteGeo.dispose();
      moteMat.dispose();
      backdrop.geometry.dispose();
      backdropMat.dispose();
      mats.dispose();
      envTarget.dispose();
      controls.dispose();
      renderer.dispose();
      if (domEl.parentNode === container) {
        container.removeChild(domEl);
      }
    };
  }, []);

  // 2. Swap the active 3D scene when the slide changes.
  useEffect(() => {
    const scene = sceneRootRef.current;
    const mats = matsRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;
    const renderer = rendererRef.current;
    if (!scene || !mats || !camera || !controls) return;

    // Warm this scene's models plus its neighbours, so a forward or backward
    // step finds them already in memory.
    preloadSceneModels(slide.sceneId);
    const idx = SLIDES.findIndex((s) => s.id === slide.id);
    if (idx >= 0) {
      if (SLIDES[idx + 1]) preloadSceneModels(SLIDES[idx + 1].sceneId);
      if (SLIDES[idx - 1]) preloadSceneModels(SLIDES[idx - 1].sceneId);
    }

    const hadPrev = Boolean(activeRuntimeRef.current);
    const tr = transitionStateRef.current;
    const dirSign = navDirRef.current === 'forward' ? 1 : -1;

    if (tr.outgoing) {
      scene.remove(tr.outgoing.runtime.root);
      releaseRuntime(tr.outgoing.sceneId, tr.outgoing.runtime);
      tr.outgoing = null;
    }
    if (activeRuntimeRef.current) {
      tr.outgoing = {
        runtime: activeRuntimeRef.current,
        sceneId: activeSceneIdRef.current,
        progress: 0,
        dirSign,
      };
      activeRuntimeRef.current = null;
    }
    labelNodesRef.current.forEach((el) => el.remove());
    labelNodesRef.current.clear();

    const nextRuntime = acquireRuntime(slide.sceneId, mats);
    if (!nextRuntime) return;
    activeRuntimeRef.current = nextRuntime;
    activeSceneIdRef.current = slide.sceneId;
    tr.dirSign = dirSign;
    if (hadPrev) {
      tr.inProgress = 0;
      nextRuntime.root.scale.setScalar(0.85);
      nextRuntime.root.position.x = dirSign * 0.46;
      nextRuntime.root.position.y = -0.18;
      nextRuntime.root.rotation.y = -dirSign * 0.28;
    } else {
      tr.inProgress = 1;
      nextRuntime.root.position.set(0, 0, 0);
      nextRuntime.root.rotation.set(0, 0, 0);
      nextRuntime.root.scale.setScalar(1);
    }
    scene.add(nextRuntime.root);

    if (nextRuntime.darkAtmosphere) {
      tr.targetKeyIntensity = 1.45;
      tr.targetHemiIntensity = 0.55;
      tr.targetRimIntensity = 1.05;
      tr.targetRimHex = slide.accent === 'lavender' ? 0xa78ec4 : 0xe8775a;
    } else {
      tr.targetKeyIntensity = 1.85;
      tr.targetHemiIntensity = 0.72;
      tr.targetRimIntensity = 0.52;
      tr.targetRimHex = 0xe8775a;
    }

    _desiredCamPos.set(...nextRuntime.cameraPos);
    _desiredTarget.set(...nextRuntime.cameraTarget);
    if (!hadPrev) {
      camera.position.copy(_desiredCamPos);
      controls.target.copy(_desiredTarget);
      controls.update();
      cameraTransitionActiveRef.current = false;
      if (keyLightRef.current && hemiLightRef.current && rimLightRef.current) {
        keyLightRef.current.intensity = tr.targetKeyIntensity;
        hemiLightRef.current.intensity = tr.targetHemiIntensity;
        rimLightRef.current.intensity = tr.targetRimIntensity;
        rimLightRef.current.color.setHex(tr.targetRimHex);
      }
    } else {
      cameraTransitionActiveRef.current = true;
    }
    nextRuntime.update(0.016, 0, stateRef.current);

    // Prewarm shaders off the critical path so the first frames never stall.
    if (renderer) {
      void renderer.compileAsync(scene, camera).catch(() => undefined);
    }
  }, [slide.id, slide.sceneId, slide.accent]);

  if (webglFailed) {
    return (
      <div
        data-testid="webgl-fallback"
        className="absolute inset-0 flex items-center justify-center bg-[#FFF9F2] text-[#2D2520] p-8"
      >
        <div className="max-w-md text-center rounded-2xl border border-[#2D2520]/10 bg-white p-6 shadow-md">
          <p className="t-eyebrow text-[#E87B5A] mb-2">Chế độ xem tương thích</p>
          <p className="text-sm text-[#5C534B]">
            Trình duyệt hiện chưa bật WebGL tăng tốc phần cứng. Nội dung bài học vẫn hiển thị đầy đủ.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      <div ref={mountRef} data-testid="three-canvas-mount" className="w-full h-full" />
      {/* Soft edge vignette: lifts the text panels off the 3D scene without
          hiding it. Pure CSS, no extra draw calls. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 78% 72% at 50% 48%, transparent 42%, rgba(45,37,32,0.07) 100%)',
        }}
      />
      <div ref={labelLayerRef} className="pointer-events-none absolute inset-0 overflow-hidden" />
    </div>
  );
};
