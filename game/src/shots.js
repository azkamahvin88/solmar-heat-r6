// The screenshot scenes behind ?shot=cover|play|start|end. Each one stages a
// real game state — the same world, the same rules, stepped forward — so the
// frame is what playing really looks like, and the same seed repeats it.
// The cover is the finale at its busiest: the last mission, five stars, the
// helicopter overhead, a roadblock on the causeway, $2.4M on the HUD.
import { STEP, MISSIONS } from './config.js';
import { createWorld, stepWorld } from './world.js';
import { setWanted } from './police.js';
import { makeCarMesh, makePedMesh } from './entities.js';
import { clamp } from './util.js';

function driveForward(state, seconds, throttle) {
  const input = {
    forward: () => true, back: () => false, left: () => false,
    right: () => false, run: () => false, mouseHeld: () => false,
    takeOrbit: () => ({ dx: 0, dy: 0 }),
  };
  for (let i = 0; i < seconds / STEP; i += 1) stepWorld(state, STEP, input, 0);
}

function parkCopRing(state, cx, cz, n, radius) {
  for (let i = 0; i < n; i += 1) {
    const a = (i / n) * Math.PI * 2 + 0.4;
    const x = cx + Math.sin(a) * radius, z = cz + Math.cos(a) * radius;
    const mesh = makeCarMesh(0x1a1a22, true);
    mesh.position.set(x, 0, z);
    mesh.rotation.y = Math.atan2(cx - x, cz - z);
    state.scene.add(mesh);
    state.police.cops.push({
      mesh, x, z, heading: Math.atan2(cx - x, cz - z),
      speed: 18, maxSpeed: 48, stuck: 0, pitCooldown: 4, ramCooldown: 3, hp: 60,
    });
  }
}

function placeCop(state, x, z, heading) {
  const mesh = makeCarMesh(0x1a1a22, true);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  state.scene.add(mesh);
  state.police.cops.push({
    mesh, x, z, heading, speed: 20, maxSpeed: 48,
    stuck: 0, pitCooldown: 4, ramCooldown: 3, hp: 60,
  });
}

function placeRival(state, x, z) {
  const mesh = makePedMesh(0x8a5a3a, 0x2a2a2a);
  mesh.position.set(x, 0, z);
  state.scene.add(mesh);
  state.rivals.push({ mesh, x, z, heading: Math.PI, hp: 50, shootT: 1 });
}

function givePlayerCar(state, specId, x, z, heading) {
  const spec = { id: specId, top: 84, accel: 42, color: 0xf2c94c };
  const mesh = makeCarMesh(spec.color, false);
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  state.scene.add(mesh);
  state.playerCar = { mesh, x, z, heading, speed: 34, spin: 0, spec, parked: false, owned: true };
  state.player.x = x; state.player.z = z; state.player.heading = heading;
}

export function stageShot(name, state, view) {
  const scene = state.scene;
  if (name === 'cover') {
    // Finale tableau: the Solmar Run, mid-chase on the Palm Row avenue,
    // driving north into the downtown skyline with the roadblock ahead.
    state.cash = 2431500;
    state.missions.index = 9;
    state.missions.active = MISSIONS[9];
    state.missions.phase = 'deliver';
    if (state.missions.marker) state.missions.marker.position.set(475, 0, 475);
    state.objective = 'THE SOLMAR RUN: cross the Marina bridge — $2.4M in the trunk!';
    state.screen = 'play';
    state.shotCam = true; state.camLift = 7;
    setWanted(state.police, 5, scene);
    if (state.police.heli) state.police.heli.y = 52;
    givePlayerCar(state, 'super', 115, 295, Math.PI);
    parkCopRing(state, 115, 280, 6, 22);
    view.snap(Math.PI);
    driveForward(state, 1.0, true);
    // Flanking patrol cars ahead of the player, in frame, plus the helicopter
    // low ahead so the chase reads from the chase camera.
    const pc = state.playerCar;
    placeCop(state, pc.x - 9, pc.z - 34, 0);
    placeCop(state, pc.x + 9, pc.z - 30, 0);
    if (state.police.heli && state.police.heliMesh) {
      state.police.heli.x = pc.x - 14;
      state.police.heli.z = pc.z - 52;
      state.police.heli.y = 30;
      state.police.heliMesh.position.set(pc.x - 14, 30, pc.z - 52);
      state.police.heliMesh.rotation.y = Math.atan2(pc.x - (pc.x - 14), pc.z - (pc.z - 52));
    }
    // Roadblock ahead on the avenue if the dispatch has not built one.
    if (!state.police.roadblock.length) {
      for (let i = -1; i <= 1; i += 1) {
        const mesh = makeCarMesh(0x1a1a22, true);
        mesh.position.set(115 + i * 6, 0, 205);
        mesh.rotation.y = Math.PI / 2;
        scene.add(mesh);
        state.police.roadblock.push({ mesh, x: 115 + i * 6, z: 205 });
      }
    }
    return 'play';
  }
  if (name === 'play') {
    // Mission 4, mid-shootout at the Old Harbor, three stars.
    state.cash = 18400;
    state.missions.index = 3;
    state.missions.active = MISSIONS[3];
    state.missions.phase = 'fight';
    state.missions.targetsLeft = 4;
    if (state.missions.marker) state.missions.marker.position.set(-335, 0, 115);
    state.objective = 'HARBOR AMBUSH: clear the crew — 4 hostiles left';
    state.screen = 'play';
    state.shotCam = true; state.camLift = 2;
    setWanted(state.police, 3, scene);
    givePlayerCar(state, 'muscle', -335, 115, Math.PI / 2);
    parkCopRing(state, -335, 115, 3, 24);
    view.snap(Math.PI / 2);
    driveForward(state, 1.0, true);
    // Rival crew ahead on the street and patrol cars flanking, in frame.
    const pc2 = state.playerCar;
    placeRival(state, pc2.x + 26, pc2.z - 5);
    placeRival(state, pc2.x + 30, pc2.z + 6);
    placeCop(state, pc2.x + 34, pc2.z - 11, -Math.PI / 2);
    placeCop(state, pc2.x + 38, pc2.z + 10, -Math.PI / 2);
    return 'play';
  }
  if (name === 'end') {
    // Mission complete: payout flash, crew beside the car, harbor sunset.
    state.cash = 48600;
    state.missions.index = 9;
    state.missions.active = null;
    state.missions.phase = 'idle';
    state.objective = 'Story complete — Solmar is yours.';
    state.screen = 'play';
    state.shotCam = true; state.camLift = 1;
    state.districtName = 'Marina Bay';
    setWanted(state.police, 0, scene);
    givePlayerCar(state, 'super', 295, 385, Math.PI / 2);
    state.playerCar.speed = 0;
    view.snap(Math.PI / 2);
    state.flashCash = 1.2;
    return 'play';
  }
  // start: title over the living city at dusk, looking north at downtown.
  state.screen = 'title';
  state.shotCam = true; state.camLift = 0;
  state.player.x = 25; state.player.z = 295; state.player.heading = Math.PI;
  view.snap(Math.PI);
  for (let i = 0; i < 5 / STEP; i += 1) stepWorld(state, STEP, {
    forward: () => false, back: () => false, left: () => false,
    right: () => false, run: () => false, mouseHeld: () => false,
    takeOrbit: () => ({ dx: 0, dy: 0 }),
  }, 0);
  return 'title';
}
