// The Solmar PD: wanted stars, patrol cars that chase, PIT and ram, roadblocks
// at 3 stars, spike strips at 4, and the police helicopter with its searchlight
// at 3 stars and up. Wanted decays once the player breaks line of sight.
import { WORLD, WANTED } from './config.js';
import { makeCarMesh, makeHeliMesh } from './entities.js';
import { clamp, angleLerp, dist2 } from './util.js';

export function createPolice(scene) {
  return {
    cops: [], heli: null, heliMesh: null, roadblock: [], spikes: [],
    wanted: 0, heat: 0, lastSeen: 0, sirenPhase: 0,
  };
}

function spawnCop(scene, police, x, z) {
  const mesh = makeCarMesh(0x1a1a22, true);
  scene.add(mesh);
  const cop = {
    mesh, x, z, heading: 0, speed: 0, maxSpeed: 46, stuck: 0,
    pitCooldown: 0, ramCooldown: 0, hp: 60,
  };
  police.cops.push(cop);
  return cop;
}

function spawnHeli(scene, police) {
  const mesh = makeHeliMesh();
  scene.add(mesh);
  police.heliMesh = mesh;
  police.heli = { x: 0, z: 0, y: 70, angle: 0 };
}

export function setWanted(police, level, scene) {
  police.wanted = clamp(level, 0, WANTED.max);
  police.heat = police.wanted;
  if (police.wanted >= WANTED.heliAt && !police.heli && scene) spawnHeli(scene, police);
}

export function addHeat(police, amount, scene) {
  police.heat = clamp(police.heat + amount, 0, WANTED.max);
  police.wanted = Math.max(police.wanted, Math.floor(police.heat));
  police.lastSeen = 0;
  if (police.wanted >= WANTED.heliAt && !police.heli && scene) spawnHeli(scene, police);
}

function buildRoadblock(scene, police, x, z, heading) {
  clearRoadblock(scene, police);
  const px = Math.cos(heading), pz = -Math.sin(heading);
  for (let i = -1; i <= 1; i += 1) {
    const mesh = makeCarMesh(0x1a1a22, true);
    mesh.position.set(x + px * i * 5, 0, z + pz * i * 5);
    mesh.rotation.y = heading + Math.PI / 2;
    scene.add(mesh);
    police.roadblock.push({ mesh, x: x + px * i * 5, z: z + pz * i * 5 });
  }
}
function clearRoadblock(scene, police) {
  for (const b of police.roadblock) scene.remove(b.mesh);
  police.roadblock = [];
}

