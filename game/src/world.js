// The world: one state object, every system plugged into it. The player on
// foot and behind the wheel, car theft, hitscan combat, rivals, the story
// missions, wanted heat, cash, health, screens, and saving. No drawing here
// except through the meshes the systems own.
import { WORLD, PLAYER, CAR, WEAPONS, MISSIONS, GARAGE_CARS, DISTRICTS } from './config.js';
import { createRandom, clamp, angleLerp, dist2, range, pick } from './util.js';
import { buildCity, collideCircle } from './city.js';
import { createTraffic, updateTraffic, scarePeds } from './traffic.js';
import { createPolice, updatePolice, addHeat, setWanted } from './police.js';
import { createMissionRunner, startMission, updateMissions, setMessage, currentMission } from './missions.js';
import { createAudio } from './audio.js';
import { loadSave, writeSave } from './savegame.js';
import { makeCarMesh, makePedMesh, makeMarkerMesh } from './entities.js';

export function createWorld(scene, seed) {
  const random = createRandom(seed);
  const city = buildCity(scene, random);
  const save = loadSave();
  const traffic = createTraffic(scene, city, random);
  const police = createPolice(scene);
  const audio = createAudio();
  const state = {
    scene, city, random, save, traffic, police, audio,
    time: 0, clock: 19.7, screen: 'title',
    player: { mesh: null, x: 25, z: 60, heading: 0, speed: 0, health: PLAYER.health, armor: PLAYER.armor },
    playerCar: null, parkedCars: [], rivals: [], informant: null,
    cash: save.cash, weaponIndex: 1, ammo: { ...save.weapons }, radioIndex: save.radio || 0,
    crew: [...save.crew], garage: [...save.garage], garageIndex: 0,
    missions: createMissionRunner(scene),
    objective: 'Welcome to Solmar. Walk to the gold marker and press E.',
    districtName: 'Palm Row', clockText: '19:42', camYaw: 0, camPitch: 0.42,
    damageFlash: 0, flashCash: 0, shootCooldown: 0, respawns: 0,
    onMissionComplete: null, attract: true,
  };
  state.player.mesh = makePedMesh(0xe8b98a, 0x4fc3f7);
  scene.add(state.player.mesh);
  state.missions.index = Math.min(save.missionsDone.length, MISSIONS.length);
  state.objective = state.missions.index >= MISSIONS.length
    ? 'Story complete — Solmar is yours. Free roam, build your empire.'
    : `Mission ${state.missions.index + 1}: ${MISSIONS[state.missions.index].title} — walk to the gold marker, press E.`;
  // Parked cars to steal, scattered along the roads.
  for (let i = 0; i < 9; i += 1) {
    const spec = GARAGE_CARS[i % GARAGE_CARS.length];
    const mesh = makeCarMesh(spec.color, false);
    scene.add(mesh);
    const rx = pick(random, city.roadsX) + (random() < 0.5 ? -1 : 1) * 4.5;
    const rz = range(random, -WORLD.half + 40, WORLD.half - 60);
    const car = { mesh, x: rx, z: rz, heading: random() < 0.5 ? 0 : Math.PI, speed: 0, spin: 0, spec, parked: true };
    mesh.position.set(rx, 0, rz);
    mesh.rotation.y = car.heading;
    state.parkedCars.push(car);
  }
  // The player's own garage ride waits at the Dune Flats lockup.
  const home = garageCar(state, scene, state.garage[0] || 'sedan', -155, -25);
  state.playerCar = null;
  state.garageCar = home;
  placeMissionMarker(state);
  return state;
}

export function garageCar(state, scene, id, x, z) {
  const spec = GARAGE_CARS.find((c) => c.id === id) || GARAGE_CARS[0];
  const mesh = makeCarMesh(spec.color, false);
  scene.add(mesh);
  const car = { mesh, x, z, heading: Math.PI / 2, speed: 0, spin: 0, spec, parked: true, owned: true };
  mesh.position.set(x, 0, z);
  mesh.rotation.y = car.heading;
  state.parkedCars.push(car);
  return car;
}

function placeMissionMarker(state) {
  const def = currentMission(state.missions);
  if (!def) return;
  if (state.missions.marker) state.scene.remove(state.missions.marker);
  state.missions.marker = makeMarkerMesh(0xf2c94c);
  state.missions.marker.position.set(def.target.x, 0, def.target.z);
  state.scene.add(state.missions.marker);
}

