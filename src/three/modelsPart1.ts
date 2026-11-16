import * as THREE from 'three';
import { MaterialBank, createContactShadowDisc, makeSoftPolymer } from './materials';
import { createCompositeSpurGear, disposeObjectTree } from './gearFactory';
import { mountModelWhenReady, fitModel, fitModelOnGround, ModelId } from './modelLoader';
import { SceneControlState, SceneRuntime, SceneLabelAnchor } from './types';
import { ASSEMBLY_CUBE_PARTS } from '../data/slides';
import { computeGearMeshingAngle, dampValue } from '../utils/presentationLogic';

const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _q1 = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _e1 = new THREE.Euler();
const _m1 = new THREE.Matrix4();
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

function attachWobbleBehavior(group: THREE.Group): { trigger: () => void; apply: (dt: number) => void } {
  let wobbleVel = 0;
  let wobbleTilt = 0;
  return {
    trigger: () => {
      wobbleVel = 3.2;
    },
    apply: (dt: number) => {
      // Damped spring oscillator
      const stiffness = 65;
      const damping = 7.5;
      const force = -stiffness * wobbleTilt - damping * wobbleVel;
      wobbleVel += force * Math.min(dt, 0.05);
      wobbleTilt += wobbleVel * Math.min(dt, 0.05);
      group.rotation.x = wobbleTilt;
    },
  };
}

