"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import type { DishArchetype } from "@/lib/api";

interface ProceduralDishThreeCanvasProps {
  archetype: DishArchetype;
  title: string;
  customPhotoDataUrl?: string | null;
}

function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry.dispose();
      const materials = Array.isArray(obj.material)
        ? obj.material
        : [obj.material];
      for (const mat of materials) {
        if (mat && typeof mat.dispose === "function") {
          for (const value of Object.values(mat)) {
            if (value && value instanceof THREE.Texture) {
              value.dispose();
            }
          }
          mat.dispose();
        }
      }
    }
  });
}

function makeLatheVessel(
  profile: [number, number][],
  segments = 48
): THREE.LatheGeometry {
  const pts = profile.map(([r, y]) => new THREE.Vector2(r, y));
  return new THREE.LatheGeometry(pts, segments);
}

function buildArchetypeDish(archetype: DishArchetype): THREE.Group {
  const group = new THREE.Group();

  // Shared materials
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xc89a3d,
    metalness: 0.84,
    roughness: 0.28,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0xd4d7d9,
    metalness: 0.88,
    roughness: 0.22,
  });
  const clayDarkMat = new THREE.MeshStandardMaterial({
    color: 0x2d241f,
    metalness: 0.08,
    roughness: 0.36,
  });
  const stonewareMat = new THREE.MeshStandardMaterial({
    color: 0x2f3439,
    metalness: 0.05,
    roughness: 0.64,
  });
  const terracottaMat = new THREE.MeshStandardMaterial({
    color: 0xb75b3c,
    metalness: 0.04,
    roughness: 0.62,
  });
  const herbMat = new THREE.MeshStandardMaterial({
    color: 0x3f7a23,
    roughness: 0.65,
  });
  const limeMat = new THREE.MeshStandardMaterial({
    color: 0x8cb82c,
    roughness: 0.45,
  });

  if (archetype === "kadhai") {
    // Hammered Brass Kadhai + Side Brass Katori of Curd + Garlic Naan Wedges
    const kadhaiGeo = makeLatheVessel([
      [0.01, 0.0],
      [0.95, 0.04],
      [1.38, 0.28],
      [1.56, 0.68],
      [1.64, 0.74],
      [1.52, 0.72],
      [1.26, 0.3],
      [0.82, 0.12],
      [0.01, 0.1],
    ]);
    const kadhai = new THREE.Mesh(kadhaiGeo, brassMat);
    kadhai.castShadow = true;
    kadhai.receiveShadow = true;
    group.add(kadhai);

    // Forged side loop handles
    const handleGeo = new THREE.TorusGeometry(0.28, 0.045, 12, 28, Math.PI * 1.15);
    const leftHandle = new THREE.Mesh(handleGeo, brassMat);
    leftHandle.position.set(-1.58, 0.68, 0);
    leftHandle.rotation.set(0.35, 0, Math.PI * 0.42);
    leftHandle.castShadow = true;
    group.add(leftHandle);

    const rightHandle = new THREE.Mesh(handleGeo, brassMat);
    rightHandle.position.set(1.58, 0.68, 0);
    rightHandle.rotation.set(-0.35, 0, -Math.PI * 0.58);
    rightHandle.castShadow = true;
    group.add(rightHandle);

    // Makhani gravy base
    const gravyMat = new THREE.MeshPhysicalMaterial({
      color: 0xc9421c,
      roughness: 0.24,
      clearcoat: 0.65,
      clearcoatRoughness: 0.22,
    });
    const gravy = new THREE.Mesh(
      new THREE.CylinderGeometry(1.42, 1.1, 0.2, 40),
      gravyMat
    );
    gravy.position.y = 0.48;
    gravy.receiveShadow = true;
    group.add(gravy);

    // Cream swirl ring
    const creamSwirl = new THREE.Mesh(
      new THREE.TorusGeometry(0.75, 0.032, 10, 40),
      new THREE.MeshStandardMaterial({ color: 0xfbf7ee, roughness: 0.28 })
    );
    creamSwirl.rotation.x = Math.PI / 2;
    creamSwirl.position.y = 0.59;
    group.add(creamSwirl);

    // Charred Paneer Tikka cubes
    const paneerMat = new THREE.MeshStandardMaterial({
      color: 0xef9c47,
      roughness: 0.52,
    });
    const searMat = new THREE.MeshStandardMaterial({
      color: 0x3b180b,
      roughness: 0.8,
    });
    const paneerOffsets: [number, number, number, number][] = [
      [-0.45, 0.64, 0.22, 0.4],
      [0.12, 0.66, -0.35, 0.9],
      [0.52, 0.63, 0.26, -0.3],
      [-0.1, 0.67, 0.34, 0.15],
      [-0.58, 0.62, -0.32, 0.7],
      [0.44, 0.63, -0.36, -0.5],
      [0.05, 0.68, -0.02, 0.25],
    ];
    for (const [px, py, pz, ry] of paneerOffsets) {
      const cube = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.22, 0.26),
        paneerMat
      );
      cube.position.set(px, py, pz);
      cube.rotation.set(0.12, ry, 0.08);
      cube.castShadow = true;
      const charDot = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.04, 0.12),
        searMat
      );
      charDot.position.y = 0.11;
      cube.add(charDot);
      group.add(cube);
    }

    // 150ml Brass Katori of Hung Curd beside kadhai
    const katori = new THREE.Mesh(
      makeLatheVessel([
        [0.01, 0.0],
        [0.36, 0.02],
        [0.52, 0.22],
        [0.55, 0.42],
        [0.5, 0.42],
        [0.44, 0.12],
        [0.01, 0.1],
      ]),
      brassMat
    );
    katori.position.set(1.72, 0.02, 0.92);
    katori.castShadow = true;
    katori.receiveShadow = true;
    const curd = new THREE.Mesh(
      new THREE.CylinderGeometry(0.49, 0.4, 0.12, 32),
      new THREE.MeshStandardMaterial({ color: 0xf9f8f2, roughness: 0.32 })
    );
    curd.position.set(1.72, 0.33, 0.92);
    group.add(katori, curd);

    // Garlic Naan wedges on left foreground
    const naanMat = new THREE.MeshStandardMaterial({
      color: 0xe6ca93,
      roughness: 0.78,
    });
    for (let i = 0; i < 2; i++) {
      const naan = new THREE.Mesh(
        new THREE.ConeGeometry(0.48, 0.07, 3),
        naanMat
      );
      naan.scale.set(1.3, 1, 0.85);
      naan.position.set(-1.55 + i * 0.25, 0.08 + i * 0.06, 0.85 + i * 0.12);
      naan.rotation.set(0.08, 0.6 + i * 0.45, 0.04);
      naan.castShadow = true;
      group.add(naan);
    }
  } else if (archetype === "thali") {
    // Brass Thali Plate
    const thaliPlate = new THREE.Mesh(
      makeLatheVessel([
        [0.01, 0.0],
        [1.75, 0.03],
        [1.92, 0.22],
        [1.98, 0.24],
        [1.88, 0.24],
        [1.7, 0.08],
        [0.01, 0.07],
      ]),
      brassMat
    );
    thaliPlate.castShadow = true;
    thaliPlate.receiveShadow = true;
    group.add(thaliPlate);

    // Dal Katori inside thali
    const dalKatori = new THREE.Mesh(
      makeLatheVessel([
        [0.01, 0.07],
        [0.62, 0.09],
        [0.82, 0.32],
        [0.86, 0.46],
        [0.8, 0.46],
        [0.58, 0.14],
        [0.01, 0.12],
      ]),
      brassMat
    );
    dalKatori.position.set(-0.68, 0.01, 0.18);
    dalKatori.castShadow = true;
    const dal = new THREE.Mesh(
      new THREE.CylinderGeometry(0.76, 0.62, 0.14, 32),
      new THREE.MeshPhysicalMaterial({
        color: 0x3b6e22,
        roughness: 0.3,
        clearcoat: 0.55,
      })
    );
    dal.position.set(-0.68, 0.38, 0.18);

    // Kashmiri red chili pods + crispy garlic flakes
    const chiliMat = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      roughness: 0.35,
    });
    for (let i = 0; i < 2; i++) {
      const chili = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.045, 0.28, 6, 12),
        chiliMat
      );
      chili.position.set(-0.7 + i * 0.16, 0.47, 0.14 + i * 0.09);
      chili.rotation.set(Math.PI / 2 - 0.1, 0.4 + i * 0.7, 0.2);
      group.add(chili);
    }

    // Jeera Rice Dome on right
    const riceDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.72, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.52),
      new THREE.MeshStandardMaterial({ color: 0xf7f5ec, roughness: 0.68 })
    );
    riceDome.position.set(0.68, 0.08, -0.18);
    riceDome.scale.set(1, 0.72, 1);
    riceDome.castShadow = true;

    // Fresh Lime half
    const lime = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.5),
      limeMat
    );
    lime.rotation.x = Math.PI * 0.72;
    lime.position.set(0.95, 0.18, 0.72);
    group.add(dalKatori, dal, riceDome, lime);
  } else if (archetype === "dosa") {
    // Steel Plate + Crisp Golden Masala Dosa Cylinder + 3 Katoris
    const plate = new THREE.Mesh(
      makeLatheVessel([
        [0.01, 0.0],
        [1.72, 0.03],
        [1.92, 0.16],
        [1.96, 0.18],
        [1.86, 0.18],
        [1.68, 0.07],
        [0.01, 0.06],
      ]),
      steelMat
    );
    plate.castShadow = true;
    plate.receiveShadow = true;
    group.add(plate);

    // Crisp Rolled Dosa
    const dosa = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.42, 2.3, 36, 1, true),
      new THREE.MeshStandardMaterial({
        color: 0xc97b32,
        roughness: 0.48,
        side: THREE.DoubleSide,
      })
    );
    dosa.rotation.set(0.18, 0.45, Math.PI / 2);
    dosa.position.set(-0.08, 0.44, -0.08);
    dosa.castShadow = true;
    group.add(dosa);

    // Masala Potato peeking out
    const masala = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 18, 14),
      new THREE.MeshStandardMaterial({ color: 0xe2a829, roughness: 0.7 })
    );
    masala.position.set(-1.02, 0.34, 0.38);
    masala.material = masala.material;
    group.add(masala);

    // 3 Steel Katoris (Chutneys & Sambar)
    const katoriData: [number, number, number][] = [
      [-0.86, -0.78, 0xf2ebd9], // Coconut Chutney
      [1.04, -0.1, 0xd13825], // Red Chili Chutney
      [0.42, 0.92, 0xb55918], // Tiffin Sambar
    ];
    for (const [kx, kz, liquidHex] of katoriData) {
      const bow = new THREE.Mesh(
        makeLatheVessel([
          [0.01, 0.06],
          [0.34, 0.08],
          [0.42, 0.34],
          [0.38, 0.34],
          [0.31, 0.11],
          [0.01, 0.1],
        ]),
        steelMat
      );
      bow.position.set(kx, 0.01, kz);
      bow.castShadow = true;
      const liq = new THREE.Mesh(
        new THREE.CylinderGeometry(0.37, 0.32, 0.08, 24),
        new THREE.MeshPhysicalMaterial({
          color: liquidHex,
          roughness: 0.25,
          clearcoat: 0.5,
        })
      );
      liq.position.set(kx, 0.28, kz);
      group.add(bow, liq);
    }
  } else if (archetype === "bowl") {
    // Charcoal Stoneware Quinoa & Chicken Tikka Bowl
    const bowl = new THREE.Mesh(
      makeLatheVessel([
        [0.01, 0.0],
        [0.78, 0.03],
        [1.36, 0.36],
        [1.54, 0.92],
        [1.46, 0.94],
        [1.26, 0.42],
        [0.72, 0.12],
        [0.01, 0.1],
      ]),
      stonewareMat
    );
    bowl.castShadow = true;
    bowl.receiveShadow = true;
    group.add(bowl);

    // Quinoa bed
    const quinoa = new THREE.Mesh(
      new THREE.CylinderGeometry(1.38, 1.0, 0.24, 36),
      new THREE.MeshStandardMaterial({ color: 0xddd4c1, roughness: 0.85 })
    );
    quinoa.position.y = 0.58;
    group.add(quinoa);

    // Mint curd pool
    const mintPool = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.5, 0.06, 28),
      new THREE.MeshPhysicalMaterial({
        color: 0xd4f0d1,
        roughness: 0.25,
        clearcoat: 0.5,
      })
    );
    mintPool.position.set(-0.46, 0.72, -0.15);
    group.add(mintPool);

    // Charred Chicken Tikka pieces
    const tikkaMat = new THREE.MeshStandardMaterial({
      color: 0xc2481e,
      roughness: 0.46,
    });
    const spots: [number, number, number][] = [
      [0.25, 0.8, 0.12],
      [0.52, 0.78, -0.25],
      [0.12, 0.82, -0.38],
      [-0.08, 0.81, 0.28],
      [0.42, 0.77, 0.42],
    ];
    for (const [x, y, z] of spots) {
      const piece = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.2, 1),
        tikkaMat
      );
      piece.scale.set(1.2, 0.78, 0.95);
      piece.position.set(x, y, z);
      piece.castShadow = true;
      group.add(piece);
    }

    // Pickled pink onion rings
    const onionMat = new THREE.MeshStandardMaterial({
      color: 0xdd6b9b,
      roughness: 0.35,
    });
    for (let i = 0; i < 4; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.18, 0.03, 10, 24),
        onionMat
      );
      ring.rotation.set(Math.PI / 2 + 0.15, i * 0.5, 0.1);
      ring.position.set(0.65 - i * 0.08, 0.76 + i * 0.02, 0.45);
      group.add(ring);
    }
  } else if (archetype === "uruli") {
    // Dark Kerala Clay Uruli + Glossy Prawns + Side Appam Plate
    const uruli = new THREE.Mesh(
      makeLatheVessel([
        [0.01, 0.0],
        [0.88, 0.04],
        [1.24, 0.32],
        [1.32, 0.72],
        [1.22, 0.76],
        [1.14, 0.35],
        [0.82, 0.12],
        [0.01, 0.1],
      ]),
      clayDarkMat
    );
    uruli.position.set(-0.55, 0, 0.2);
    uruli.castShadow = true;
    uruli.receiveShadow = true;
    group.add(uruli);

    const pepperMasala = new THREE.Mesh(
      new THREE.CylinderGeometry(1.12, 0.95, 0.18, 36),
      new THREE.MeshPhysicalMaterial({
        color: 0x3b1f14,
        roughness: 0.25,
        clearcoat: 0.6,
      })
    );
    pepperMasala.position.set(-0.55, 0.5, 0.2);
    group.add(pepperMasala);

    // Curled Tiger Prawns
    const prawnMat = new THREE.MeshPhysicalMaterial({
      color: 0xb94a22,
      roughness: 0.3,
      clearcoat: 0.55,
    });
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const prawn = new THREE.Mesh(
        new THREE.TorusGeometry(0.22, 0.09, 10, 20, Math.PI * 1.45),
        prawnMat
      );
      prawn.rotation.set(Math.PI / 2 - 0.18, 0, angle);
      prawn.position.set(
        -0.55 + Math.cos(angle) * 0.5,
        0.64,
        0.2 + Math.sin(angle) * 0.5
      );
      prawn.castShadow = true;
      group.add(prawn);
    }

    // Curry leaves
    for (let i = 0; i < 4; i++) {
      const leaf = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.03, 0.16, 4, 8),
        herbMat
      );
      leaf.rotation.set(Math.PI / 2, i * 0.9, 0.3);
      leaf.position.set(-0.55 + (i - 1.5) * 0.2, 0.72, 0.2 + (i % 2) * 0.25);
      group.add(leaf);
    }

    // Lacy Appam beside uruli
    const appamMat = new THREE.MeshStandardMaterial({
      color: 0xf4efe2,
      roughness: 0.65,
      side: THREE.DoubleSide,
    });
    const appamPlate = new THREE.Mesh(
      new THREE.CylinderGeometry(1.05, 0.98, 0.08, 36),
      new THREE.MeshStandardMaterial({ color: 0xc2b7a6, roughness: 0.58 })
    );
    appamPlate.position.set(1.22, 0.05, -0.35);
    appamPlate.receiveShadow = true;
    const appam = new THREE.Mesh(
      makeLatheVessel([
        [0.01, 0.09],
        [0.36, 0.12],
        [0.78, 0.34],
        [0.95, 0.54],
      ]),
      appamMat
    );
    appam.position.set(1.22, 0.02, -0.35);
    appam.castShadow = true;
    group.add(appamPlate, appam);
  } else if (archetype === "platter") {
    // Mumbai Steel Tawa Platter + Beetroot Bhaji + White Makkhan Cube + 2 Ladi Pav
    const tray = new THREE.Mesh(
      new THREE.BoxGeometry(3.1, 0.18, 2.3),
      steelMat
    );
    tray.position.y = 0.09;
    tray.castShadow = true;
    tray.receiveShadow = true;
    group.add(tray);

    const bhaji = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 0.14, 1.15),
      new THREE.MeshPhysicalMaterial({
        color: 0x991b2e,
        roughness: 0.36,
        clearcoat: 0.45,
      })
    );
    bhaji.position.set(-0.1, 0.2, 0.38);
    group.add(bhaji);

    // Melting Makkhan Butter Cube
    const butter = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.24, 0.42),
      new THREE.MeshPhysicalMaterial({
        color: 0xfef9d8,
        roughness: 0.2,
        clearcoat: 0.75,
      })
    );
    butter.position.set(-0.15, 0.34, 0.38);
    butter.castShadow = true;
    group.add(butter);

    // Two Toasted Ladi Pav Buns
    const pavMat = new THREE.MeshStandardMaterial({
      color: 0xdca052,
      roughness: 0.62,
    });
    for (let i = 0; i < 2; i++) {
      const pav = new THREE.Mesh(
        new THREE.BoxGeometry(0.68, 0.38, 0.62),
        pavMat
      );
      pav.position.set(-0.55 + i * 0.78, 0.36, -0.58);
      pav.castShadow = true;
      group.add(pav);
    }

    // Lime wedge
    const lime = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 20, 12, 0, Math.PI, 0, Math.PI * 0.5),
      limeMat
    );
    lime.position.set(1.05, 0.22, -0.56);
    group.add(lime);
  } else {
    // Terracotta Handi + Scalloped Brass Plate of Saffron Basanti Pulao
    const handi = new THREE.Mesh(
      makeLatheVessel([
        [0.01, 0.0],
        [0.72, 0.02],
        [1.15, 0.42],
        [1.1, 0.85],
        [0.88, 1.06],
        [0.98, 1.12],
        [0.82, 1.12],
        [0.78, 0.88],
        [0.01, 0.85],
      ]),
      terracottaMat
    );
    handi.position.set(-0.92, 0, 0.08);
    handi.castShadow = true;
    handi.receiveShadow = true;
    group.add(handi);

    const koshaGravy = new THREE.Mesh(
      new THREE.CylinderGeometry(0.76, 0.72, 0.14, 28),
      new THREE.MeshPhysicalMaterial({
        color: 0x451a08,
        roughness: 0.28,
        clearcoat: 0.6,
      })
    );
    koshaGravy.position.set(-0.92, 0.9, 0.08);
    group.add(koshaGravy);

    // Soya & chana chunks inside handi
    const soyaMat = new THREE.MeshStandardMaterial({
      color: 0xb46b2a,
      roughness: 0.68,
    });
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const chunk = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.14, 1),
        soyaMat
      );
      chunk.position.set(
        -0.92 + Math.cos(a) * (i === 0 ? 0 : 0.42),
        0.99,
        0.08 + Math.sin(a) * (i === 0 ? 0 : 0.42)
      );
      group.add(chunk);
    }

    // Scalloped Brass Plate of Saffron Basanti Pulao
    const brassPlate = new THREE.Mesh(
      makeLatheVessel([
        [0.01, 0.0],
        [1.0, 0.03],
        [1.14, 0.18],
        [1.08, 0.19],
        [0.96, 0.07],
        [0.01, 0.06],
      ]),
      brassMat
    );
    brassPlate.position.set(1.06, 0, -0.08);
    brassPlate.castShadow = true;
    brassPlate.receiveShadow = true;
    const pulaoMound = new THREE.Mesh(
      new THREE.SphereGeometry(0.86, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.48),
      new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.7 })
    );
    pulaoMound.scale.set(1, 0.55, 1);
    pulaoMound.position.set(1.06, 0.06, -0.08);
    pulaoMound.castShadow = true;
    group.add(brassPlate, pulaoMound);
  }

  return group;
}