export function districtAt(x, z) {
  if (z > 270 && x > 0) return DISTRICTS[0];
  if (z > 150) return DISTRICTS[2];
  if (x < -180) return DISTRICTS[3];
  if (Math.abs(x) < 150 && Math.abs(z) < 150) return DISTRICTS[1];
  return DISTRICTS[4];
}

function nearestCar(state, x, z, maxD) {
  let best = null, bd = maxD * maxD;
  for (const c of state.parkedCars) {
    const d = dist2(x, z, c.x, c.z);
    if (d < bd) { bd = d; best = c; }
  }
  for (const c of state.traffic.cars) {
    const d = dist2(x, z, c.x, c.z);
    if (d < bd) { bd = d; best = c; }
  }
  return best;
}

function enterCar(state, car) {
  const idx = state.parkedCars.indexOf(car);
  if (idx >= 0) state.parkedCars.splice(idx, 1);
  const tidx = state.traffic.cars.indexOf(car);
  if (tidx >= 0) state.traffic.cars.splice(tidx, 1);
  state.playerCar = car;
  car.parked = false;
  car.speed = 0;
  car.spin = 0;
  if (!car.owned) {
    addHeat(state.police, 0.4, state.scene);
    setMessage(state, 'Car stolen — keep it out of sight of the cops.', 3);
    scarePeds(state, car.x, car.z, 25);
  }
  state.audio.unlock();
}

function exitCar(state) {
  const car = state.playerCar;
  if (!car) return;
  state.playerCar = null;
  car.parked = true;
  car.speed = 0;
  state.player.x = car.x + Math.sin(car.heading + Math.PI / 2) * 3;
  state.player.z = car.z + Math.cos(car.heading + Math.PI / 2) * 3;
  state.parkedCars.push(car);
}

function shoot(state) {
  const w = WEAPONS[state.weaponIndex];
  if (state.shootCooldown > 0) return;
  if (w.ammo !== Infinity) {
    if ((state.ammo[w.id] || 0) <= 0) { setMessage(state, `${w.name} is empty — pick up ammo or switch weapon (Q).`, 3); return; }
    state.ammo[w.id] -= 1;
  }
  state.shootCooldown = w.rate;
  state.audio.shot();
  state.muzzle = 0.08;
  scarePeds(state, state.player.x, state.player.z, 40);
  addHeat(state.police, 0.25, state.scene);
  const ox = state.playerCar ? state.playerCar.x : state.player.x;
  const oz = state.playerCar ? state.playerCar.z : state.player.z;
  const aim = state.playerCar ? state.playerCar.heading : state.player.heading;
  const pellets = w.pellets || 1;
  for (let p = 0; p < pellets; p += 1) {
    const a = aim + (Math.random() - 0.5) * w.spread * 4;
    const dx = Math.sin(a), dz = Math.cos(a);
    // Cops first, then rivals.
    let best = null, bd = w.range;
    for (const c of state.police.cops) {
      const rx = c.x - ox, rz = c.z - oz;
      const along = rx * dx + rz * dz;
      if (along < 2 || along > w.range) continue;
      const perp = Math.abs(rx * dz - rz * dx);
      if (perp < 2.2 && along < bd) { bd = along; best = { kind: 'cop', ref: c }; }
    }
    for (const r of state.rivals) {
      const rx = r.x - ox, rz = r.z - oz;
      const along = rx * dx + rz * dz;
      if (along < 2 || along > w.range) continue;
      const perp = Math.abs(rx * dz - rz * dx);
      if (perp < 2.2 && along < bd) { bd = along; best = { kind: 'rival', ref: r }; }
    }
    if (best) {
      if (best.kind === 'cop') {
        best.ref.hp -= w.damage;
        if (best.ref.hp <= 0) {
          state.scene.remove(best.ref.mesh);
          state.police.cops.splice(state.police.cops.indexOf(best.ref), 1);
          addHeat(state.police, 0.5, state.scene);
        }
      } else {
        best.ref.hp -= w.damage;
        if (best.ref.hp <= 0) {
          state.scene.remove(best.ref.mesh);
          state.rivals.splice(state.rivals.indexOf(best.ref), 1);
          state.missions.targetsLeft -= 1;
          state.cash += 150;
        }
      }
    }
  }
}