export function updatePolice(state, dt, scene) {
  const police = state.police;
  const player = state.player;
  const px = player.x, pz = player.z;
  police.sirenPhase += dt;

  // Decay: break line of sight for a while and the heat cools off.
  if (police.wanted > 0) {
    const nearest = police.cops.reduce((m, c) => Math.min(m, dist2(c.x, c.z, px, pz)), Infinity);
    const seen = nearest < 90 * 90 || (police.heli && police.wanted >= 3);
    if (seen) police.lastSeen = 0;
    else {
      police.lastSeen += dt;
      if (police.lastSeen > WANTED.decayDelay) {
        police.heat -= WANTED.decayRate * dt;
        if (police.heat < police.wanted) police.wanted = Math.max(0, Math.floor(police.heat));
        if (police.wanted === 0) {
          for (const c of police.cops) scene.remove(c.mesh);
          police.cops = [];
          clearRoadblock(scene, police);
          if (police.heliMesh) { scene.remove(police.heliMesh); police.heli = null; police.heliMesh = null; }
        }
      }
    }
  }

  // Spawn the right number of patrol cars around the player.
  const want = WANTED.copCount[police.wanted] || 0;
  while (police.cops.length < want) {
    const a = Math.random() * Math.PI * 2;
    const d = 120 + Math.random() * 60;
    spawnCop(scene, police,
      clamp(px + Math.sin(a) * d, -WORLD.half, WORLD.half),
      clamp(pz + Math.cos(a) * d, -WORLD.half, WORLD.half));
  }
  while (police.cops.length > want) {
    const c = police.cops.pop();
    scene.remove(c.mesh);
  }

  // Roadblock ahead on the player's road at 3+ stars.
  if (police.wanted >= WANTED.roadblockAt && police.roadblock.length === 0) {
    const ahead = 90;
    const hx = Math.sin(player.heading), hz = Math.cos(player.heading);
    buildRoadblock(scene, police, px + hx * ahead, pz + hz * ahead, player.heading);
  } else if (police.wanted < WANTED.roadblockAt && police.roadblock.length) {
    clearRoadblock(scene, police);
  }

  // Chase: steer toward a point ahead of the player, PIT when alongside.
  for (const cop of police.cops) {
    cop.pitCooldown -= dt;
    cop.ramCooldown -= dt;
    const lead = 0.6;
    const tx = px + Math.sin(player.heading) * player.speed * lead;
    const tz = pz + Math.cos(player.heading) * player.speed * lead;
    const wantHeading = Math.atan2(tx - cop.x, tz - cop.z);
    cop.heading = angleLerp(cop.heading, wantHeading, clamp(2.6 * dt, 0, 1));
    const d = Math.hypot(tx - cop.x, tz - cop.z);
    const target = d > 6 ? cop.maxSpeed + police.wanted * 2.5 : 12;
    cop.speed += clamp(target - cop.speed, -30 * dt, 18 * dt);
    cop.x += Math.sin(cop.heading) * cop.speed * dt;
    cop.z += Math.cos(cop.heading) * cop.speed * dt;
    cop.mesh.position.set(cop.x, 0, cop.z);
    cop.mesh.rotation.y = cop.heading;
    for (const w of cop.mesh.userData.wheels) w.rotation.x += cop.speed * dt * 2.2;
    // Flashing lightbar.
    const on = Math.floor(police.sirenPhase * 6) % 2 === 0;
    const bar = cop.mesh.getObjectByName('lightbar');
    const bar2 = cop.mesh.getObjectByName('lightbar2');
    if (bar) bar.visible = on;
    if (bar2) bar2.visible = !on;
    // PIT: alongside and close, shove the player's car sideways.
    const pd = Math.hypot(px - cop.x, pz - cop.z);
    if (pd < 7 && cop.pitCooldown <= 0) {
      cop.pitCooldown = 3;
      if (state.playerCar) {
        state.playerCar.spin += (cop.x > px ? 1 : -1) * 2.4;
        state.playerCar.speed *= 0.72;
        state.damageFlash = 0.5;
      } else {
        state.player.health -= 12;
      }
    }
    // Ram from behind.
    if (pd < 5 && cop.ramCooldown <= 0 && state.playerCar) {
      cop.ramCooldown = 2.5;
      state.playerCar.speed = Math.max(0, state.playerCar.speed - 6);
      state.damageFlash = 0.4;
    }
  }

  // Helicopter: circle overhead, spotlight tracking the player.
  if (police.heli && police.heliMesh) {
    const h = police.heli;
    h.angle += dt * 0.55;
    h.x = px + Math.sin(h.angle) * 26;
    h.z = pz + Math.cos(h.angle) * 26;
    h.y += (64 - h.y) * dt;
    police.heliMesh.position.set(h.x, h.y, h.z);
    police.heliMesh.rotation.y = Math.atan2(px - h.x, pz - h.z);
    police.heliMesh.userData.rotor.rotation.y += dt * 22;
    const cone = police.heliMesh.getObjectByName('spotcone');
    if (cone) cone.lookAt(px - h.x, -h.y, pz - h.z);
  }
}

export function copPositions(police) {
  return police.cops.map((c) => ({ x: c.x, z: c.z }));
}
