// Solmar itself: a beachfront grid city at sunset. Ground, ocean and sand,
// the road lattice with markings, sidewalk blocks full of buildings with lit
// windows, palm rows along the boulevard, lamps and props. Returns the
// colliders (building AABBs) and the road lines traffic drives on.
import { WORLD, PALETTE } from './config.js';
import { range, pick } from './util.js';

function windowsTexture(random, base) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 64, 128);
  for (let y = 6; y < 122; y += 12) {
    for (let x = 6; x < 58; x += 12) {
      const lit = random() < 0.55;
      g.fillStyle = lit ? (random() < 0.7 ? '#ffd98a' : '#9fd8ff') : '#20242e';
      g.fillRect(x, y, 7, 8);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildCity(scene, random) {
  const colliders = [];
  const roadsX = [], roadsZ = [];
  for (let v = -WORLD.half + 45; v <= WORLD.half - 45; v += WORLD.roadGap) { roadsX.push(v); roadsZ.push(v); }
  const group = new THREE.Group();
  group.name = 'solmar-city';

  // Ground: grass-green inland, sand near the beach, ocean past it.
  const groundMat = new THREE.MeshLambertMaterial({ color: 0x3f7038 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.half * 2 + 400, WORLD.half * 2 + 400), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 40);
  group.add(ground);

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.half * 2 + 400, 130),
    new THREE.MeshLambertMaterial({ color: PALETTE.sand }));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.05, WORLD.beachZ + 55);
  group.add(sand);

  const ocean = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.half * 2 + 400, 300),
    new THREE.MeshLambertMaterial({ color: PALETTE.ocean, transparent: true, opacity: 0.92 }));
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(0, 0.08, WORLD.oceanZ + 180);
  group.add(ocean);

  // Roads: dark strips along every grid line, with dashed centre lines.
  const roadMat = new THREE.MeshLambertMaterial({ color: PALETTE.asphalt });
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xd8c86a });
  const dashGeo = new THREE.BoxGeometry(0.7, 0.06, 6);
  for (const x of roadsX) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.roadHalf * 2, WORLD.half * 2), roadMat);
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(x, 0.1, 0);
    group.add(strip);
    for (let z = -WORLD.half + 20; z < WORLD.half; z += 24) {
      const d = new THREE.Mesh(dashGeo, lineMat);
      d.position.set(x, 0.14, z);
      group.add(d);
    }
  }
  for (const z of roadsZ) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.half * 2, WORLD.roadHalf * 2), roadMat);
    strip.rotation.x = -Math.PI / 2;
    strip.position.set(0, 0.1, z);
    group.add(strip);
    for (let x = -WORLD.half + 20; x < WORLD.half; x += 24) {
      const d = new THREE.Mesh(new THREE.BoxGeometry(6, 0.06, 0.7), lineMat);
      d.position.set(x, 0.14, z);
      group.add(d);
    }
  }
  // Sidewalk slabs around every block.
  const walkMat = new THREE.MeshLambertMaterial({ color: 0x6f6a63 });
  for (let i = 0; i < roadsX.length - 1; i += 1) {
    for (let j = 0; j < roadsZ.length - 1; j += 1) {
      const cx = (roadsX[i] + roadsX[i + 1]) / 2, cz = (roadsZ[j] + roadsZ[j + 1]) / 2;
      if (cz > WORLD.beachZ - 40) continue;
      const slab = new THREE.Mesh(new THREE.BoxGeometry(WORLD.roadGap - 22, 0.3, WORLD.roadGap - 22), walkMat);
      slab.position.set(cx, 0.15, cz);
      group.add(slab);
    }
  }

  // Buildings: one or two per block, taller toward downtown, lit windows.
  const baseColors = PALETTE.building.map((c) => '#' + c.toString(16).padStart(6, '0'));
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  for (let i = 0; i < roadsX.length - 1; i += 1) {
    for (let j = 0; j < roadsZ.length - 1; j += 1) {
      const cx = (roadsX[i] + roadsX[i + 1]) / 2, cz = (roadsZ[j] + roadsZ[j + 1]) / 2;
      if (cz > WORLD.beachZ - 60) continue;
      if (random() < 0.12) continue; // empty lot / parking
      const downtown = Math.abs(cx) < 140 && Math.abs(cz) < 140;
      const h = downtown ? range(random, 45, 110) : range(random, 12, 42);
      const w = range(random, 26, 52), d = range(random, 26, 52);
      const mat = new THREE.MeshLambertMaterial({ map: windowsTexture(random, pick(random, baseColors)) });
      const b = new THREE.Mesh(boxGeo, mat);
      b.scale.set(w, h, d);
      b.position.set(cx + range(random, -8, 8), h / 2 + 0.3, cz + range(random, -8, 8));
      group.add(b);
      colliders.push({ minX: b.position.x - w / 2 - 1, maxX: b.position.x + w / 2 + 1, minZ: b.position.z - d / 2 - 1, maxZ: b.position.z + d / 2 + 1 });
      // Rooftop beacon on the tallest towers.
      if (h > 80) {
        const beacon = new THREE.Mesh(
          new THREE.SphereGeometry(1.2, 8, 8),
          new THREE.MeshBasicMaterial({ color: 0xff4040 }));
        beacon.position.set(b.position.x, h + 2, b.position.z);
        beacon.name = 'beacon';
        group.add(beacon);
      }
    }
  }

  // Palm rows along the beach boulevard and the marina.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a38 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f8f4e });
  const trunkGeo = new THREE.CylinderGeometry(0.35, 0.55, 9, 6);
  const leafGeo = new THREE.ConeGeometry(3.4, 5, 6);
  function palm(x, z) {
    const p = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 4.5;
    p.add(trunk);
    const leaves = new THREE.Mesh(leafGeo, leafMat);
    leaves.position.y = 10.5;
    p.add(leaves);
    p.position.set(x, 0, z);
    group.add(p);
  }
  for (let x = -WORLD.half + 30; x <= WORLD.half - 30; x += 36) {
    palm(x, WORLD.beachZ - 18);
    if (random() < 0.7) palm(x + 18, WORLD.beachZ - 34);
  }
  for (let z = -WORLD.half + 60; z < WORLD.beachZ - 80; z += 120) {
    if (random() < 0.6) palm(-WORLD.half + 24, z);
    if (random() < 0.6) palm(WORLD.half - 24, z);
  }

  // Street lamps with warm glow spheres along the main avenues.
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x3a3f4a });
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffe1a0 });
  const poleGeo = new THREE.CylinderGeometry(0.18, 0.18, 7, 6);
  const glowGeo = new THREE.SphereGeometry(0.7, 8, 8);
  for (const x of roadsX) {
    for (let z = -WORLD.half + 60; z < WORLD.half; z += 180) {
      const pole = new THREE.Mesh(poleGeo, lampMat);
      pole.position.set(x + WORLD.roadHalf + 1.5, 3.5, z);
      group.add(pole);
      const glow = new THREE.Mesh(glowGeo, glowMat);
      glow.position.set(x + WORLD.roadHalf + 1.5, 7.2, z);
      group.add(glow);
    }
  }

  // Marina pier + a few boats on the water.
  const pier = new THREE.Mesh(new THREE.BoxGeometry(120, 1, 14), new THREE.MeshLambertMaterial({ color: 0x6b4a2f }));
  pier.position.set(300, 0.6, WORLD.oceanZ + 10);
  group.add(pier);
  const boatMat = new THREE.MeshLambertMaterial({ color: 0xe8e8e8 });
  for (let i = 0; i < 5; i += 1) {
    const boat = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.BoxGeometry(14, 2, 5), boatMat);
    hull.position.y = 1;
    boat.add(hull);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 9, 6), lampMat);
    mast.position.y = 6;
    boat.add(mast);
    boat.position.set(180 + i * 55, 0, WORLD.oceanZ + 60 + (i % 2) * 40);
    boat.rotation.y = range(random, -0.4, 0.4);
    group.add(boat);
  }

  scene.add(group);
  return { colliders, roadsX, roadsZ, group };
}

export function collideCircle(colliders, x, z, r) {
  for (const c of colliders) {
    if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) return c;
  }
  return null;
}
export function nearestRoad(roads, v) {
  let best = roads[0], bd = Infinity;
  for (const r of roads) { const d = Math.abs(r - v); if (d < bd) { bd = d; best = r; } }
  return best;
}