function spawnRivals(state, n, x, z) {
  for (let i = 0; i < n; i += 1) {
    const mesh = makePedMesh(0x8a5a3a, 0x2a2a2a);
    const rx = x + range(state.random, -14, 14), rz = z + range(state.random, -14, 14);
    mesh.position.set(rx, 0, rz);
    state.scene.add(mesh);
    state.rivals.push({ mesh, x: rx, z: rz, heading: 0, hp: 50, shootT: range(state.random, 0.5, 1.5) });
  }
}

function updateRivals(state, dt) {
  const p = state.player;
  for (const r of state.rivals) {
    const d = Math.hypot(p.x - r.x, p.z - r.z);
    r.heading = Math.atan2(p.x - r.x, p.z - r.z);
    if (d > 6) {
      r.x += Math.sin(r.heading) * 4.5 * dt;
      r.z += Math.cos(r.heading) * 4.5 * dt;
    }
    r.shootT -= dt;
    if (r.shootT <= 0 && d < 34) {
      r.shootT = 1.4;
      const hit = Math.random() < 0.45;
      if (hit) {
        if (state.playerCar) { state.playerCar.speed *= 0.9; }
        else { p.health -= 6; state.damageFlash = 0.5; }
      }
    }
    r.mesh.position.set(r.x, 0, r.z);
    r.mesh.rotation.y = r.heading;
  }
}

function updatePlayerCar(state, dt, input) {
  const car = state.playerCar;
  const driver = state.crew.includes('rio');
  const top = car.spec.top * (driver ? 1.12 : 1);
  const accel = car.spec.accel;
  const steerInput = (input.left() ? 1 : 0) - (input.right() ? 1 : 0);
  if (input.forward()) car.speed += accel * dt;
  if (input.back()) car.speed -= (car.speed > 0 ? CAR.brake : CAR.reverse) * dt;
  if (!input.forward() && !input.back()) car.speed -= Math.sign(car.speed) * 8 * dt;
  if (Math.abs(car.speed) < 0.5 && !input.forward() && !input.back()) car.speed = 0;
  car.speed = clamp(car.speed, -CAR.maxReverse, top);
  car.heading += steerInput * CAR.steer * dt * clamp(Math.abs(car.speed) / 14, 0, 1) * Math.sign(car.speed || 1);
  if (car.spin !== 0) {
    car.heading += car.spin * dt;
    car.spin *= Math.pow(0.2, dt);
    if (Math.abs(car.spin) < 0.05) car.spin = 0;
  }
  const nx = car.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.z + Math.cos(car.heading) * car.speed * dt;
  const hit = collideCircle(state.city.colliders, nx, nz, CAR.radius);
  if (hit) {
    car.speed *= -0.25;
    state.damageFlash = 0.25;
  } else {
    car.x = clamp(nx, -WORLD.half, WORLD.half);
    car.z = clamp(nz, -WORLD.half, WORLD.beachZ + 40);
  }
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
  for (const w of car.mesh.userData.wheels) w.rotation.x += car.speed * dt * 2.2;
  state.player.x = car.x;
  state.player.z = car.z;
  state.player.heading = car.heading;
  state.player.speed = car.speed;
  state.audio.setEngine(Math.abs(car.speed) / top, true);
}

function updatePlayerFoot(state, dt, input) {
  const p = state.player;
  const orbit = input.takeOrbit();
  state.camYaw -= orbit.dx * 0.005;
  const fx = Math.sin(state.camYaw), fz = Math.cos(state.camYaw);
  const rx = Math.sin(state.camYaw + Math.PI / 2), rz = Math.cos(state.camYaw + Math.PI / 2);
  let mx = 0, mz = 0;
  if (input.forward()) { mx += fx; mz += fz; }
  if (input.back()) { mx -= fx; mz -= fz; }
  if (input.right()) { mx += rx; mz += rz; }
  if (input.left()) { mx -= rx; mz -= rz; }
  const len = Math.hypot(mx, mz);
  const speed = input.run() ? PLAYER.runSpeed : PLAYER.walkSpeed;
  if (len > 0) {
    mx /= len; mz /= len;
    const wantHeading = Math.atan2(mx, mz);
    p.heading = angleLerp(p.heading, wantHeading, clamp(10 * dt, 0, 1));
    const nx = p.x + mx * speed * dt, nz = p.z + mz * speed * dt;
    if (!collideCircle(state.city.colliders, nx, nz, PLAYER.radius)) {
      p.x = clamp(nx, -WORLD.half, WORLD.half);
      p.z = clamp(nz, -WORLD.half, WORLD.beachZ + 40);
    }
    p.speed = speed;
  } else p.speed = 0;
  p.mesh.position.set(p.x, Math.abs(Math.sin(state.time * 8)) * (p.speed > 0 ? 0.08 : 0), p.z);
  p.mesh.rotation.y = p.heading;
  state.audio.setEngine(0, false);
}