export function buildScenePart1(sceneId: string, mats: MaterialBank): SceneRuntime | null {
  const shared = getSharedMaterialSet(mats);
  const root = new THREE.Group();
  const interactables: THREE.Object3D[] = [];
  const labelAnchors: SceneLabelAnchor[] = [];

  switch (sceneId) {
    // ══════════════════════════════════════════════════════════════
    // SLIDE 01: Hero Spur Gear
    // ══════════════════════════════════════════════════════════════
    case 'gear-hero': {
      const heroCluster = new THREE.Group();
      heroCluster.position.set(1.62, 0.08, 0);
      heroCluster.scale.setScalar(0.92);

      const heroGear = createCompositeSpurGear(mats, {
        outerRadius: 1.55,
        innerRadius: 0.42,
        teeth: 22,
        toothDepth: 0.18,
        thickness: 0.34,
        spokes: 6,
      });
      heroGear.name = 'hero-gear';

      // Secondary accent inner pinion
      const innerPinion = createCompositeSpurGear(mats, {
        outerRadius: 0.68,
        innerRadius: 0.22,
        teeth: 12,
        toothDepth: 0.1,
        thickness: 0.44,
        spokes: 4,
        rimMaterial: mats.copperMetal,
      });
      innerPinion.position.set(0, 0, 0);
      heroGear.add(innerPinion);

      // Machined steel drive shaft + brass end-cap + copper keyway
      const driveShaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 1.15, 24),
        mats.chromeAccent,
      );
      driveShaft.rotation.x = Math.PI / 2;
      driveShaft.castShadow = true;

      const shaftCap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.24, 0.1, 24),
        mats.goldenMetal,
      );
      shaftCap.rotation.x = Math.PI / 2;
      shaftCap.position.z = 0.56;

      const shaftKey = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.08, 0.7),
        mats.copperMetal,
      );
      shaftKey.position.set(0, 0.18, 0.18);

      // Outer brushed steel mounting ring collar
      const outerCollar = new THREE.Mesh(
        new THREE.TorusGeometry(1.82, 0.04, 12, 48),
        mats.matteSteel,
      );
      outerCollar.position.z = -0.14;

      // Meshing copper satellite pinion (upper-right so title on left stays completely clear)
      const satPinion = createCompositeSpurGear(mats, {
        outerRadius: 0.62,
        innerRadius: 0.18,
        teeth: 11,
        toothDepth: 0.11,
        thickness: 0.28,
        spokes: 4,
        rimMaterial: mats.copperMetal,
      });
      const satAngle = Math.PI * 0.22;
      const satDist = 2.18;
      satPinion.position.set(Math.cos(satAngle) * satDist, Math.sin(satAngle) * satDist, 0);

      const satPin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.11, 0.62, 18),
        mats.chromeAccent,
      );
      satPin.rotation.x = Math.PI / 2;
      satPin.position.copy(satPinion.position);

      heroCluster.add(heroGear, driveShaft, shaftCap, shaftKey, outerCollar, satPinion, satPin);

      const shadow = createContactShadowDisc(mats.contactShadowMat, 2.5, -1.6);
      shadow.position.x = 1.62;
      root.add(heroCluster, shadow);
      interactables.push(heroGear, satPinion);

      const wobble = attachWobbleBehavior(heroCluster);
      return {
        root,
        interactables,
        labelAnchors,
        cameraPos: [3.2, 1.35, 5.75],
        cameraTarget: [0.45, 0.05, 0],
        autoOrbit: true,
        orbitSpeed: 0.12,
        darkAtmosphere: false,
        triggerWobble: () => wobble.trigger(),
        onObjectClick: () => {
          wobble.trigger();
          return {
            title: 'Bánh răng trụ răng thẳng',
            description: 'Biểu tượng cốt lõi của truyền động cơ khí chính xác.',
          };
        },
        update: (dt, elapsed) => {
          const baseRot = elapsed * 0.32;
          heroGear.rotation.z = baseRot;
          innerPinion.rotation.z = -elapsed * 0.64;
          satPinion.rotation.z = computeGearMeshingAngle(baseRot, 22, 11) + 0.18;
          wobble.apply(dt);
        },
        dispose: () => disposeObjectTree(root, shared),
      };
    }

    // ══════════════════════════════════════════════════════════════
    // SLIDE 02: Bicycle Sprocket + Crank + Instanced Chain
    // ══════════════════════════════════════════════════════════════
    case 'bicycle-gear': {
      const assembly = new THREE.Group();
      assembly.position.set(1.65, -0.35, 0);

      // Procedural drivetrain: shown immediately, replaced by the real GLB
      // bicycle the moment it finishes loading.
      const placeholder = new THREE.Group();

      const chainring = createCompositeSpurGear(mats, {
        outerRadius: 1.05,
        innerRadius: 0.28,
        teeth: 24,
        toothDepth: 0.12,
        thickness: 0.12,
        spokes: 5,
        rimMaterial: mats.copperMetal,
      });

      const crankArmGeo = new THREE.BoxGeometry(0.18, 1.15, 0.1);
      const crankArm = new THREE.Mesh(crankArmGeo, mats.warmMetal);
      crankArm.position.set(0, -0.52, 0.14);
      crankArm.castShadow = true;

      const pedalBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.46, 0.14, 0.28),
        makeSoftPolymer(0x3d3028, 0.78),
      );
      pedalBody.position.set(0.22, -1.04, 0.24);
      pedalBody.castShadow = true;

      const rearCog = createCompositeSpurGear(mats, {
        outerRadius: 0.48,
        innerRadius: 0.14,
        teeth: 12,
        toothDepth: 0.09,
        thickness: 0.1,
        spokes: 3,
        rimMaterial: mats.goldenMetal,
      });
      rearCog.position.set(-2.15, -0.05, 0);

      // Instanced chain links around an oval loop (> 24 items)
      const linkCount = 34;
      const linkGeo = new THREE.BoxGeometry(0.18, 0.09, 0.07);
      const chainInst = new THREE.InstancedMesh(linkGeo, mats.darkIron, linkCount);
      chainInst.castShadow = true;
      chainInst.frustumCulled = false;

      placeholder.add(chainring, crankArm, pedalBody, rearCog, chainInst);
      assembly.add(placeholder);
      const shadow = createContactShadowDisc(mats.contactShadowMat, 2.2, -1.35);
      shadow.position.x = 0.7;
      root.add(assembly, shadow);
      interactables.push(assembly);

      let px = 0;
      let py = 0;
      return {
        root,
        interactables,
        labelAnchors,
        cameraPos: [0.5, 0.65, 5.3],
        cameraTarget: [0.35, -0.15, 0],
        autoOrbit: false,
        orbitSpeed: 0,
        darkAtmosphere: false,
        update: (dt, elapsed, state) => {
          px = dampValue(px, state.pointerNDC.x * 0.35, 5, dt);
          py = dampValue(py, state.pointerNDC.y * 0.25, 5, dt);
          assembly.rotation.y = -0.22 + px;
          assembly.rotation.x = 0.12 - py;

          const rot = elapsed * 0.55;
          chainring.rotation.z = rot;
          crankArm.position.set(Math.sin(-rot) * 0.52, -Math.cos(-rot) * 0.52, 0.14);
          crankArm.rotation.z = rot;
          pedalBody.position.set(Math.sin(-rot) * 1.04 + 0.18, -Math.cos(-rot) * 1.04, 0.24);
          rearCog.rotation.z = rot * 2.0;

          for (let i = 0; i < linkCount; i++) {
            const u = ((i / linkCount) + elapsed * 0.09) % 1;
            const angle = u * Math.PI * 2;
            const lx = -1.07 + Math.cos(angle) * 1.55;
            const ly = Math.sin(angle) * (Math.cos(angle) > 0 ? 0.96 : 0.62);
            _obj.position.set(lx, ly, 0);
            _obj.rotation.set(0, 0, angle + Math.PI / 2);
            _obj.updateMatrix();
            chainInst.setMatrixAt(i, _obj.matrix);
          }
          chainInst.instanceMatrix.needsUpdate = true;
        },
        dispose: () => disposeObjectTree(root, shared),
      };
    }

    // ══════════════════════════════════════════════════════════════
    // SLIDE 03: 3-Gear Meshing Assembly
    // ══════════════════════════════════════════════════════════════
    case 'gear-assembly': {
      const assembly = new THREE.Group();
      assembly.position.set(1.52, -0.08, 0);
      assembly.scale.setScalar(0.88);

      const gear1 = createCompositeSpurGear(mats, {
        outerRadius: 1.05,
        teeth: 20,
        thickness: 0.28,
        rimMaterial: mats.goldenMetal,
      });
      gear1.name = 'gear_driver';

      const gear2 = createCompositeSpurGear(mats, {
        outerRadius: 0.74,
        innerRadius: 0.24,
        teeth: 14,
        thickness: 0.28,
        spokes: 4,
        rimMaterial: mats.warmMetal,
      });
      gear2.position.set(1.66, 0, 0);
      gear2.name = 'gear_driven';

      const gear3 = createCompositeSpurGear(mats, {
        outerRadius: 0.56,
        innerRadius: 0.18,
        teeth: 10,
        thickness: 0.28,
        spokes: 3,
        rimMaterial: mats.copperMetal,
      });
      gear3.position.set(-1.12, 1.02, 0);
      gear3.name = 'gear_idler';

      // Detailed gearbox housing plate + corner flanges + bronze bushings + steel shafts
      const housingPlate = new THREE.Group();
      const backPlate = new THREE.Mesh(
        new THREE.BoxGeometry(3.85, 2.55, 0.14),
        mats.darkIron,
      );
      backPlate.position.set(0.25, 0.35, -0.28);
      backPlate.receiveShadow = true;
      housingPlate.add(backPlate);

      const plateTrim = new THREE.Mesh(
        new THREE.BoxGeometry(3.65, 2.35, 0.04),
        mats.matteSteel,
      );
      plateTrim.position.set(0.25, 0.35, -0.2);
      housingPlate.add(plateTrim);

      const cornerOffsets: [number, number][] = [
        [-1.55, -0.8],
        [2.05, -0.8],
        [-1.55, 1.5],
        [2.05, 1.5],
      ];
      cornerOffsets.forEach(([cx, cy]) => {
        const flangeLug = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.2, 0.18, 16),
          mats.warmMetal,
        );
        flangeLug.rotation.x = Math.PI / 2;
        flangeLug.position.set(cx, cy, -0.24);
        const cornerBolt = new THREE.Mesh(
          new THREE.CylinderGeometry(0.08, 0.08, 0.24, 6),
          mats.goldenMetal,
        );
        cornerBolt.rotation.x = Math.PI / 2;
        cornerBolt.position.set(cx, cy, -0.2);
        housingPlate.add(flangeLug, cornerBolt);
      });

      const shaftCoords: [number, number, number][] = [
        [0, 0, 0.2],
        [1.66, 0, 0.16],
        [-1.12, 1.02, 0.12],
      ];
      shaftCoords.forEach(([sx, sy, sr]) => {
        const bushing = new THREE.Mesh(
          new THREE.CylinderGeometry(sr + 0.06, sr + 0.06, 0.14, 20),
          mats.copperMetal,
        );
        bushing.rotation.x = Math.PI / 2;
        bushing.position.set(sx, sy, -0.15);

        const shaft = new THREE.Mesh(
          new THREE.CylinderGeometry(sr * 0.62, sr * 0.62, 0.62, 18),
          mats.chromeAccent,
        );
        shaft.rotation.x = Math.PI / 2;
        shaft.position.set(sx, sy, 0.04);

        const endCap = new THREE.Mesh(
          new THREE.CylinderGeometry(sr * 0.42, sr * 0.56, 0.06, 18),
          mats.goldenMetal,
        );
        endCap.rotation.x = Math.PI / 2;
        endCap.position.set(sx, sy, 0.36);

        housingPlate.add(bushing, shaft, endCap);
      });

      assembly.add(housingPlate, gear1, gear2, gear3);
      const shadow = createContactShadowDisc(mats.contactShadowMat, 2.7, -1.55);
      shadow.position.x = 1.25;
      root.add(assembly, shadow);
      interactables.push(gear1, gear2, gear3);

      labelAnchors.push(
        {
          id: 'g1',
          object: gear1,
          offset: new THREE.Vector3(0, 1.25, 0),
          title: 'Bánh răng dẫn (20 răng)',
          description: 'Nhận lực từ động cơ và truyền mô-men xoắn',
        },
        {
          id: 'g2',
          object: gear2,
          offset: new THREE.Vector3(0, 0.95, 0),
          title: 'Bánh răng bị dẫn (14 răng)',
          description: 'Quay ngược chiều và tăng tốc theo tỉ số truyền',
        },
        {
          id: 'g3',
          object: gear3,
          offset: new THREE.Vector3(0, 0.8, 0),
          title: 'Bánh răng trung gian (10 răng)',
          description: 'Kết nối và đổi hướng chuyển động trong hệ thống',
        },
      );

      const wobble = attachWobbleBehavior(assembly);
      return {
        root,
        interactables,
        labelAnchors,
        cameraPos: [0.3, 0.85, 5.9],
        cameraTarget: [0.25, 0.1, 0],
        autoOrbit: false,
        orbitSpeed: 0,
        darkAtmosphere: false,
        triggerWobble: () => wobble.trigger(),
        onObjectClick: (obj) => {
          wobble.trigger();
          if (obj === gear2 || gear2.children.includes(obj)) {
            return {
              title: 'Bánh răng bị dẫn (14 răng)',
              description: 'Quay nhanh hơn gấp 1,43 lần bánh răng dẫn để thay đổi tốc độ.',
            };
          }
          if (obj === gear3 || gear3.children.includes(obj)) {
            return {
              title: 'Bánh răng trung gian (10 răng)',
              description: 'Kết nối các trục ở xa nhau và giữ đồng bộ chuyển động.',
            };
          }
          return {
            title: 'Bánh răng dẫn (20 răng)',
            description: 'Truyền lực trực tiếp từ động cơ vào hệ thống.',
          };
        },
        update: (dt, elapsed) => {
          const a1 = elapsed * 0.48;
          gear1.rotation.z = a1;
          gear2.rotation.z = computeGearMeshingAngle(a1, 20, 14) + 0.14;
          gear3.rotation.z = computeGearMeshingAngle(a1, 20, 10) + 0.22;
          assembly.rotation.y = Math.sin(elapsed * 0.35) * 0.24 - 0.18;
          wobble.apply(dt);
        },
        dispose: () => disposeObjectTree(root, shared),
      };
    }

    // ══════════════════════════════════════════════════════════════
    // SLIDE 04: 4 Everyday Mechanical Objects Carousel
    // ══════════════════════════════════════════════════════════════
    case 'everyday-objects': {
      // 1. Bike sprocket
      const bikeObj = new THREE.Group();
      const bikeRing = createCompositeSpurGear(mats, {
        outerRadius: 0.72,
        teeth: 18,
        thickness: 0.12,
        rimMaterial: mats.copperMetal,
      });
      const bikeCrank = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.8, 0.08), mats.warmMetal);
      bikeCrank.position.set(0, -0.35, 0.1);
      bikeObj.add(bikeRing, bikeCrank);
      bikeObj.position.set(-2.2, 0.15, 0.35);

      // 2. Electric Fan (base + neck + guard + 4 blades)
      const fanObj = new THREE.Group();
      const fanBase = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.52, 0.1, 24), makeSoftPolymer(0x6aadcf));
      fanBase.position.y = -0.65;
      const fanNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.7, 16), mats.warmMetal);
      fanNeck.position.y = -0.25;
      const fanMotor = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.32, 20), mats.matteSteel);
      fanMotor.rotation.x = Math.PI / 2;
      fanMotor.position.y = 0.12;
      const fanGuard = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.03, 12, 32), mats.chromeAccent);
      fanGuard.position.set(0, 0.12, 0.12);
      const bladeHub = new THREE.Group();
      bladeHub.position.set(0, 0.12, 0.16);
      const bladeGeo = new THREE.BoxGeometry(0.16, 0.52, 0.03);
      for (let b = 0; b < 4; b++) {
        const blade = new THREE.Mesh(bladeGeo, makeSoftPolymer(0x82c9b5));
        const a = (b / 4) * Math.PI * 2;
        blade.position.set(Math.cos(a) * 0.28, Math.sin(a) * 0.28, 0);
        blade.rotation.z = a - Math.PI / 2;
        blade.rotation.y = 0.35;
        bladeHub.add(blade);
      }
      fanObj.add(fanBase, fanNeck, fanMotor, fanGuard, bladeHub);
      fanObj.position.set(-0.72, 0.25, -0.35);

      // 3. Car Gauge Cluster
      const gaugeObj = new THREE.Group();
      const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.7, 0.2, 32), mats.darkIron);
      bezel.rotation.x = Math.PI / 2;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.05, 16, 32), mats.goldenMetal);
      rim.position.z = 0.1;
      const faceMat = new THREE.MeshStandardMaterial({
        map: mats.gaugeDialTex,
        roughness: 0.4,
        metalness: 0.05,
      });
      const face = new THREE.Mesh(new THREE.CircleGeometry(0.6, 32), faceMat);
      face.position.z = 0.11;
      const needle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.44, 0.03), makeSoftPolymer(0xe87b5a, 0.4));
      needle.position.set(0, 0.14, 0.14);
      const needlePivot = new THREE.Group();
      needlePivot.add(needle);
      gaugeObj.add(bezel, rim, face, needlePivot);
      gaugeObj.position.set(0.76, 0.25, 0.35);

      // 4. Kitchen Mixer
      const mixerObj = new THREE.Group();
      const mixerBase = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.14, 0.65), makeSoftPolymer(0xe87b5a));
      mixerBase.position.y = -0.58;
      const mixerCol = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.75, 0.3), makeSoftPolymer(0xe87b5a));
      mixerCol.position.set(-0.32, -0.15, 0);
      const mixerHead = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.26, 0.32), makeSoftPolymer(0xf2994a));
      mixerHead.position.set(-0.04, 0.26, 0);
      const bowlPoints = [
        new THREE.Vector2(0.01, -0.48),
        new THREE.Vector2(0.26, -0.48),
        new THREE.Vector2(0.36, -0.12),
        new THREE.Vector2(0.32, -0.12),
        new THREE.Vector2(0.23, -0.44),
        new THREE.Vector2(0.01, -0.44),
      ];
      const bowl = new THREE.Mesh(new THREE.LatheGeometry(bowlPoints, 24), mats.chromeAccent);
      bowl.position.set(0.16, 0, 0);
      const beater = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.42, 12), mats.warmMetal);
      beater.position.set(0.16, -0.04, 0);
      mixerObj.add(mixerBase, mixerCol, mixerHead, bowl, beater);
      mixerObj.position.set(2.25, 0.2, -0.25);

      const objs = [bikeObj, fanObj, gaugeObj, mixerObj];
      const basePositions = objs.map((o) => o.position.clone());
      const shadow = createContactShadowDisc(mats.contactShadowMat, 3.6, -1.25);
      root.add(...objs, shadow);
      interactables.push(...objs);

      const descriptions = [
        { title: 'Xe đạp', description: 'Giao thông — Xích, líp và phanh truyền lực chân thành chuyển động.' },
        { title: 'Quạt điện', description: 'Gia dụng — Động cơ quay cánh quạt tạo làn gió mát mẻ.' },
        { title: 'Đồng hồ ô tô', description: 'Vận tải — Hàng nghìn chi tiết cơ khí phối hợp nhịp nhàng.' },
        { title: 'Máy xay bếp', description: 'Chế biến — Trục quay và hộp số thu nhỏ gọn gàng.' },
      ];

      return {
        root,
        interactables,
        labelAnchors,
        cameraPos: [0, 0.85, 6.2],
        cameraTarget: [0, 0.05, 0],
        autoOrbit: false,
        orbitSpeed: 0,
        darkAtmosphere: false,
        onObjectClick: (clicked) => {
          const idx = objs.findIndex((o) => o === clicked || o.children.includes(clicked) || clicked.parent === o);
          if (idx >= 0) {
            return { ...descriptions[idx], selectedIndex: idx };
          }
          return null;
        },
        update: (dt, elapsed, state) => {
          bikeRing.rotation.z = elapsed * 0.6;
          bladeHub.rotation.z = elapsed * 3.8;
          needlePivot.rotation.z = Math.sin(elapsed * 1.6) * 0.9 - 0.3;
          beater.rotation.y = elapsed * 4.5;

          objs.forEach((o, i) => {
            const isSel = state.selectedObjectIndex === i;
            const targetScale = state.selectedObjectIndex === -1 ? 1 : isSel ? 1.38 : 0.76;
            const nextScale = dampValue(o.scale.x, targetScale, 7, dt);
            o.scale.setScalar(nextScale);

            const targetY = basePositions[i].y + Math.sin(elapsed * 1.4 + i * 1.4) * 0.08 + (isSel ? 0.32 : 0);
            o.position.y = dampValue(o.position.y, targetY, 6, dt);
            o.rotation.y = Math.sin(elapsed * 0.6 + i) * 0.25;
          });
        },
        dispose: () => disposeObjectTree(root, shared),
      };
    }

    // ══════════════════════════════════════════════════════════════
    // SLIDE 05: 5-Step Production Process Gears
    // ══════════════════════════════════════════════════════════════
    case 'process-gears': {
      const colors = [0xeab042, 0xe87b5a, 0xf2994a, 0x6aadcf, 0x7db58e];
      const gearGroups: THREE.Group[] = [];
      const xPositions = [-3.0, -1.5, 0, 1.5, 3.0];
      const teethList = [18, 16, 20, 14, 18];

      xPositions.forEach((x, i) => {
        const mat = new THREE.MeshStandardMaterial({
          color: colors[i],
          metalness: 0.62,
          roughness: 0.34,
        });
        const g = createCompositeSpurGear(mats, {
          outerRadius: 0.68 + (i % 2) * 0.08,
          innerRadius: 0.2,
          teeth: teethList[i],
          thickness: 0.24,
          spokes: 5,
          rimMaterial: mat,
        });
        g.position.set(x, 0.35, 0);
        g.name = `step_${i}`;
        gearGroups.push(g);
        root.add(g);
        interactables.push(g);
      });

      // Connecting curved process conduit beneath gears
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-3.3, -0.55, 0),
        new THREE.Vector3(-1.5, -0.68, 0),
        new THREE.Vector3(0, -0.55, 0),
        new THREE.Vector3(1.5, -0.68, 0),
        new THREE.Vector3(3.3, -0.55, 0),
      ]);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.055, 10, false), mats.warmMetal);
      const shadow = createContactShadowDisc(mats.contactShadowMat, 4.5, -1.35);
      root.add(tube, shadow);

      const labels = [
        '1. Thiết kế CAD',
        '2. Chế tạo phôi',
        '3. Lắp ráp cụm máy',
        '4. Kiểm tra đo lường',
        '5. Bảo trì định kỳ',
      ];

      return {
        root,
        interactables,
        labelAnchors,
        cameraPos: [0, 0.9, 6.8],
        cameraTarget: [0, 0.15, 0],
        autoOrbit: false,
        orbitSpeed: 0,
        darkAtmosphere: false,
        onObjectClick: (clicked) => {
          const idx = gearGroups.findIndex((g) => g === clicked || g.children.includes(clicked));
          if (idx >= 0) {
            return {
              title: labels[idx],
              description: 'Mỗi bước liên kết chặt chẽ như các bánh răng ăn khớp.',
              selectedIndex: idx,
              focusPos: [xPositions[idx], 0.9, 4.4],
              focusTarget: [xPositions[idx], 0.3, 0],
            };
          }
          return null;
        },
        update: (dt, elapsed, state) => {
          gearGroups.forEach((g, i) => {
            const dir = i % 2 === 0 ? 1 : -1;
            g.rotation.z = elapsed * 0.55 * dir;
            const active = state.selectedObjectIndex === i;
            g.position.y = dampValue(g.position.y, active ? 0.65 : 0.35, 6, dt);
            g.scale.setScalar(dampValue(g.scale.x, active ? 1.18 : 1.0, 6, dt));
          });
        },
        dispose: () => disposeObjectTree(root, shared),
      };
    }

    // ══════════════════════════════════════════════════════════════
    // SLIDE 06: Career Map Radial Cluster
    // ══════════════════════════════════════════════════════════════
    case 'career-map-3d': {
      const centerGear = createCompositeSpurGear(mats, {
        outerRadius: 0.95,
        innerRadius: 0.3,
        teeth: 18,
        thickness: 0.3,
        spokes: 6,
        rimMaterial: mats.goldenMetal,
      });
      centerGear.rotation.x = Math.PI / 6;
      root.add(centerGear);

      const clusterColors = [0x6aadcf, 0xe87b5a, 0xf2994a, 0x7db58e, 0xeab042, 0xa78ec4];
      const targetSlides = [7, 8, 10, 12, 15, 16];
      const clusterNames = [
        'Thiết kế & Kỹ sư',
        'Gia công & Chế tạo',
        'Hàn & Tôn tấm',
        'Lắp ráp & Bảo trì',
        'Kiểm soát chất lượng',
        'Robot & Cơ điện tử',
      ];
      const nodes: THREE.Group[] = [];
      const radius = 2.55;

      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
        const nx = Math.cos(angle) * radius;
        const nz = Math.sin(angle) * radius * 0.72;
        const ny = Math.sin(angle * 2) * 0.25;

        const nodeGroup = new THREE.Group();
        nodeGroup.position.set(nx, ny, nz);
        nodeGroup.userData.baseY = ny;

        const core = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.42, 1),
          new THREE.MeshStandardMaterial({
            color: clusterColors[i],
            metalness: 0.32,
            roughness: 0.38,
          }),
        );
        core.castShadow = true;

        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.035, 10, 28), mats.warmMetal);
        ring.rotation.x = Math.PI / 3;
        nodeGroup.add(core, ring);

        // Connector spoke line
        const lineGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(nx, ny, nz),
        ]);
        const line = new THREE.Line(
          lineGeo,
          new THREE.LineBasicMaterial({ color: clusterColors[i], transparent: true, opacity: 0.55 }),
        );
        root.add(line, nodeGroup);
        nodes.push(nodeGroup);
        interactables.push(nodeGroup);

        labelAnchors.push({
          id: `cluster_${i}`,
          object: nodeGroup,
          offset: new THREE.Vector3(0, 0.72, 0),
          title: clusterNames[i],
          description: 'Bấm để mở trang nghề nghiệp',
        });
      }

      const shadow = createContactShadowDisc(mats.contactShadowMat, 3.8, -1.35);
      root.add(shadow);

      return {
        root,
        interactables,
        labelAnchors,
        cameraPos: [0, 2.35, 7.1],
        cameraTarget: [0, 0, 0],
        autoOrbit: true,
        orbitSpeed: 0.09,
        darkAtmosphere: false,
        onObjectClick: (clicked) => {
          const idx = nodes.findIndex((n) => n === clicked || n.children.includes(clicked));
          if (idx >= 0) {
            return {
              title: clusterNames[idx],
              description: 'Đang mở trang chi tiết nhóm nghề...',
              targetSlide: targetSlides[idx],
            };
          }
          return null;
        },
        update: (dt, elapsed, state) => {
          centerGear.rotation.z = elapsed * 0.35;
          nodes.forEach((n, i) => {
            const bob = Math.sin(elapsed * 1.5 + i * 1.05) * 0.1;
            const isSel = state.selectedObjectIndex === i;
            n.position.y = dampValue(n.position.y, n.userData.baseY + bob + (isSel ? 0.35 : 0), 6, dt);
            n.scale.setScalar(dampValue(n.scale.x, isSel ? 1.24 : 1.0, 6, dt));
            n.children[1].rotation.z = elapsed * (0.6 + i * 0.1);
          });
        },
        dispose: () => disposeObjectTree(root, shared),
      };
    }

    // ══════════════════════════════════════════════════════════════
    // SLIDE 07: Mechanical Engineer CAD Solid <-> Wireframe Gear
    // ══════════════════════════════════════════════════════════════
    case 'cad-wireframe': {
      const cadGroup = new THREE.Group();
      cadGroup.position.set(-1.15, 0.15, 0);

      const solidGear = createCompositeSpurGear(mats, {
        outerRadius: 1.35,
        innerRadius: 0.38,
        teeth: 22,
        thickness: 0.3,
        spokes: 6,
        rimMaterial: mats.warmMetal,
      });

      const wireGear = createCompositeSpurGear(mats, {
        outerRadius: 1.37,
        innerRadius: 0.38,
        teeth: 22,
        thickness: 0.32,
        spokes: 6,
        rimMaterial: mats.blueprintWire,
        hubMaterial: mats.blueprintWire,
        boltMaterial: mats.blueprintWire,
      });

      const gridFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(5.5, 5.5),
        new THREE.MeshBasicMaterial({ map: mats.blueprintGridTex, transparent: true, opacity: 0.85 }),
      );
      gridFloor.rotation.x = -Math.PI / 2;
      gridFloor.position.set(-1.15, -1.45, 0);

      cadGroup.add(solidGear, wireGear);
      root.add(cadGroup, gridFloor);
      interactables.push(cadGroup);

      return {
        root,
        interactables,
        labelAnchors,
        cameraPos: [-0.4, 1.45, 5.4],
        cameraTarget: [-0.25, 0.0, 0],
        autoOrbit: false,
        orbitSpeed: 0,
        darkAtmosphere: false,
        update: (_dt, elapsed, state) => {
          cadGroup.rotation.y = elapsed * 0.28;
          cadGroup.rotation.x = 0.28;
          solidGear.visible = !state.cadWireframe;
          wireGear.visible = true;
          wireGear.scale.setScalar(state.cadWireframe ? 1.02 : 1.005);
        },
        dispose: () => disposeObjectTree(root, shared),
      };
    }

    // ══════════════════════════════════════════════════════════════
    // SLIDE 08: Lathe Machine + Copper Shaving Particles
    // ══════════════════════════════════════════════════════════════
    case 'lathe': {
      const latheGroup = new THREE.Group();
      latheGroup.position.set(0, 0.25, 0);

      const bed = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.36, 1.15), mats.darkIron);
      bed.position.y = -0.78;
      bed.castShadow = true;

      const headstock = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.15, 0.98), makeSoftPolymer(0xe87b5a, 0.55));
      headstock.position.set(-1.7, -0.05, 0);
      headstock.castShadow = true;

      const chuck = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.32, 24), mats.matteSteel);
      chuck.rotation.z = Math.PI / 2;
      chuck.position.set(-1.02, 0.15, 0);

      // Turned stepped brass shaft (LatheGeometry)
      const shaftPts = [
        new THREE.Vector2(0, -1.1),
        new THREE.Vector2(0.28, -1.1),
        new THREE.Vector2(0.28, -0.45),
        new THREE.Vector2(0.2, -0.45),
        new THREE.Vector2(0.2, 0.25),
        new THREE.Vector2(0.14, 0.25),
        new THREE.Vector2(0.14, 1.05),
        new THREE.Vector2(0, 1.05),
      ];
      const workpiece = new THREE.Mesh(new THREE.LatheGeometry(shaftPts, 28), mats.goldenMetal);
      workpiece.rotation.z = -Math.PI / 2;
      workpiece.position.set(0.18, 0.15, 0);
      workpiece.castShadow = true;

      const tailstock = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.85, 0.8), mats.matteSteel);
      tailstock.position.set(1.75, -0.18, 0);

      const carriage = new THREE.Group();
      const toolPost = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.36, 0.55), mats.darkIron);
      const cutterBit = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.38, 4), mats.chromeAccent);
      cutterBit.rotation.x = -Math.PI / 2;
      cutterBit.position.set(0, 0.14, -0.32);
      carriage.add(toolPost, cutterBit);
      carriage.position.set(0.1, -0.04, 0.56);

      // Metal shaving particles (InstancedMesh)
      const chipCount = 48;
      const chipGeo = new THREE.BoxGeometry(0.06, 0.025, 0.025);
      const chips = new THREE.InstancedMesh(chipGeo, mats.copperMetal, chipCount);
      chips.frustumCulled = false;
      const chipPhases = Array.from({ length: chipCount }, (_, i) => i / chipCount);

      latheGroup.add(bed, headstock, chuck, workpiece, tailstock, carriage, chips);
      const shadow = createContactShadowDisc(mats.contactShadowMat, 3.6, -1.05);
      root.add(latheGroup, shadow);

      return {
        root,
        interactables,
        labelAnchors,
        cameraPos: [2.2, 1.45, 4.9],
        cameraTarget: [0, 0.05, 0],
        autoOrbit: false,
        orbitSpeed: 0,
        darkAtmosphere: false,
        update: (_dt, elapsed, state) => {
          chuck.rotation.x = elapsed * 4.5;
          workpiece.rotation.y = elapsed * 4.5;
          const feedX = Math.sin(elapsed * 0.7) * 0.65;
          carriage.position.x = feedX;

          const sprayBias = state.pointerNDC.x * 0.55;
          for (let i = 0; i < chipCount; i++) {
            const t = (elapsed * 1.15 + chipPhases[i]) % 1;
            const spread = (i % 7 - 3) * 0.14 + sprayBias;
            _obj.position.set(
              feedX + spread * t,
              0.18 + Math.sin(t * Math.PI) * 0.55 - t * 0.45,
              0.24 + t * 1.1,
            );
            _obj.rotation.set(elapsed * 4 + i, elapsed * 3, i);
            _obj.scale.setScalar(1 - t * 0.5);
            _obj.updateMatrix();
            chips.setMatrixAt(i, _obj.matrix);
          }
          chips.instanceMatrix.needsUpdate = true;
        },
        dispose: () => disposeObjectTree(root, shared),
      };
    }

    // ══════════════════════════════════════════════════════════════
    // SLIDE 09: 3-Axis CNC Milling Machine
    // ══════════════════════════════════════════════════════════════
    case 'cnc-mill': {
      const cnc = new THREE.Group();
      cnc.position.set(1.05, -0.25, 0);

      const base = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.4, 2.25), mats.darkIron);
      base.position.y = -0.9;
      base.castShadow = true;

      const column = new THREE.Group();
      const colBody = new THREE.Mesh(new THREE.BoxGeometry(0.72, 2.35, 0.72), mats.warmMetal);
      column.position.set(0, 0.25, -0.82);
      colBody.castShadow = true;
      column.add(colBody);

      // Linear guide rails on column front face
      [-0.22, 0.22].forEach((rx) => {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 2.05, 0.08), mats.chromeAccent);
        rail.position.set(rx, 0.05, 0.38);
        column.add(rail);
      });

      // Work table with precision T-slot rails
      const workTable = new THREE.Group();
      const tableDeck = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.18, 1.32), mats.matteSteel);
      workTable.add(tableDeck);
      [-0.42, 0, 0.42].forEach((tz) => {
        const tSlot = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.035, 0.06), mats.darkIron);
        tSlot.position.set(0, 0.095, tz);
        workTable.add(tSlot);
      });
      workTable.position.set(0, -0.55, 0.1);

      // Machined aluminum/brass billet with recessed pocket frame
      const billet = new THREE.Group();
      const billetBlock = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.22, 0.82), mats.goldenMetal);
      const wallL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.82), mats.copperMetal);
      wallL.position.set(-0.49, 0.14, 0);
      const wallR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.82), mats.copperMetal);
      wallR.position.set(0.49, 0.14, 0);
      const wallF = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.1, 0.14), mats.copperMetal);
      wallF.position.set(0, 0.14, 0.34);
      const wallB = wallF.clone();
      wallB.position.z = -0.34;
      billet.add(billetBlock, wallL, wallR, wallF, wallB);
      billet.position.set(0, -0.34, 0.1);

      const spindleHead = new THREE.Group();
      const headHousing = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.74, 0.88), makeSoftPolymer(0x6aadcf, 0.42));
      const spindleCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.12, 20), mats.darkIron);
      spindleCollar.position.y = -0.38;
      const quill = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.11, 0.52, 20), mats.chromeAccent);
      quill.position.y = -0.62;
      const endmill = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.45, 16), mats.goldenMetal);
      endmill.position.y = -0.98;

      // Dual articulated coolant nozzles
      [-0.24, 0.24].forEach((nx) => {
        const nozzle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.025, 0.018, 0.38, 10),
          mats.copperMetal,
        );
        nozzle.position.set(nx, -0.58, 0.12);
        nozzle.rotation.z = nx > 0 ? 0.38 : -0.38;
        spindleHead.add(nozzle);
      });

      spindleHead.add(headHousing, spindleCollar, quill, endmill);
      spindleHead.position.set(0, 0.95, 0.1);
      spindleHead.name = 'cnc_spindle';

      // X/Y/Z Axis Arrows
      const axesGroup = new THREE.Group();
      axesGroup.position.set(-1.35, -0.35, 0.85);
      const xAxis = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 0.9, 0xe87b5a, 0.2, 0.12);
      const yAxis = new THREE.ArrowHelper(new THREE.Vector3(0, 0, -1), new THREE.Vector3(), 0.9, 0x7db58e, 0.2, 0.12);
      const zAxis = new THREE.ArrowHelper(new THREE.Vector3(0, 1, 0), new THREE.Vector3(), 0.9, 0x6aadcf, 0.2, 0.12);
      axesGroup.add(xAxis, yAxis, zAxis);

      cnc.add(base, column, workTable, billet, spindleHead, axesGroup);
      const shadow = createContactShadowDisc(mats.contactShadowMat, 2.8, -1.25);
      shadow.position.x = 1.05;
      root.add(cnc, shadow);
      interactables.push(spindleHead);

      labelAnchors.push(
        {
          id: 'axis_x',
          object: axesGroup,
          offset: new THREE.Vector3(0.9, 0.05, 0),
          title: 'Trục X — Ngang',
          description: 'Dịch chuyển bàn máy trái / phải',
          requiresAxes: true,
        },
        {
          id: 'axis_y',
          object: axesGroup,
          offset: new THREE.Vector3(0, 0.05, -0.9),
          title: 'Trục Y — Dọc',
          description: 'Dịch chuyển bàn máy tiến / lùi',
          requiresAxes: true,
        },
        {
          id: 'axis_z',
          object: axesGroup,
          offset: new THREE.Vector3(0, 0.95, 0),
          title: 'Trục Z — Lên / xuống',
          description: 'Độ sâu cắt của trục chính 24.000 rpm',
          requiresAxes: true,
        },
      );

      return {
        root,
        interactables,
        labelAnchors,
        cameraPos: [0.35, 1.55, 5.5],
        cameraTarget: [0.35, -0.1, 0],
        autoOrbit: false,
        orbitSpeed: 0,
        darkAtmosphere: false,
        onObjectClick: () => ({
          title: 'Trục chính CNC (24.000 rpm)',
          description: 'Dao phay hợp kim cứng cắt theo đường G-code lập trình sẵn.',
          focusPos: [1.35, 1.05, 3.6],
          focusTarget: [1.05, 0.1, 0.1],
        }),
        update: (_dt, elapsed, state) => {
          cnc.rotation.y = Math.sin(elapsed * 0.35) * 0.35 - 0.35;
          endmill.rotation.y = elapsed * 18;
          workTable.position.x = Math.cos(elapsed * 1.1) * 0.35;
          billet.position.x = workTable.position.x;
          workTable.position.z = 0.1 + Math.sin(elapsed * 1.1) * 0.22;
          billet.position.z = workTable.position.z;
          spindleHead.position.y = 0.92 + Math.sin(elapsed * 2.2) * 0.14;
          axesGroup.visible = state.cncAxesVisible;
          axesGroup.scale.setScalar(state.cncAxesVisible ? 1.15 : 0.01);
        },
        dispose: () => disposeObjectTree(root, shared),
      };
    }

    // ══════════════════════════════════════════════════════════════
    // SLIDE 10: Welding Torch + 220 Sparks Particle System (Dark)
    // ══════════════════════════════════════════════════════════════
    case 'welding-sparks': {
      // Two beveled steel plates forming a V-groove weld joint
      const plateGroup = new THREE.Group();
      const plateFront = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.22, 1.32), mats.darkIron);
      plateFront.position.set(0.3, -0.85, 0.72);
      plateFront.rotation.x = 0.045;
      plateFront.receiveShadow = true;

      const plateBack = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.22, 1.32), mats.darkIron);
      plateBack.position.set(0.3, -0.85, -0.72);
      plateBack.rotation.x = -0.045;
      plateBack.receiveShadow = true;

      // Copper ground clamp on plate edge
      const clampBody = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.28), mats.copperMetal);
      clampBody.position.set(-2.15, -0.78, 1.15);
      const clampBolt = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.26, 8), mats.goldenMetal);
      clampBolt.position.set(-2.15, -0.58, 1.15);

      plateGroup.add(plateFront, plateBack, clampBody, clampBolt);

      const seam = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.05, 0.12), mats.glowingAmber);
      seam.position.set(0.2, -0.73, 0);

      // Glowing molten weld puddle ellipse tracking arc tip
      const moltenPuddle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.18, 0.03, 20),
        mats.glowingAmber,
      );
      moltenPuddle.scale.set(1.4, 1, 0.85);
      moltenPuddle.position.set(0.23, -0.71, 0);

      // Composite welding torch with ribbed grip, trigger, and brass collar
      const torchGroup = new THREE.Group();
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.125, 1.42, 18), makeSoftPolymer(0x2d2520, 0.7));
      handle.rotation.z = -0.35;
      const gripRibs = new THREE.Group();
      gripRibs.rotation.z = -0.35;
      for (let r = -2; r <= 2; r++) {
        const rib = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.015, 8, 18), mats.copperMetal);
        rib.rotation.x = Math.PI / 2;
        rib.position.y = r * 0.12;
        gripRibs.add(rib);
      }
      const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.06), makeSoftPolymer(0xe87b5a, 0.4));
      trigger.position.set(-0.22, -0.36, 0);
      trigger.rotation.z = -0.35;

      const brassCollar = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.12, 16), mats.goldenMetal);
      brassCollar.position.set(-0.24, -0.55, 0);
      brassCollar.rotation.z = -0.25;

      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.65, 16), mats.copperMetal);
      neck.position.set(-0.34, -0.78, 0);
      neck.rotation.z = -0.18;
      const ceramicCup = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.105, 0.26, 16), makeSoftPolymer(0xd4918d, 0.45));
      ceramicCup.position.set(-0.41, -1.16, 0);
      const arcTip = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), mats.glowingAmber);
      arcTip.position.set(-0.42, -1.32, 0);

      torchGroup.add(handle, gripRibs, trigger, brassCollar, neck, ceramicCup, arcTip);
      torchGroup.position.set(0.65, 0.62, 0);

      // 220 Additive Spark Particles
      const sparkCount = 220;
      const positions = new Float32Array(sparkCount * 3);
      const velocities = new Float32Array(sparkCount * 3);
      const ages = new Float32Array(sparkCount);

      const resetSpark = (i: number, biasX = 0) => {
        positions[i * 3] = torchGroup.position.x - 0.42;
        positions[i * 3 + 1] = -0.7;
        positions[i * 3 + 2] = 0;
        const speed = 1.6 + Math.random() * 2.8;
        const theta = Math.random() * Math.PI * 2;
        velocities[i * 3] = Math.cos(theta) * speed * 0.8 + biasX;
        velocities[i * 3 + 1] = 1.2 + Math.random() * 2.6;
        velocities[i * 3 + 2] = Math.sin(theta) * speed * 0.7;
        ages[i] = Math.random() * 1.1;
      };
      for (let i = 0; i < sparkCount; i++) resetSpark(i);

      const sparkGeo = new THREE.BufferGeometry();
      const posAttr = new THREE.BufferAttribute(positions, 3);
      sparkGeo.setAttribute('position', posAttr);
      const sparkMat = new THREE.PointsMaterial({
        color: 0xffb347,
        size: 0.085,
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const sparks = new THREE.Points(sparkGeo, sparkMat);

      const weldLight = new THREE.PointLight(0xff9c42, 4.2, 6.5, 2);
      weldLight.position.set(0.25, -0.55, 0.2);

      root.add(plateGroup, seam, moltenPuddle, torchGroup, sparks, weldLight);

      return {
        root,
        interactables,
        labelAnchors,
        cameraPos: [0.4, 0.55, 4.4],
        cameraTarget: [0.2, -0.35, 0],
        autoOrbit: false,
        orbitSpeed: 0,
        darkAtmosphere: true,
        update: (dt, elapsed, state) => {
          const sweepX = Math.sin(elapsed * 0.65) * 1.05;
          torchGroup.position.x = 0.65 + sweepX;
          moltenPuddle.position.x = torchGroup.position.x - 0.42;
          weldLight.position.x = torchGroup.position.x - 0.42;
          weldLight.intensity = 3.5 + Math.sin(elapsed * 28) * 1.1;

          const biasX = state.pointerNDC.x * 1.2;
          const stepDt = Math.min(dt, 0.04);
          for (let i = 0; i < sparkCount; i++) {
            ages[i] += stepDt;
            if (ages[i] > 1.25) {
              resetSpark(i, biasX);
              continue;
            }
            velocities[i * 3 + 1] -= 5.8 * stepDt; // gravity
            positions[i * 3] += velocities[i * 3] * stepDt;
            positions[i * 3 + 1] += velocities[i * 3 + 1] * stepDt;
            positions[i * 3 + 2] += velocities[i * 3 + 2] * stepDt;

            if (positions[i * 3 + 1] < -0.72) {
              positions[i * 3 + 1] = -0.72;
              velocities[i * 3 + 1] *= -0.42;
            }
          }
          posAttr.needsUpdate = true;
        },
        dispose: () => disposeObjectTree(root, shared),
      };
    }

    // ══════════════════════════════════════════════════════════════
    // SLIDE 11: Real-time Sheet Metal Bending (Press Brake)
    // ══════════════════════════════════════════════════════════════
    case 'sheet-metal-bend': {
      const bench = new THREE.Group();
      bench.position.set(-1.05, -0.15, 0);

      // Lower V-die block
      const lowerDie = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.5, 1.35), mats.darkIron);
      lowerDie.position.y = -0.78;
      lowerDie.castShadow = true;

      // Upper punch descending when bending
      const punch = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.85, 4), mats.matteSteel);
      punch.rotation.y = Math.PI / 4;
      punch.rotation.z = Math.PI;
      punch.scale.set(3.2, 1, 0.4);
      punch.position.set(0, 0.85, 0);

      // Fixed left sheet leaf + hinged right sheet leaf
      const fixedLeaf = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.07, 1.45), mats.warmMetal);
      fixedLeaf.position.set(-0.675, -0.42, 0);
      fixedLeaf.castShadow = true;

      const hinge = new THREE.Group();
      hinge.position.set(0, -0.42, 0);
      const bendingLeaf = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.07, 1.45), mats.goldenMetal);
      bendingLeaf.position.set(0.675, 0, 0);
      bendingLeaf.castShadow = true;
      hinge.add(bendingLeaf);

      bench.add(lowerDie, punch, fixedLeaf, hinge);
      const shadow = createContactShadowDisc(mats.contactShadowMat, 2.7, -1.25);
      shadow.position.x = -1.05;
      root.add(bench, shadow);

      let currentDeg = 45;
      return {
        root,
        interactables,
        labelAnchors,
        cameraPos: [-3.2, 1.5, 4.6],
        cameraTarget: [-0.6, -0.15, 0],
        autoOrbit: false,
        orbitSpeed: 0,
        darkAtmosphere: false,
        update: (dt, _elapsed, state) => {
          currentDeg = dampValue(currentDeg, state.sheetBendAngle, 8, dt);
          const rad = THREE.MathUtils.degToRad(currentDeg);
          hinge.rotation.z = rad;
          punch.position.y = 0.72 - (currentDeg / 90) * 0.45;
        },
        dispose: () => disposeObjectTree(root, shared),
      };
    }

    // ══════════════════════════════════════════════════════════════
    // SLIDE 12: Exploded Mechanical Assembly (5 Named Labeled Parts)
    // ══════════════════════════════════════════════════════════════
    case 'exploded-assembly': {
      const assembly = new THREE.Group();
      assembly.position.set(-1.35, 0.1, 0);
      assembly.scale.setScalar(0.64);

      const gearMain = createCompositeSpurGear(mats, {
        outerRadius: 1.05,
        innerRadius: 0.28,
        teeth: 20,
        thickness: 0.26,
        spokes: 5,
        rimMaterial: mats.goldenMetal,
      });
      gearMain.name = 'gear_main';

      const shaftGroup = new THREE.Group();
      shaftGroup.name = 'shaft';
      const shaftBody = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 2.1, 24), mats.chromeAccent);
      shaftBody.rotation.x = Math.PI / 2;
      const shaftShoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.45, 24), mats.warmMetal);
      shaftShoulder.rotation.x = Math.PI / 2;
      shaftShoulder.position.z = -0.15;
      const retainingRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.032, 10, 24), mats.goldenMetal);
      retainingRing.position.z = 0.42;
      const keyway = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 1.2), mats.copperMetal);
      keyway.position.y = 0.22;
      shaftGroup.add(shaftBody, shaftShoulder, retainingRing, keyway);

      const bearingGroup = new THREE.Group();
      bearingGroup.name = 'bearing';
      const outerRace = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.1, 14, 28), mats.warmMetal);
      const innerRace = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.06, 12, 24), mats.matteSteel);
      bearingGroup.add(outerRace, innerRace);
      for (let b = 0; b < 8; b++) {
        const ang = (b / 8) * Math.PI * 2;
        const ball = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 12), mats.chromeAccent);
        ball.position.set(Math.cos(ang) * 0.36, Math.sin(ang) * 0.36, 0);
        bearingGroup.add(ball);
      }
      bearingGroup.position.set(0, 0, -0.58);

      const boltsGroup = new THREE.Group();
      boltsGroup.name = 'bolts';
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const bx = Math.cos(ang) * 0.95;
        const by = Math.sin(ang) * 0.95;
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.55, 6), mats.copperMetal);
        bolt.rotation.x = Math.PI / 2;
        bolt.position.set(bx, by, 0.55);
        const boltHead = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.1, 6), mats.goldenMetal);
        boltHead.rotation.x = Math.PI / 2;
        boltHead.position.set(bx, by, 0.82);
        boltsGroup.add(bolt, boltHead);
      }

      const housingGroup = new THREE.Group();
      housingGroup.name = 'housing';
      const frontCover = new THREE.Mesh(
        new THREE.TorusGeometry(1.12, 0.14, 14, 32),
        makeSoftPolymer(0x7db58e, 0.55),
      );
      frontCover.position.z = 0.45;
      const flange = new THREE.Mesh(new THREE.CylinderGeometry(1.26, 1.26, 0.14, 32, 1, true), mats.matteSteel);
      flange.rotation.x = Math.PI / 2;
      flange.position.z = 0.35;
      for (let i = 0; i < 4; i++) {
        const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const collarBos = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.16, 12), mats.darkIron);
        collarBos.rotation.x = Math.PI / 2;
        collarBos.position.set(Math.cos(ang) * 0.95, Math.sin(ang) * 0.95, 0.45);
        housingGroup.add(collarBos);
      }
      housingGroup.add(frontCover, flange);

      assembly.add(gearMain, shaftGroup, bearingGroup, boltsGroup, housingGroup);
      const shadow = createContactShadowDisc(mats.contactShadowMat, 2.8, -1.65);
      shadow.position.x = -1.1;
      root.add(assembly, shadow);
      interactables.push(gearMain, shaftGroup, bearingGroup, boltsGroup, housingGroup);

      const partsState = ASSEMBLY_CUBE_PARTS.map((cfg) => {
        const mesh = assembly.getObjectByName(cfg.meshName)!;
        const origPos = mesh.position.clone();
        const expPos = new THREE.Vector3(...cfg.explodedPosition);
        const origRot = mesh.rotation.clone();
        const expRot = cfg.explodedRotation ? new THREE.Euler(...cfg.explodedRotation) : origRot.clone();
        labelAnchors.push({
          id: cfg.meshName,
          object: mesh,
          offset: new THREE.Vector3(0, 0.42, 0),
          title: cfg.label,
          description: cfg.description,
          requiresExploded: true,
        });
        return { mesh, origPos, expPos, origRot, expRot, cfg };
      });

      let explodeProgress = 0;
      return {
        root,
        interactables,
        labelAnchors,
        cameraPos: [-0.35, 0.9, 6.8],
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
          assembly.rotation.y = Math.sin(elapsed * 0.32) * 0.25 + 0.3;
          explodeProgress = dampValue(explodeProgress, state.exploded ? 1 : 0, 5.5, dt);
          partsState.forEach((p) => {
            p.mesh.position.lerpVectors(p.origPos, p.expPos, explodeProgress);
            _q1.setFromEuler(p.origRot);
            _q2.setFromEuler(p.expRot);
            p.mesh.quaternion.slerpQuaternions(_q1, _q2, explodeProgress);
          });
          gearMain.rotation.z = elapsed * 0.42;
        },
        dispose: () => disposeObjectTree(root, shared),
      };
    }

    default:
      return null;
  }
}
