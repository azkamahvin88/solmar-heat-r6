// SOLMAR HEAT: Vice Coast — every tuning number, name and colour in one place.
// The city is a fixed 1200x1200 world; the renderer scales the view to the window,
// so no rule below depends on the screen size.
export const STEP = 1 / 60;
export const WORLD = { half: 560, beachZ: 470, oceanZ: 520, roadGap: 90, roadHalf: 7 };
export const SAVE_KEY = 'solmar-heat.save.v1';
export const BEST_KEY = 'solmar-heat.best';

export const PLAYER = {
  walkSpeed: 9, runSpeed: 15, health: 100, armor: 100,
  turnSpeed: 7, radius: 1.1,
};
export const CAR = {
  accel: 26, brake: 42, reverse: 14, maxSpeed: 62, maxReverse: 18,
  steer: 1.9, grip: 6.5, handbrake: 30, radius: 2.6,
};
export const WANTED = {
  decayDelay: 6, decayRate: 0.25, max: 5,
  copCount: [0, 2, 3, 4, 6, 8],
  heliAt: 3, roadblockAt: 3, spikeAt: 4,
};
export const WEAPONS = [
  { id: 'fists', name: 'Fists', damage: 12, rate: 0.35, range: 3.2, auto: false, ammo: Infinity, spread: 0 },
  { id: 'pistol', name: 'P9 Pistol', damage: 22, rate: 0.28, range: 70, auto: false, ammo: 120, spread: 0.012 },
  { id: 'smg', name: 'VK-9 SMG', damage: 14, rate: 0.075, range: 55, auto: true, ammo: 320, spread: 0.045 },
  { id: 'shotgun', name: 'Riot 12G', damage: 16, rate: 0.85, range: 34, auto: false, ammo: 48, spread: 0.11, pellets: 7 },
];
export const DISTRICTS = [
  { id: 'marina', name: 'Marina Bay', color: '#3fd2c0', standing: 0 },
  { id: 'downtown', name: 'Downtown Solmar', color: '#ffd166', standing: 0 },
  { id: 'palms', name: 'Palm Row', color: '#ff7b9c', standing: 0 },
  { id: 'harbor', name: 'Old Harbor', color: '#9b7bff', standing: 0 },
  { id: 'dunes', name: 'Dune Flats', color: '#7bd389', standing: 0 },
];
export const CREW = [
  { id: 'rio', name: 'Rio Vega', role: 'Getaway Driver', perk: 'Cars handle +25% grip, top speed +12%', color: '#ffcf3f' },
  { id: 'maya', name: 'Maya Chen', role: 'Hacker', perk: 'Wanted decays 2x faster, cameras blind 30s', color: '#4fc3f7' },
  { id: 'bruno', name: 'Bruno "Brick" Sosa', role: 'Muscle', perk: 'You take 35% less damage, fists hit 2x', color: '#ff6b6b' },
  { id: 'lena', name: 'Lena Kova', role: 'Fixer', perk: 'Mission payouts +20%, garage prices -25%', color: '#c792ea' },
];
export const GARAGE_CARS = [
  { id: 'sedan', name: 'Solmar Sedan', price: 0, top: 52, accel: 22, color: 0x8a94a6, owned: true },
  { id: 'coupe', name: 'Vesper Coupe', price: 18000, top: 66, accel: 30, color: 0xd43d2a, owned: false },
  { id: 'muscle', name: 'Bravado Muscle', price: 32000, top: 70, accel: 34, color: 0x2a6fd4, owned: false },
  { id: 'super', name: 'Tempesta GT', price: 85000, top: 84, accel: 42, color: 0xf2c94c, owned: false },
  { id: 'offroad', name: 'Dune Runner 4x4', price: 24000, top: 58, accel: 26, color: 0x4caf50, owned: false },
];
export const RADIO = [
  { id: 'wave', name: 'SOLMAR WAVE 88.4', desc: 'Synthwave nights', hue: '#ff2e88' },
  { id: 'sol', name: 'RADIO SOL 101.2', desc: 'Latin heat', hue: '#ffb020' },
  { id: 'talk', name: 'VICE TALK 640', desc: 'City talk + police band', hue: '#4fc3f7' },
];
// Story: ten missions, a rise from nobody to the one who owns the coast.
export const MISSIONS = [
  { id: 'm1', n: 1, title: 'First Wheels', giver: 'Rio Vega', payout: 2500, district: 'dunes',
    brief: 'Rio needs a car, any car. Jack the blue coupe on Palm Row and bring it to the Dune Flats lockup. Cops notice joyrides — keep it clean.',
    type: 'steal-deliver', target: { x: 205, z: -65 }, dest: { x: -335, z: 385 } },
  { id: 'm2', n: 2, title: 'Coffee Run', giver: 'Lena Kova', payout: 4000, district: 'downtown',
    brief: 'Lena left a package at the Downtown bank. Pick it up and drop it at the Marina — no shooting, no sirens. A clean run pays double in reputation.',
    type: 'deliver', target: { x: 115, z: 25 }, dest: { x: 385, z: 295 } },
  { id: 'm3', n: 3, title: 'Tail the Courier', giver: 'Maya Chen', payout: 6500, district: 'harbor',
    brief: 'A Harbor courier carries the ledger. Tail his van from the docks without being spotted. Lose him and the trail goes cold.',
    type: 'tail', target: { x: -335, z: 205 }, dest: { x: -65, z: -245 } },
  { id: 'm4', n: 4, title: 'Harbor Ambush', giver: 'Bruno Sosa', payout: 9000, district: 'harbor',
    brief: 'Bruno is pinned at the Old Harbor warehouse. Fight through the rival crew, grab the crates, and lose the cops before you reach the safehouse.',
    type: 'shootout', target: { x: -335, z: 115 }, dest: { x: 295, z: -155 } },
  { id: 'm5', n: 5, title: 'Midnight Tow', giver: 'Rio Vega', payout: 12000, district: 'palms',
    brief: 'A rival tow crew is impounding our cars on Palm Row. Ram their trucks off the boulevard, then bring the Tempesta back to the garage.',
    type: 'ram', target: { x: 115, z: 295 }, dest: { x: -155, z: -65 } },
  { id: 'm6', n: 6, title: 'The Informant', giver: 'Maya Chen', payout: 16000, district: 'downtown',
    brief: 'An informant will talk — but only at the Downtown rooftop, and only if you arrive before the hit squad does. Protect him, then get him out.',
    type: 'protect', target: { x: 25, z: -65 }, dest: { x: -245, z: 295 } },
  { id: 'm7', n: 7, title: 'Beachfront Heist', giver: 'Lena Kova', payout: 24000, district: 'marina',
    brief: 'A jewelry courier lands at Marina Bay at dusk. Hit the convoy, take the case, and vanish into the beach traffic before the helicopter finds you.',
    type: 'heist', target: { x: 295, z: 385 }, dest: { x: -335, z: -335 } },
  { id: 'm8', n: 8, title: 'Heat Wave', giver: 'Bruno Sosa', payout: 32000, district: 'downtown',
    brief: 'The whole Solmar PD is on us. Survive a five-star chase for two minutes — roadblocks, spikes, the chopper — then break the line at the harbor tunnel.',
    type: 'survive', target: { x: 25, z: 25 }, dest: { x: -425, z: 205 }, survive: 120 },
  { id: 'm9', n: 9, title: 'Kingpin\'s Ledger', giver: 'Maya Chen', payout: 48000, district: 'harbor',
    brief: 'The ledger is in the Harbor vault. Maya kills the cameras for 90 seconds — get in, crack it, get out. After that, every cop in Solmar wants you.',
    type: 'vault', target: { x: -245, z: 115 }, dest: { x: 385, z: -245 } },
  { id: 'm10', n: 10, title: 'The Solmar Run', giver: 'Lena Kova', payout: 250000, district: 'marina',
    brief: 'One last run. $2.4M in the trunk, the whole city burning behind you, a helicopter overhead and a roadblock on the causeway. Cross the Marina bridge and Solmar is yours.',
    type: 'finale', target: { x: 25, z: 385 }, dest: { x: 475, z: 475 } },
];
export const PALETTE = {
  sky: 0xff9a56, skyTop: 0x2b3a6e, fog: 0xcf7a52, sun: 0xffd9a0,
  asphalt: 0x2e3138, sidewalk: 0x8d8578, sand: 0xe8c98f, ocean: 0x1d6f8e,
  building: [0x5a6b8a, 0x7a5a6b, 0x4a6b5a, 0x8a7a4a, 0x6b5a8a, 0x3f4a63],
  hud: '#ffffff', cash: '#7CFC00', danger: '#ff5252', gold: '#f2c94c',
};
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
