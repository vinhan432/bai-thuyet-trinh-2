import * as THREE from 'three';
import { MaterialBank, createContactShadowDisc, makeSoftPolymer } from './materials';
import { createCompositeSpurGear, disposeObjectTree } from './gearFactory';
import { SceneRuntime, SceneLabelAnchor } from './types';
import { ENGINE_PARTS } from '../data/slides';
import { computeCaliperMm, computeV4PistonOffsets, dampValue } from '../utils/presentationLogic';

const _q1 = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _obj = new THREE.Object3D();

function getSharedMaterialSet(mats: MaterialBank): Set<THREE.Material> {
  return new Set<THREE.Material>([
    mats.goldenMetal,
    mats.warmMetal,
    mats.copperMetal,
    mats.matteSteel,
    mats.darkIron,
    mats.chromeAccent,
    mats.blueprintWire,
    mats.glowingAmber,
    mats.glowingLavender,
    mats.glowingMint,
    mats.contactShadowMat,
  ]);
}

function createWrenchGroup(mats: MaterialBank): THREE.Group {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.35, 0.08), mats.chromeAccent);
  const headTop = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.075, 10, 20, Math.PI * 1.45), mats.chromeAccent);
  headTop.position.y = 0.72;
  headTop.rotation.z = 0.7;
  const headBot = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.065, 10, 20), mats.warmMetal);
  headBot.position.y = -0.72;
  const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.14, 6), mats.goldenMetal);
  bolt.rotation.x = Math.PI / 2;
  bolt.position.set(0, 0.74, 0);
  g.add(handle, headTop, headBot, bolt);
  return g;
}