export function ProceduralDishThreeCanvas({
  archetype,
  title,
  customPhotoDataUrl,
}: ProceduralDishThreeCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [webglError, setWebglError] = useState(false);

  useEffect(() => {
    const container = hostRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      setWebglError(true);
      return;
    }

    setWebglError(false);
    const width = Math.max(260, container.clientWidth);
    const height = Math.max(240, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 2.75, 4.35);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    // Prevent wheel zoom hijacking Lenis smooth vertical scroll
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.minPolarAngle = Math.PI * 0.16;
    controls.maxPolarAngle = Math.PI * 0.44;
    controls.target.set(0, 0.35, 0);
    controls.update();

    // 3-Point Warm Studio Lighting (per 3d-studio / threejs-lighting skill)
    const hemi = new THREE.HemisphereLight(0xfffbeb, 0xc8c2b0, 1.15);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff4e0, 2.4);
    keyLight.position.set(3.5, 6.2, 4.0);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 16;
    keyLight.shadow.bias = -0.0008;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xffe1c7, 0.95);
    rimLight.position.set(-4.0, 3.0, -3.5);
    scene.add(rimLight);

    // Subtle shadow catcher floor
    const shadowFloor = new THREE.Mesh(
      new THREE.CircleGeometry(3.4, 48),
      new THREE.ShadowMaterial({ opacity: 0.18 })
    );
    shadowFloor.rotation.x = -Math.PI / 2;
    shadowFloor.position.y = -0.01;
    shadowFloor.receiveShadow = true;
    scene.add(shadowFloor);

    // Procedural dish model reconstructed in code (img2threejs pattern)
    const dishGroup = buildArchetypeDish(archetype);
    scene.add(dishGroup);

    // Optional uploaded user photo or video thumbnail mapped onto a 3D porcelain studio medallion
    let loadedTexture: THREE.Texture | null = null;
    if (
      customPhotoDataUrl &&
      (customPhotoDataUrl.startsWith("data:image/") ||
        /^https?:\/\//i.test(customPhotoDataUrl))
    ) {
      const texLoader = new THREE.TextureLoader();
      texLoader.setCrossOrigin("anonymous");
      loadedTexture = texLoader.load(
        customPhotoDataUrl,
        () => {
          renderer?.render(scene, camera);
        },
        undefined,
        () => {
          // Ignore CORS load errors cleanly without crashing 3D stage
        }
      );
      loadedTexture.colorSpace = THREE.SRGBColorSpace;

      const medallionGroup = new THREE.Group();
      medallionGroup.position.set(0, 1.45, -1.55);
      medallionGroup.rotation.x = -0.14;

      const ceramicBacking = new THREE.Mesh(
        new THREE.CylinderGeometry(0.96, 1.0, 0.08, 48),
        new THREE.MeshStandardMaterial({ color: 0xfbfaf4, roughness: 0.3 })
      );
      ceramicBacking.rotation.x = Math.PI / 2;
      ceramicBacking.castShadow = true;

      const brassFrame = new THREE.Mesh(
        new THREE.TorusGeometry(0.96, 0.04, 12, 48),
        new THREE.MeshStandardMaterial({
          color: 0xc89a3d,
          metalness: 0.85,
          roughness: 0.25,
        })
      );
      brassFrame.position.z = 0.03;

      const photoFace = new THREE.Mesh(
        new THREE.CircleGeometry(0.92, 48),
        new THREE.MeshStandardMaterial({
          map: loadedTexture,
          roughness: 0.42,
        })
      );
      photoFace.position.z = 0.045;

      medallionGroup.add(ceramicBacking, brassFrame, photoFace);
      dishGroup.add(medallionGroup);
    }

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let isVisible = true;
    let isInteracting = false;
    let rafId = 0;

    const onStart = () => {
      isInteracting = true;
    };
    const onEnd = () => {
      isInteracting = false;
    };
    controls.addEventListener("start", onStart);
    controls.addEventListener("end", onEnd);

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry || !renderer) return;
      const w = Math.max(260, Math.floor(entry.contentRect.width));
      const h = Math.max(240, Math.floor(entry.contentRect.height));
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    const io = new IntersectionObserver(
      (entries) => {
        isVisible = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 }
    );
    io.observe(container);

    let lastTs = performance.now();
    const tick = (now: number) => {
      rafId = requestAnimationFrame(tick);
      if (!isVisible || !renderer) return;
      const dt = Math.min(0.05, (now - lastTs) / 1000);
      lastTs = now;
      if (!prefersReduced && !isInteracting) {
        dishGroup.rotation.y += dt * 0.35;
      }
      controls.update();
      renderer.render(scene, camera);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      controls.removeEventListener("start", onStart);
      controls.removeEventListener("end", onEnd);
      resizeObserver.disconnect();
      io.disconnect();
      controls.dispose();
      if (loadedTexture) loadedTexture.dispose();
      disposeObject3D(scene);
      renderer?.dispose();
    };
  }, [archetype, customPhotoDataUrl]);

  if (webglError) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-[12px] border border-[#d3d4c8] bg-[#e9eade]/70 p-4 text-center text-xs text-[#4d4c4c]">
        3D interactive view requires WebGL ({title}).
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <div
        ref={hostRef}
        aria-label={`Interactive 3D Three.js model for ${title}`}
        className="h-full w-full cursor-grab active:cursor-grabbing"
      />
      <span className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-[#d3d4c8] bg-[#f1f3e6]/90 px-3 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#4d4c4c] shadow-sm">
        Drag to orbit 3D model • img2threejs
      </span>
    </div>
  );
}