function missionPhaseWatch(state) {
  const m = state.missions;
  if (!m.active) return;
  if (m.phase === 'fight' && state.rivals.length === 0 && m.targetsLeft > 0) {
    spawnRivals(state, Math.min(m.targetsLeft, 4), m.active.target.x, m.active.target.z);
  }
  if (m.phase === 'protect' && !state.informant) {
    const mesh = makePedMesh(0xf0c8a0, 0xe8e8e8);
    mesh.position.set(m.active.target.x, 0, m.active.target.z);
    state.scene.add(mesh);
    state.informant = { mesh, x: m.active.target.x, z: m.active.target.z, hp: 100 };
  }
}

export function stepWorld(state, dt, input, actions) {
  state.time += dt;
  state.clock = (19.7 + state.time / 240) % 24;
  const hh = Math.floor(state.clock), mm = Math.floor((state.clock - hh) * 60);
  state.clockText = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  state.damageFlash = Math.max(0, state.damageFlash - dt * 1.4);
  state.flashCash = Math.max(0, state.flashCash - dt);
  state.shootCooldown = Math.max(0, state.shootCooldown - dt);
  if (state.muzzle > 0) state.muzzle -= dt;

  if (state.screen === 'title') {
    // Attract mode: the city lives behind the title.
    state.player.heading += dt * 0.05;
    updateTraffic(state, dt, state.player);
    updatePolice(state, dt, state.scene);
    return;
  }
  if (state.screen !== 'play') return;

  state.districtName = districtAt(state.player.x, state.player.z).name;
  if (state.playerCar) updatePlayerCar(state, dt, input);
  else updatePlayerFoot(state, dt, input);

  updateTraffic(state, dt, state.player);
  updatePolice(state, dt, state.scene);
  updateRivals(state, dt);
  missionPhaseWatch(state);
  updateMissions(state, dt, state.scene);
  if (state.informant) {
    const inf = state.informant;
    inf.mesh.position.set(inf.x, 0, inf.z);
    if (inf.hp <= 0) {
      state.scene.remove(inf.mesh);
      state.informant = null;
    }
  }

  // Shooting: click / hold for automatics.
  const w = WEAPONS[state.weaponIndex];
  if ((actions & 32) || (input.mouseHeld() && w.auto)) shoot(state);

  if (actions & 4) { // E
    if (state.playerCar) exitCar(state);
    else {
      const def = currentMission(state.missions);
      if (!state.missions.active && def && dist2(state.player.x, state.player.z, def.target.x, def.target.z) < 16 * 16) {
        startMission(state, state.scene);
      } else {
        const car = nearestCar(state, state.player.x, state.player.z, 4.5);
        if (car) enterCar(state, car);
      }
    }
  }
  if (actions & 8) { // Q: cycle weapon
    state.weaponIndex = (state.weaponIndex + 1) % WEAPONS.length;
    setMessage(state, `Weapon: ${WEAPONS[state.weaponIndex].name}`, 2);
  }
  if (actions & 16) { // R: radio
    const st = state.audio.nextStation();
    state.radioIndex = (state.radioIndex + 1) % 3;
    setMessage(state, `Radio: ${st.name}`, 2);
  }
  if (actions & 128) { // F: save
    state.save.cash = Math.floor(state.cash);
    state.save.weapons = { ...state.ammo };
    if (writeSave(state.save)) setMessage(state, 'Game saved.', 2);
  }

  // Busted / wasted.
  if (state.player.health <= 0) {
    state.screen = 'over';
    state.cash = Math.max(0, state.cash - 500);
    state.player.health = PLAYER.health;
    state.police.wanted = 0;
    state.police.heat = 0;
    state.respawns += 1;
    for (const c of state.police.cops) state.scene.remove(c.mesh);
    state.police.cops = [];
    return 'over';
  }
  return null;
}

export function respawn(state) {
  state.player.x = 385;
  state.player.z = 340;
  state.player.health = PLAYER.health;
  state.player.armor = PLAYER.armor;
  if (state.playerCar) { exitCar(state); }
  state.screen = 'play';
}

export function startPlay(state) {
  state.screen = 'play';
  state.attract = false;
  state.audio.unlock();
  state.audio.startRadio();
  state.save.cash = Math.floor(state.cash);
}
