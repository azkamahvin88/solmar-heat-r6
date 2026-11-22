// Traffic and pedestrians: the city breathing. Traffic cars cruise the road
// lattice, stop for each other at close range, and swerve away from the
// player; pedestrians stroll the sidewalks and flee when shots ring out.
import { WORLD } from './config.js';
import { makeCarMesh, makePedMesh } from './entities.js';
import { range, pick, clamp } from './util.js';

const TRAFFIC_COLORS = [0xc0c8d4, 0x8a2f2f, 0x2f5a8a, 0xd8b13a, 0x3a3a3a, 0x7a4a8a, 0xe8e8e8, 0x4a7a4a];
const PED_SKINS = [0xe8b98a, 0xc98a5a, 0x8a5a3a, 0xf0c8a0];
const PED_SHIRTS = [0xff6b6b, 0x4fc3f7, 0xf2c94c, 0x9b7bff, 0x7bd389, 0xff9f43, 0xe8e8e8];

export function createTraffic(scene, city, random) {
  const cars = [];
  for (let i = 0; i < 26; i += 1) {
    const mesh = makeCarMesh(pick(random, TRAFFIC_COLORS), false);
    scene.add(mesh);
    cars.push(spawnTrafficCar(mesh, city, random));
  }
  const peds = [];
  for (let i = 0; i < 34; i += 1) {
    const mesh = makePedMesh(pick(random, PED_SKINS), pick(random, PED_SHIRTS));
    scene.add(mesh);
    peds.push(spawnPed(mesh, city, random));
  }
  return { cars, peds };
}

function roadPoint(city, random) {
  const vertical = random() < 0.5;
  if (vertical) return { x: pick(random, city.roadsX), z: range(random, -WORLD.half + 30, WORLD.half - 30) };
  return { x: range(random, -WORLD.half + 30, WORLD.half - 30), z: pick(random, city.roadsZ) };
}

function spawnTrafficCar(mesh, city, random) {
  const p = roadPoint(city, random);
  const vertical = Math.abs(p.x - city.roadsX.reduce((a, b) => Math.abs(b - p.x) < Math.abs(a - p.x) ? b : a)) < 1;
  const car = {
    mesh, x: p.x, z: p.z, heading: vertical ? (random() < 0.5 ? 0 : Math.PI) : (random() < 0.5 ? Math.PI / 2 : -Math.PI / 2),
    speed: range(random, 9, 16), vertical, lane: (random() < 0.5 ? -1 : 1) * 3.5, parked: false,
  };
  mesh.position.set(car.x, 0, car.z);
  mesh.rotation.y = car.heading;
  return car;
}

function spawnPed(mesh, city, random) {
  const p = roadPoint(city, random);
  const ped = {
    mesh, x: p.x + range(random, -14, 14), z: p.z + range(random, -14, 14),
    heading: range(random, 0, Math.PI * 2), speed: range(random, 1.2, 2.4),
    flee: 0, walkPhase: range(random, 0, 6),
  };
  mesh.position.set(ped.x, 0, ped.z);
  mesh.rotation.y = ped.heading;
  return ped;
}

export function updateTraffic(state, dt, player) {
  const { cars, peds } = state.traffic;
  for (const car of cars) {
    // Slow down for the car ahead on the same lane.
    let target = car.speed;
    for (const other of cars) {
      if (other === car || other.vertical !== car.vertical) continue;
      const along = car.vertical ? (other.z - car.z) * Math.cos(car.heading) : (other.x - car.x) * Math.sin(car.heading);
      const side = car.vertical ? Math.abs(other.x - car.x) : Math.abs(other.z - car.z);
      if (along > 0 && along < 14 && side < 4) { target = 0; break; }
    }
    // Swerve / brake for the player.
    const pdx = player.x - car.x, pdz = player.z - car.z;
    const pd = Math.hypot(pdx, pdz);
    if (pd < 12) target = Math.min(target, 4);
    car.speed += clamp(target - car.speed, -14 * dt, 8 * dt);
    const step = car.speed * dt;
    if (car.vertical) car.z += Math.cos(car.heading) * step;
    else car.x += Math.sin(car.heading) * step;
    const lim = WORLD.half - 20;
    if (car.x > lim || car.x < -lim || car.z > lim || car.z < -lim) {
      car.heading += Math.PI;
      car.x = clamp(car.x, -lim, lim);
      car.z = clamp(car.z, -lim, lim);
    }
    car.mesh.position.set(car.x + (car.vertical ? car.lane : 0), 0, car.z + (car.vertical ? 0 : car.lane));
    car.mesh.rotation.y = car.heading;
    for (const w of car.mesh.userData.wheels) w.rotation.x += car.speed * dt * 2.2;
  }
  for (const ped of peds) {
    if (ped.flee > 0) {
      ped.flee -= dt;
      const dx = ped.x - player.x, dz = ped.z - player.z;
      const d = Math.hypot(dx, dz) || 1;
      ped.heading = Math.atan2(dx / d, dz / d);
      ped.speed = 5.5;
    } else {
      ped.speed += (1.8 - ped.speed) * dt;
      if (Math.random() < dt * 0.08) ped.heading += range(Math.random, -1.2, 1.2);
    }
    ped.x += Math.sin(ped.heading) * ped.speed * dt;
    ped.z += Math.cos(ped.heading) * ped.speed * dt;
    ped.x = clamp(ped.x, -WORLD.half, WORLD.half);
    ped.z = clamp(ped.z, -WORLD.half, WORLD.beachZ + 20);
    ped.walkPhase += dt * ped.speed * 2;
    ped.mesh.position.set(ped.x, Math.abs(Math.sin(ped.walkPhase)) * 0.12, ped.z);
    ped.mesh.rotation.y = ped.heading;
    const swing = Math.sin(ped.walkPhase) * 0.5;
    ped.mesh.userData.armL.rotation.x = swing;
    ped.mesh.userData.armR.rotation.x = -swing;
  }
}

export function scarePeds(state, x, z, radius) {
  for (const ped of state.traffic.peds) {
    if (Math.hypot(ped.x - x, ped.z - z) < radius) ped.flee = 4;
  }
}