export function buildScenePart2(sceneId: string, mats: MaterialBank): SceneRuntime | null {
  const shared = getSharedMaterialSet(mats);
  const root = new THREE.Group();
  const interactables: THREE.Object3D[] = [];
  const labelAnchors: SceneLabelAnchor[] = [];

  switch (sceneId) {
    // ══════════════════════════════════════════════════════════════
    // SLIDE 13: Maintenance Technician (3 Tool Vignettes)
    // ══════════════════════════════════════════════════════════════
    case 'maintenance-tools': {
      // Left: Wrench + bolt
      const wrench = createWrenchGroup(mats);
      wrench.position.set(-2.3, 0.45, 0);

      // Center: Diagnostic gear pulsing healthy sage -> amber
      const diagGear = createCompositeSpurGear(mats, {
        outerRadius: 0.78,
        innerRadius: 0.22,
        teeth: 16,
        thickness: 0.22,
        spokes: 5,
        rimMaterial: makeSoftPolymer(0x7db58e, 0.42),
      });
      diagGear.position.set(0, 0.45, 0);

      // Right: Copper Oil Can (LatheGeometry + TubeGeometry spout)
      const oilCan = new THREE.Group();
      const canPts = [
        new THREE.Vector2(0, -0.45),
        new THREE.Vector2(0.45, -0.45),
        new THREE.Vector2(0.48, -0.15),
        new THREE.Vector2(0.28, 0.25),
        new THREE.Vector2(0.1, 0.35),
        new THREE.Vector2(0, 0.35),
      ];
      const canBody = new THREE.Mesh(new THREE.LatheGeometry(canPts, 24), mats.copperMetal);
      const spoutCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.32, 0),
        new THREE.Vector3(-0.32, 0.56, 0),
        new THREE.Vector3(-0.58, 0.62, 0),
      ]);
      const spout = new THREE.Mesh(new THREE.TubeGeometry(spoutCurve, 16, 0.035, 8, false), mats.goldenMetal);
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 8, 20, Math.PI), mats.darkIron);
      handle.position.set(0.36, 0.05, 0);
      handle.rotation.z = -Math.PI / 2;
      oilCan.add(canBody, spout, handle);
      oilCan.position.set(2.3, 0.45, 0);

      const shadow = createContactShadowDisc(mats.contactShadowMat, 3.8, -0.9);
      root.add(wrench, diagGear, oilCan, shadow);

      return {
        root,
        interactables,
        labelAnchors,
        cameraPos: [0, 0.9, 6.2],
        cameraTarget: [0, 0.15, 0],
        autoOrbit: false,
        orbitSpeed: 0,
        darkAtmosphere: false,
        update: (_dt, elapsed) => {
          wrench.rotation.y = elapsed * 0.7;
          wrench.rotation.z = Math.sin(elapsed * 1.4) * 0.22;
          diagGear.rotation.z = elapsed * 0.65;
          oilCan.rotation.z = 0.2 + Math.sin(elapsed * 1.8) * 0.22;
        },
        dispose: () => disposeObjectTree(root, shared),
      };
    }

    // ══════════════════════════════════════════════════════════════
    // SLIDE 14: V4 Engine Cutaway (Live 1-3-4-2 Pistons + Explode)
    // ══════════════════════════════════════════════════════════════
    case 'engine-cutaway': {
      const engine = new THREE.Group();
      engine.position.set(-1.35, 0.05, 0);
      engine.scale.setScalar(0.68);

      // 1. Engine block (cutaway housing + 4 finned cylinder sleeves)
      const blockGroup = new THREE.Group();
      blockGroup.name = 'engine_block';
      const lowerBlock = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.75, 1.05), mats.matteSteel);
      lowerBlock.position.y = -0.52;
      const rearWall = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.95, 0.18), mats.darkIron);
      rearWall.position.set(0, 0.22, -0.44);
      blockGroup.add(lowerBlock, rearWall);

      const cylX = [-0.78, -0.26, 0.26, 0.78];
      cylX.forEach((cx) => {
        const sleeve = new THREE.Mesh(
          new THREE.CylinderGeometry(0.22, 0.22, 0.78, 20, 1, true),
          mats.matteSteel,
        );
        sleeve.position.set(cx, 0.16, 0);
        blockGroup.add(sleeve);
        for (let f = 0; f < 3; f++) {
          const fin = new THREE.Mesh(
            new THREE.TorusGeometry(0.235, 0.018, 6, 20),
            mats.darkIron,
          );
          fin.rotation.x = Math.PI / 2;
          fin.position.set(cx, -0.02 + f * 0.18, 0);
          blockGroup.add(fin);
        }
      });

      // 2. Crankshaft + toothed flywheel disc
      const crankGroup = new THREE.Group();
      crankGroup.name = 'crankshaft';
      const mainJournal = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 2.45, 18), mats.chromeAccent);
      mainJournal.rotation.z = Math.PI / 2;
      crankGroup.add(mainJournal);
      cylX.forEach((cx, i) => {
        const web = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.36, 0.24), mats.copperMetal);
        web.position.set(cx, i === 0 || i === 3 ? 0.12 : -0.12, 0);
        crankGroup.add(web);
      });
      const flywheel = createCompositeSpurGear(mats, {
        outerRadius: 0.44,
        innerRadius: 0.1,
        teeth: 18,
        thickness: 0.11,
        spokes: 5,
        rimMaterial: mats.darkIron,
      });
      flywheel.rotation.y = Math.PI / 2;
      flywheel.position.set(1.26, 0, 0);
      crankGroup.add(flywheel);
      crankGroup.position.y = -0.62;

      // 3. Piston Assembly (4 pistons + connecting rods + wrist pins)
      const pistonGroup = new THREE.Group();
      pistonGroup.name = 'piston_assembly';
      const pistons: THREE.Group[] = [];
      cylX.forEach((cx) => {
        const pUnit = new THREE.Group();
        const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.28, 20), mats.goldenMetal);
        const wristPin = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.28, 12), mats.chromeAccent);
        wristPin.rotation.x = Math.PI / 2;
        wristPin.position.y = -0.06;
        const rod = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.58, 0.06), mats.warmMetal);
        rod.position.y = -0.36;
        pUnit.add(crown, wristPin, rod);
        pUnit.position.set(cx, 0.1, 0);
        pistons.push(pUnit);
        pistonGroup.add(pUnit);
      });

      // 4. Cylinder Head + valve springs + rocker bar
      const headGroup = new THREE.Group();
      headGroup.name = 'cylinder_head';
      const headBlock = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.32, 0.96), mats.warmMetal);
      headBlock.position.y = 0.72;
      const rockerBar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.2, 12), mats.chromeAccent);
      rockerBar.rotation.z = Math.PI / 2;
      rockerBar.position.set(0, 0.98, 0.22);
      headGroup.add(headBlock, rockerBar);
      cylX.forEach((cx) => {
        const sparkPlug = new THREE.Mesh(
          new THREE.CylinderGeometry(0.045, 0.045, 0.26, 12),
          makeSoftPolymer(0xe87b5a, 0.4),
        );
        sparkPlug.position.set(cx, 0.96, 0);
        const valveSpring = new THREE.Mesh(
          new THREE.CylinderGeometry(0.075, 0.075, 0.18, 12),
          mats.copperMetal,
        );
        valveSpring.position.set(cx, 0.94, 0.22);
        headGroup.add(sparkPlug, valveSpring);
      });

      // 5. Camshaft
      const camGroup = new THREE.Group();
      camGroup.name = 'camshaft';
      const camShaftBar = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 2.3, 16), mats.chromeAccent);
      camShaftBar.rotation.z = Math.PI / 2;
      camGroup.add(camShaftBar);
      cylX.forEach((cx) => {
        const lobe = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.12, 12), mats.goldenMetal);
        lobe.rotation.z = Math.PI / 2;
        lobe.scale.set(1, 1.35, 0.85);
        lobe.position.set(cx, 0, 0);
        camGroup.add(lobe);
      });
      camGroup.position.set(0, 1.08, -0.18);

      // 6. Timing Chain / Belt Front Drive
      const timingGroup = new THREE.Group();
      timingGroup.name = 'timing_chain';
      const topSprocket = createCompositeSpurGear(mats, {
        outerRadius: 0.24,
        innerRadius: 0.06,
        teeth: 12,
        thickness: 0.09,
        spokes: 3,
        rimMaterial: mats.copperMetal,
      });
      topSprocket.rotation.y = Math.PI / 2;
      topSprocket.position.set(-1.32, 0.92, 0);
      const botSprocket = createCompositeSpurGear(mats, {
        outerRadius: 0.32,
        innerRadius: 0.08,
        teeth: 16,
        thickness: 0.09,
        spokes: 4,
        rimMaterial: mats.goldenMetal,
      });
      botSprocket.rotation.y = Math.PI / 2;
      botSprocket.position.set(-1.32, -0.62, 0);
      const belt = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.62, 0.32), mats.darkIron);
      belt.position.set(-1.32, 0.15, 0);
      timingGroup.add(topSprocket, botSprocket, belt);

      engine.add(blockGroup, crankGroup, pistonGroup, headGroup, camGroup, timingGroup);
      const shadow = createContactShadowDisc(mats.contactShadowMat, 3.1, -1.5);
      shadow.position.x = -1.1;
      root.add(engine, shadow);
      interactables.push(pistonGroup, crankGroup, camGroup, headGroup, blockGroup, timingGroup);

      const engineLabelOffsets: Record<string, [number, number, number]> = {
        piston_assembly: [-1.05, 0.25, 0],
        camshaft: [0.15, 0.62, 0],
        cylinder_head: [-0.38, 1.06, 0],
        engine_block: [0.45, 0.22, 0],
        crankshaft: [0.05, -0.32, 0],
        timing_chain: [-1.15, 0.45, 0],
      };

      const partsState = ENGINE_PARTS.map((cfg) => {
        const mesh = engine.getObjectByName(cfg.meshName)!;
        const origPos = mesh.position.clone();
        const expPos = new THREE.Vector3(...cfg.explodedPosition);
        const off = engineLabelOffsets[cfg.meshName] ?? [0, 0.55, 0];
        labelAnchors.push({
          id: cfg.meshName,
          object: mesh,
          offset: new THREE.Vector3(...off),
          title: cfg.label,
          description: cfg.description,
          requiresExploded: true,
        });
        return { mesh, origPos, expPos, cfg };
      });

      let explodeProgress = 0;
      let crankPhase = 0;
      return {
        root,
        interactables,
        labelAnchors,
        cameraPos: [-0.3, 0.95, 6.6],
        cameraTarget: [-0.2, 0.05, 0],
        autoOrbit: false,
        orbitSpeed: 0,
        darkAtmosphere: false,
        onObjectClick: (clicked) => {
          const hit = partsState.find(
            (p) => p.mesh === clicked || p.mesh.children.includes(clicked) || clicked.parent === p.mesh,
          );
          if (hit) {
            return { title: hit.cfg.label, description: hit.cfg.description };
          }
          return null;
        },
        update: (dt, elapsed, state) => {
          engine.rotation.y = Math.sin(elapsed * 0.3) * 0.25 + 0.32;
          explodeProgress = dampValue(explodeProgress, state.exploded ? 1 : 0, 5.5, dt);
          partsState.forEach((p) => {
            p.mesh.position.lerpVectors(p.origPos, p.expPos, explodeProgress);
          });

          crankPhase += Math.min(dt, 0.05) * 4.2 * state.engineRpmMultiplier;
          crankGroup.rotation.x = crankPhase;
          camGroup.rotation.x = crankPhase * 0.5;
          const offsets = computeV4PistonOffsets(crankPhase, 0.24);
          pistons.forEach((p, i) => {
            p.position.y = 0.05 + offsets[i];
          });
        },
        dispose: () => disposeObjectTree(root, shared),
      };
    }

    // ══════════════════════════════════════════════════════════════
    // SLIDE 15: Vernier Caliper Measuring Precision Shaft
    // ══════════════════════════════════════════════════════════════
    case 'caliper': {
      const caliper = new THREE.Group();
      caliper.position.set(0, 0.25, 0);

      const scaleMat = new THREE.MeshStandardMaterial({
        map: mats.caliperScaleTex,
        metalness: 0.35,
        roughness: 0.38,
      });

      // Main beam
      const beam = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.34, 0.09), [
        mats.warmMetal,
        mats.warmMetal,
        mats.warmMetal,
        mats.warmMetal,
        scaleMat,
        mats.warmMetal,
      ]);
      beam.castShadow = true;

      // Fixed left jaw
      const fixedJaw = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.05, 0.1), mats.chromeAccent);
      fixedJaw.position.set(-1.55, -0.45, 0);

      // Sliding vernier carriage + moving jaw
      const sliderGroup = new THREE.Group();
      const carriage = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.44, 0.14), mats.matteSteel);
      const movingJaw = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.05, 0.1), mats.chromeAccent);
      movingJaw.position.set(-0.22, -0.45, 0);
      const thumbWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.18, 16), mats.goldenMetal);
      thumbWheel.rotation.x = Math.PI / 2;
      thumbWheel.position.set(0.2, -0.22, 0.05);
      sliderGroup.add(carriage, movingJaw, thumbWheel);

      // Measured machined cylinder between jaws
      const part = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.65, 28), mats.copperMetal);
      part.rotation.x = Math.PI / 2;
      part.position.set(-0.98, -0.62, 0);
      part.name = 'measured_part';

      caliper.add(beam, fixedJaw, sliderGroup, part);
      const shadow = createContactShadowDisc(mats.contactShadowMat, 3.0, -1.25);
      root.add(caliper, shadow);
      interactables.push(part);

      labelAnchors.push({
        id: 'caliper_readout',
        object: sliderGroup,
        offset: new THREE.Vector3(-0.2, 0.55, 0),
        title: 'Đo kiểm kích thước',
        description: computeCaliperMm(0.6),
      });

      let jawOpen = 0.65;
      return {
        root,
        interactables,
        labelAnchors,
        cameraPos: [0, 0.45, 4.4],
        cameraTarget: [-0.2, -0.05, 0],
        autoOrbit: false,
        orbitSpeed: 0,
        darkAtmosphere: false,
        onObjectClick: () => ({
          title: 'Chi tiết trục chính xác',
          description: 'Dung sai yêu cầu ±0,01 mm — kiểm tra trực tiếp bằng thước kẹp.',
        }),
        update: (dt, _elapsed, state) => {
          jawOpen = dampValue(jawOpen, state.caliperOpenNorm, 8, dt);
          const x = -1.2 + jawOpen * 1.45;
          sliderGroup.position.x = x;
          const dia = 0.25 + jawOpen * 0.62;
          part.scale.set(dia / 0.45, 1, dia / 0.45);
          part.position.x = -1.43 + dia;
          labelAnchors[0].description = `Đường kính đo: ${computeCaliperMm(jawOpen)}`;
        },
        dispose: () => disposeObjectTree(root, shared),
      };
    }

    // ══════════════════════════════════════════════════════════════
    // SLIDE 16: 6-DOF Industrial Robot Arm (Pick & Place, Dark)
    // ══════════════════════════════════════════════════════════════
    case 'robot-arm': {
      const robot = new THREE.Group();
      robot.position.set(-0.4, -1.15, 0);

      const lavenderPaint = makeSoftPolymer(0xa78ec4, 0.36);

      // Base pedestal with warm steel collar for dark-stage contrast
      const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.82, 0.32, 28), mats.matteSteel);
      pedestal.position.y = 0.16;
      const baseRing = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.045, 10, 32), mats.goldenMetal);
      baseRing.rotation.x = Math.PI / 2;
      baseRing.position.y = 0.02;

      // Joint 1: Rotating waist turret
      const waist = new THREE.Group();
      waist.position.y = 0.32;
      const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.52, 0.42, 24), lavenderPaint);
      turret.position.y = 0.21;
      waist.add(turret);

      // Joint 2: Shoulder + servo motor caps & cooling ribs
      const shoulder = new THREE.Group();
      shoulder.position.y = 0.42;
      const shoulderHub = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.46, 22), mats.goldenMetal);
      shoulderHub.rotation.x = Math.PI / 2;
      const shoulderMotorCap = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.18, 18), mats.darkIron);
      shoulderMotorCap.rotation.x = Math.PI / 2;
      shoulderMotorCap.position.z = -0.3;
      const lowerArm = new THREE.Mesh(new THREE.BoxGeometry(0.26, 1.35, 0.28), lavenderPaint);
      lowerArm.position.y = 0.68;

      // Corrugated cable conduit curve from shoulder to elbow
      const conduitCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.14, 0.18, 0.18),
        new THREE.Vector3(-0.3, 0.68, 0.22),
        new THREE.Vector3(-0.18, 1.24, 0.16),
      ]);
      const conduitTube = new THREE.Mesh(
        new THREE.TubeGeometry(conduitCurve, 18, 0.036, 8, false),
        mats.darkIron,
      );
      shoulder.add(shoulderHub, shoulderMotorCap, lowerArm, conduitTube);
      waist.add(shoulder);

      // Joint 3: Elbow + cooling ribs
      const elbow = new THREE.Group();
      elbow.position.y = 1.35;
      const elbowHub = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.42, 22), mats.goldenMetal);
      elbowHub.rotation.x = Math.PI / 2;
      const elbowRib = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 20), mats.copperMetal);
      elbowRib.rotation.x = Math.PI / 2;
      elbowRib.position.z = 0.22;
      const upperArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.1, 0.22), mats.warmMetal);
      upperArm.position.y = 0.55;
      elbow.add(elbowHub, elbowRib, upperArm);
      shoulder.add(elbow);

      // Joint 4/5: Wrist + Parallel Gripper with guide rails
      const wrist = new THREE.Group();
      wrist.position.y = 1.1;
      const wristHub = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), mats.copperMetal);
      const gripperBase = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.09, 0.18), mats.darkIron);
      gripperBase.position.set(0, 0.14, 0);
      const guideRail = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.38, 10), mats.chromeAccent);
      guideRail.rotation.z = Math.PI / 2;
      guideRail.position.set(0, 0.14, 0.06);
      const fingerL = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.28, 0.09), mats.chromeAccent);
      fingerL.position.set(-0.12, 0.24, 0);
      const fingerR = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.28, 0.09), mats.chromeAccent);
      fingerR.position.set(0.12, 0.24, 0);
      const payloadInHand = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.24), mats.glowingAmber);
      payloadInHand.position.set(0, 0.28, 0);
      wrist.add(wristHub, gripperBase, guideRail, fingerL, fingerR, payloadInHand);
      elbow.add(wrist);

      // Pickup & Drop pedestals + machined brass workpiece resting on padA
      const padA = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.48, 0.14, 24), mats.matteSteel);
      padA.position.set(1.55, 0.07, 0.45);
      const padAWorkpiece = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.16, 18), mats.goldenMetal);
      padAWorkpiece.position.set(1.55, 0.22, 0.45);
      const padB = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.48, 0.14, 24), mats.matteSteel);
      padB.position.set(-0.2, 0.07, 1.55);

      robot.add(waist, pedestal, baseRing, padA, padAWorkpiece, padB);
      root.add(robot);
      interactables.push(shoulderHub, elbowHub, wristHub);

      labelAnchors.push(
        { id: 'r_shoulder', object: shoulderHub, offset: new THREE.Vector3(0, 0.3, 0), title: 'Khớp vai', description: 'Chịu tải chính nâng toàn bộ cánh tay' },
        { id: 'r_elbow', object: elbowHub, offset: new THREE.Vector3(0, 0.3, 0), title: 'Khớp khuỷu', description: 'Mở rộng tầm với theo phương thẳng đứng' },
        { id: 'r_wrist', object: wristHub, offset: new THREE.Vector3(0, 0.35, 0), title: 'Cổ tay & Tay kẹp', description: 'Xoay linh hoạt 6 bậc tự do để gắp chi tiết' },
      );

      let robotTime = 0;
      return {
        root,
        interactables,
        labelAnchors,
        cameraPos: [1.65, 1.7, 5.8],
        cameraTarget: [-0.05, 0.25, 0.1],
        autoOrbit: false,
        orbitSpeed: 0,
        darkAtmosphere: true,
        onObjectClick: (clicked) => {
          if (clicked === shoulderHub) return { title: 'Khớp vai robot', description: 'Động cơ servo mô-men lớn nâng cả cụm tay máy.' };
          if (clicked === elbowHub) return { title: 'Khớp khuỷu robot', description: 'Định vị chính xác tầm vươn tới bàn gá.' };
          return { title: 'Tay kẹp song song', description: 'Đóng mở nhanh và chính xác ±0,1 mm.' };
        },
        update: (dt, _elapsed, state) => {
          robotTime += Math.min(dt, 0.05) * state.robotSpeed;
          const cycle = (robotTime % 6) / 6; // 6-second pick-and-place cycle
          const swing = Math.sin(cycle * Math.PI * 2);
          waist.rotation.y = swing * 0.72;
          shoulder.rotation.z = -0.45 - Math.abs(Math.cos(cycle * Math.PI * 2)) * 0.38;
          elbow.rotation.z = -0.85 + Math.cos(cycle * Math.PI * 2) * 0.35;
          wrist.rotation.z = -0.35;
          const gripClose = Math.sin(cycle * Math.PI * 2) > -0.3 ? 0.095 : 0.16;
          fingerL.position.x = -gripClose;
          fingerR.position.x = gripClose;
          payloadInHand.visible = gripClose < 0.12;
        },
        dispose: () => disposeObjectTree(root, shared),
      };
    }

    // ══════════════════════════════════════════════════════════════
    // SLIDE 17: Mechatronics (Gear Top + PLC Circuit Bottom + Stream)
    // ══════════════════════════════════════════════════════════════
    case 'mechatronics': {
      const topGear = createCompositeSpurGear(mats, {
        outerRadius: 0.88,
        innerRadius: 0.24,
        teeth: 18,
        thickness: 0.24,
        spokes: 5,
        rimMaterial: mats.goldenMetal,
      });
      topGear.position.set(1.35, 0.92, 0);
      topGear.rotation.x = 0.25;

      // PLC Board Bottom
      const plcGroup = new THREE.Group();
      plcGroup.position.set(1.35, -0.88, 0);
      plcGroup.rotation.x = -0.35;
      const pcb = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.1, 1.3), makeSoftPolymer(0x2d6a56, 0.55));
      const cpu = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.14, 0.55), mats.darkIron);
      cpu.position.y = 0.08;
      const leds: THREE.Mesh[] = [];
      for (let i = 0; i < 6; i++) {
        const led = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), mats.glowingMint);
        led.position.set(-0.7 + i * 0.28, 0.09, 0.44);
        leds.push(led);
        plcGroup.add(led);
      }
      plcGroup.add(pcb, cpu);

      // Connecting glowing energy conduit + traveling pulses (InstancedMesh)
      const pulseCount = 24;
      const pulseGeo = new THREE.SphereGeometry(0.045, 8, 8);
      const pulses = new THREE.InstancedMesh(pulseGeo, mats.glowingMint, pulseCount);
      pulses.frustumCulled = false;

      root.add(topGear, plcGroup, pulses);

      return {
        root,
        interactables,
        labelAnchors,
        cameraPos: [0.8, 0.35, 5.1],
        cameraTarget: [0.55, 0, 0],
        autoOrbit: false,
        orbitSpeed: 0,
        darkAtmosphere: false,
        update: (_dt, elapsed, state) => {
          const boost = state.pointerNDC.y > 0 ? 1.8 : 1.0;
          topGear.rotation.z = elapsed * 0.7 * boost;
          plcGroup.rotation.y = Math.sin(elapsed * 0.5) * 0.15;

          leds.forEach((l, i) => {
            const on = Math.sin(elapsed * 5 + i * 0.9) > 0;
            l.scale.setScalar(on ? 1.2 : 0.65);
          });

          for (let i = 0; i < pulseCount; i++) {
            const t = (elapsed * 0.55 + i / pulseCount) % 1;
            _obj.position.set(
              1.35 + Math.sin(t * Math.PI * 2) * 0.24,
              -0.75 + t * 1.55,
              Math.cos(t * Math.PI * 2) * 0.24,
            );
            _obj.scale.setScalar(0.7 + Math.sin(t * Math.PI) * 0.6);
            _obj.updateMatrix();
            pulses.setMatrixAt(i, _obj.matrix);
          }
          pulses.instanceMatrix.needsUpdate = true;
        },
        dispose: () => disposeObjectTree(root, shared),
      };
    }

    // ══════════════════════════════════════════════════════════════
    // SLIDE 18: 3 Comparison Objects Floating Above Cards
    // ══════════════════════════════════════════════════════════════
    case 'comparison-objects': {
      const obj1 = createCompositeSpurGear(mats, {
        outerRadius: 0.65,
        teeth: 16,
        thickness: 0.2,
        rimMaterial: makeSoftPolymer(0xe87b5a, 0.42),
      });
      obj1.position.set(-2.35, 1.05, 0);

      const obj2 = new THREE.Group();
      const miniScaleMat = new THREE.MeshStandardMaterial({
        map: mats.caliperScaleTex,
        metalness: 0.35,
        roughness: 0.38,
      });
      const beam = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.18, 0.08), [
        makeSoftPolymer(0x6aadcf, 0.38),
        makeSoftPolymer(0x6aadcf, 0.38),
        makeSoftPolymer(0x6aadcf, 0.38),
        makeSoftPolymer(0x6aadcf, 0.38),
        miniScaleMat,
        makeSoftPolymer(0x6aadcf, 0.38),
      ]);
      const jawA = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.56, 0.08), mats.chromeAccent);
      jawA.position.set(-0.56, -0.22, 0);
      const jawB = jawA.clone();
      jawB.position.set(0.14, -0.22, 0);
      const carriage = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.11), mats.matteSteel);
      carriage.position.set(0.22, 0, 0);
      const thumb = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.13, 14), mats.goldenMetal);
      thumb.rotation.x = Math.PI / 2;
      thumb.position.set(0.32, -0.14, 0.04);
      obj2.add(beam, jawA, jawB, carriage, thumb);
      obj2.position.set(0, 1.05, 0);

      const obj3 = new THREE.Group();
      const wristCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 0.12, 18), mats.goldenMetal);
      wristCollar.position.y = -0.2;
      const palm = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.24, 0.34, 18), makeSoftPolymer(0xa78ec4, 0.38));
      const f1 = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.42, 0.12), mats.goldenMetal);
      f1.position.set(-0.2, 0.34, 0);
      f1.rotation.z = -0.12;
      const f2 = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.42, 0.12), mats.goldenMetal);
      f2.position.set(0.2, 0.34, 0);
      f2.rotation.z = 0.12;
      const gripperTip1 = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.14), mats.chromeAccent);
      gripperTip1.position.set(-0.15, 0.56, 0);
      const gripperTip2 = gripperTip1.clone();
      gripperTip2.position.x = 0.15;
      obj3.add(wristCollar, palm, f1, f2, gripperTip1, gripperTip2);
      obj3.position.set(2.35, 1.05, 0);

      root.add(obj1, obj2, obj3);
      return {
        root,
        interactables,
        labelAnchors,
        cameraPos: [0, 0.55, 5.9],
        cameraTarget: [0, 0.1, 0],
        autoOrbit: false,
        orbitSpeed: 0,
        darkAtmosphere: false,
        update: (_dt, elapsed) => {
          obj1.rotation.z = elapsed * 0.65;
          obj1.position.y = 1.15 + Math.sin(elapsed * 1.4) * 0.08;
          obj2.rotation.y = Math.sin(elapsed * 0.8) * 0.35;
          obj2.position.y = 1.15 + Math.sin(elapsed * 1.4 + 2) * 0.08;
          obj3.rotation.y = elapsed * 0.55;
          obj3.position.y = 1.15 + Math.sin(elapsed * 1.4 + 4) * 0.08;
        },
        dispose: () => disposeObjectTree(root, shared),
      };
    }

    // ══════════════════════════════════════════════════════════════
    // SLIDE 19: Workplaces Factory Panorama (InstancedMesh)
    // ══════════════════════════════════════════════════════════════
    case 'factory-particles': {
      // A compact station grid in the middle, with real equipment around the
      // perimeter. Keeping the two apart is what stops the equipment from
      // intersecting the station blocks.
      const bayCount = 18;
      const stationGeo = new THREE.BoxGeometry(0.7, 0.6, 0.7);
      const stations = new THREE.InstancedMesh(stationGeo, mats.warmMetal, bayCount);
      const color = new THREE.Color();
      const palette = [0xd4c8b8, 0xc9a96e, 0xe87b5a, 0x6aadcf, 0x7db58e];

      let idx = 0;
      for (let row = -1; row <= 1; row++) {
        for (let col = -2; col <= 2; col++) {
          if (idx >= bayCount) break;
          _obj.position.set(col * 1.15, -0.75, row * 1.15);
          _obj.scale.set(0.85 + ((idx % 3) * 0.12), 0.7 + ((idx % 4) * 0.2), 0.85);
          _obj.updateMatrix();
          stations.setMatrixAt(idx, _obj.matrix);
          color.setHex(palette[idx % palette.length]);
          stations.setColorAt(idx, color);
          idx++;
        }
      }
      stations.computeBoundingSphere();

      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(18, 16),
        new THREE.MeshStandardMaterial({ map: mats.blueprintGridTex, roughness: 0.85, metalness: 0.05 }),
      );
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -1.1;

      // Overhead gantry crane bridge beams + safety aisle lines
      const gantry = new THREE.Group();
      [-2.35, 2.35].forEach((gx) => {
        const railBeam = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 8.6), mats.goldenMetal);
        railBeam.position.set(gx, 0.95, 0);
        gantry.add(railBeam);
        [-3.6, 0, 3.6].forEach((gz) => {
          const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.05, 0.14), mats.darkIron);
          pillar.position.set(gx, -0.05, gz);
          gantry.add(pillar);
        });
      });
      const crossBridge = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.18, 0.24), mats.goldenMetal);
      crossBridge.position.set(0, 1.08, -0.6);
      const hoistCarriage = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.26, 0.36), makeSoftPolymer(0xe87b5a, 0.4));
      hoistCarriage.position.set(0.6, 0.92, -0.6);
      gantry.add(crossBridge, hoistCarriage);

      [-0.78, 0.78].forEach((az) => {
        const aisleLine = new THREE.Mesh(new THREE.BoxGeometry(10.5, 0.015, 0.06), mats.glowingAmber);
        aisleLine.position.set(0.5, -1.08, az);
        gantry.add(aisleLine);
      });

      root.add(stations, floor, gantry);
      return {
        root,
        interactables,
        labelAnchors,
        cameraPos: [0, 2.2, 7.2],
        cameraTarget: [0, -0.35, -1.0],
        autoOrbit: true,
        orbitSpeed: 0.06,
        darkAtmosphere: false,
        update: (_dt, elapsed) => {
          root.rotation.y = Math.sin(elapsed * 0.2) * 0.08;
        },
        dispose: () => disposeObjectTree(root, shared),
      };
    }

    // ══════════════════════════════════════════════════════════════
    // SLIDE 20: 6-Tool Showcase Orbit
    // ══════════════════════════════════════════════════════════════
    case 'tools-grid': {
      const toolRing = new THREE.Group();
      const items: THREE.Object3D[] = [];

      // 1. CAD wireframe cube
      const t1 = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.65, 0.65), mats.blueprintWire);
      // 2. CNC endmill
      const t2 = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.14, 0.9, 12), mats.goldenMetal);
      // 3. Caliper miniature
      const t3 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.18, 0.1), mats.chromeAccent);
      // 4. Robot gripper
      const t4 = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), makeSoftPolymer(0xa78ec4));
      // 5. Wrench
      const t5 = createWrenchGroup(mats);
      t5.scale.setScalar(0.62);
      // 6. Hero Gear callback
      const t6 = createCompositeSpurGear(mats, { outerRadius: 0.55, teeth: 14, thickness: 0.18, spokes: 4 });

      items.push(t1, t2, t3, t4, t5, t6);
      items.forEach((item, i) => {
        const ang = (i / 6) * Math.PI * 2;
        item.position.set(Math.cos(ang) * 2.25, 0.65, Math.sin(ang) * 1.45);
        toolRing.add(item);
      });

      const shadow = createContactShadowDisc(mats.contactShadowMat, 3.6, -1.0);
      root.add(toolRing, shadow);
      return {
        root,
        interactables,
        labelAnchors,
        cameraPos: [0, 1.55, 5.8],
        cameraTarget: [0, 0.2, 0],
        autoOrbit: false,
        orbitSpeed: 0,
        darkAtmosphere: false,
        update: (_dt, elapsed) => {
          toolRing.rotation.y = elapsed * 0.22;
          items.forEach((it, i) => {
            it.rotation.y = elapsed * (0.7 + i * 0.1);
            it.position.y = 0.72 + Math.sin(elapsed * 1.6 + i) * 0.08;
          });
        },
        dispose: () => disposeObjectTree(root, shared),
      };
    }

    // ══════════════════════════════════════════════════════════════
    // SLIDE 21: 6 Hexagonal 3D Skill Medallions
    // ══════════════════════════════════════════════════════════════
    case 'hex-skills': {
      const hexColors = [0x7db58e, 0x6aadcf, 0xeab042, 0xe87b5a, 0xf2994a, 0xa78ec4];
      const hexShape = new THREE.Shape();
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
        const x = Math.cos(a) * 0.62;
        const y = Math.sin(a) * 0.62;
        if (i === 0) hexShape.moveTo(x, y);
        else hexShape.lineTo(x, y);
      }
      hexShape.closePath();

      const hexGeo = new THREE.ExtrudeGeometry(hexShape, {
        depth: 0.2,
        bevelEnabled: true,
        bevelThickness: 0.035,
        bevelSize: 0.03,
        bevelSegments: 2,
      });
      hexGeo.center();
      hexGeo.rotateX(Math.PI / 2);

      const coords: [number, number][] = [
        [-1.35, -0.75],
        [0, -0.75],
        [1.35, -0.75],
        [-1.35, 0.65],
        [0, 0.65],
        [1.35, 0.65],
      ];

      const hexes: THREE.Group[] = [];
      coords.forEach(([hx, hz], i) => {
        const g = new THREE.Group();
        const body = new THREE.Mesh(hexGeo, makeSoftPolymer(hexColors[i], 0.38));
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 8, 6), mats.goldenMetal);
        rim.rotation.x = Math.PI / 2;
        rim.position.y = 0.13;
        g.add(body, rim);
        g.position.set(hx, 0.45, hz);
        hexes.push(g);
        root.add(g);
        interactables.push(g);
      });

      const shadow = createContactShadowDisc(mats.contactShadowMat, 3.4, -0.8);
      root.add(shadow);

      return {
        root,
        interactables,
        labelAnchors,
        cameraPos: [0, 3.1, 4.4],
        cameraTarget: [0, 0.25, 0],
        autoOrbit: true,
        orbitSpeed: 0.07,
        darkAtmosphere: false,
        onObjectClick: (clicked) => {
          const idx = hexes.findIndex((h) => h === clicked || h.children.includes(clicked));
          if (idx >= 0) {
            return { title: `Kỹ năng #${idx + 1}`, description: 'Huy hiệu năng lực ngành cơ khí.', selectedIndex: idx };
          }
          return null;
        },
        update: (dt, elapsed, state) => {
          hexes.forEach((h, i) => {
            const isSel = state.selectedObjectIndex === i;
            const targetY = 0.45 + Math.sin(elapsed * 1.5 + i * 0.9) * 0.08 + (isSel ? 0.35 : 0);
            h.position.y = dampValue(h.position.y, targetY, 6, dt);
            h.rotation.y = dampValue(h.rotation.y, isSel ? 0.45 : 0, 6, dt);
          });
        },
        dispose: () => disposeObjectTree(root, shared),
      };
    }

    // ══════════════════════════════════════════════════════════════
    // SLIDE 22: Future Cobot + Glowing Smart Factory Skyline (Dark)
    // ══════════════════════════════════════════════════════════════
    case 'future-scene': {
      // Glowing Smart Factory Skyline via InstancedMesh
      const blockCount = 28;
      const bGeo = new THREE.BoxGeometry(0.55, 1.0, 0.55);
      const bMat = new THREE.MeshStandardMaterial({
        color: 0x5c4f44,
        emissive: 0xeab042,
        emissiveIntensity: 0.22,
        roughness: 0.45,
        metalness: 0.5,
      });
      const skyline = new THREE.InstancedMesh(bGeo, bMat, blockCount);
      for (let i = 0; i < blockCount; i++) {
        const angle = (i / blockCount) * Math.PI * 2;
        const rad = 1.8 + (i % 3) * 0.65;
        const h = 0.6 + (i % 5) * 0.35;
        _obj.position.set(1.1 + Math.cos(angle) * rad, -1.25 + h * 0.5, Math.sin(angle) * rad);
        _obj.scale.set(0.8, h, 0.8);
        _obj.updateMatrix();
        skyline.setMatrixAt(i, _obj.matrix);
      }
      skyline.computeBoundingSphere();

      // Collaborative Robot (Cobot) silhouette
      const cobot = new THREE.Group();
      cobot.position.set(1.1, -0.85, 0);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.52, 0.26, 24), mats.warmMetal);
      const link1 = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.9, 6, 12), makeSoftPolymer(0xa78ec4, 0.35));
      link1.position.y = 0.68;
      const link2 = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.78, 6, 12), mats.goldenMetal);
      link2.position.set(0.32, 1.32, 0);
      link2.rotation.z = -0.65;
      const halo = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.025, 10, 24), mats.glowingMint);
      halo.position.set(0.68, 1.62, 0);
      cobot.add(base, link1, link2, halo);

      root.add(skyline, cobot);
      return {
        root,
        interactables,
        labelAnchors,
        cameraPos: [1.6, 1.35, 5.6],
        cameraTarget: [0.45, -0.1, 0],
        autoOrbit: true,
        orbitSpeed: 0.06,
        darkAtmosphere: true,
        update: (_dt, elapsed, state) => {
          cobot.rotation.y = elapsed * 0.35 + state.pointerNDC.x * 0.35;
          halo.rotation.x = elapsed * 1.4;
        },
        dispose: () => disposeObjectTree(root, shared),
      };
    }

    // ══════════════════════════════════════════════════════════════
    // SLIDE 23: Finale Swirl + Hero Golden Gear Callback (Dark)
    // ══════════════════════════════════════════════════════════════
    case 'finale': {
      const heroGear = createCompositeSpurGear(mats, {
        outerRadius: 1.35,
        innerRadius: 0.36,
        teeth: 22,
        thickness: 0.3,
        spokes: 6,
        rimMaterial: mats.goldenMetal,
      });
      heroGear.position.set(1.45, 0.55, 0);

      // Orbiting miniature golden aurora particles (InstancedMesh)
      const count = 64;
      const orbGeo = new THREE.OctahedronGeometry(0.055, 0);
      const aurora = new THREE.InstancedMesh(orbGeo, mats.glowingAmber, count);
      aurora.frustumCulled = false;

      root.add(heroGear, aurora);
      return {
        root,
        interactables,
        labelAnchors,
        cameraPos: [0.6, 0.45, 5.2],
        cameraTarget: [0.45, 0.1, 0],
        autoOrbit: true,
        orbitSpeed: 0.05,
        darkAtmosphere: true,
        update: (_dt, elapsed) => {
          heroGear.rotation.z = elapsed * 0.22;
          heroGear.rotation.y = Math.sin(elapsed * 0.4) * 0.25;
          for (let i = 0; i < count; i++) {
            const ang = elapsed * 0.38 + (i / count) * Math.PI * 2;
            const r = 1.9 + Math.sin(i * 1.7 + elapsed) * 0.35;
            _obj.position.set(
              1.45 + Math.cos(ang) * r,
              0.55 + Math.sin(ang * 2 + i) * 0.45,
              Math.sin(ang) * r * 0.6,
            );
            _obj.rotation.set(elapsed + i, elapsed * 0.7, 0);
            _obj.scale.setScalar(0.65 + Math.sin(elapsed * 2 + i) * 0.35);
            _obj.updateMatrix();
            aurora.setMatrixAt(i, _obj.matrix);
          }
          aurora.instanceMatrix.needsUpdate = true;
        },
        dispose: () => disposeObjectTree(root, shared),
      };
    }

    default:
      return null;
  }
}
