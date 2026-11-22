// Boot and the one loop: input every frame, the world in fixed 1/60 s steps,
// the renderer paints what is there. Screens: title, play, paused, busted.
// ?seed=N fixes the city. ?shot=cover|play|start|end stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady.
import { STEP } from './config.js';
import { createRandom } from './util.js';
import { createWorld, stepWorld, respawn, startPlay } from './world.js';
import { createView } from './render3d.js';
import { createHud } from './hud.js';
import { createInput, ACT_CONFIRM, ACT_PAUSE, ACT_SHOOT } from './input.js';
import { stageShot } from './shots.js';
import { writeSave } from './savegame.js';
import { hireCrew, buyCar, crewList, garageList } from './meta.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 7;

const canvas = document.getElementById('game');
const view = createView(canvas);
const state = createWorld(view.scene, seed);
const hud = createHud();
state.onMissionComplete = (payout) => {
  state.save.cash = Math.floor(state.cash);
  state.save.weapons = { ...state.ammo };
  writeSave(state.save);
  state.audio.cash();
};

function runShot(name) {
  const screen = stageShot(name, state, view);
  hud.update(state, state.city);
  hud.showScreen(screen === 'title' ? 'title' : null);
  // Paint synchronously (twice, so textures settle): headless screenshots do
  // not reliably fire requestAnimationFrame before the capture.
  view.render(state, 1 / 60);
  hud.update(state, state.city);
  view.render(state, 1 / 60);
  hud.update(state, state.city);
  window.__shotReady = true;
}

function runGame() {
  const input = createInput(canvas);
  let accumulator = 0;
  let last = performance.now();

  function wireButtons() {
    const on = (id, fn) => { const b = document.getElementById(id); if (b) b.addEventListener('click', fn); };
    on('btn-start', () => { startPlay(state); hud.showScreen(null); });
    on('btn-resume', () => { state.screen = 'play'; hud.showScreen(null); });
    on('btn-save', () => {
      state.save.cash = Math.floor(state.cash);
      state.save.weapons = { ...state.ammo };
      writeSave(state.save);
      document.getElementById('pause-note').textContent = 'Saved.';
    });
    on('btn-car', () => {
      const owned = garageList(state.save).filter((c) => c.owned);
      state.garageIndex = (state.garageIndex + 1) % owned.length;
      const spec = owned[state.garageIndex];
      document.getElementById('pause-note').textContent = `Ride: ${spec.name} — it waits at the Dune Flats lockup.`;
    });
    on('btn-crew', () => {
      const next = crewList(state.save).find((c) => !c.hired && state.cash >= c.cost);
      if (next && hireCrew(state.save, next.id)) {
        state.cash = state.save.cash;
        state.crew = [...state.save.crew];
        document.getElementById('pause-note').textContent = `${next.name} joined the crew — ${next.perk}`;
      } else document.getElementById('pause-note').textContent = 'No crew to hire right now (need $8,000).';
    });
    on('btn-buy', () => {
      const next = garageList(state.save).find((c) => !c.owned && state.cash >= c.price);
      if (next && buyCar(state.save, next.id)) {
        state.cash = state.save.cash;
        document.getElementById('pause-note').textContent = `${next.name} is yours — parked at the lockup.`;
      } else document.getElementById('pause-note').textContent = 'Nothing affordable in the garage right now.';
    });
    on('btn-title', () => { state.screen = 'title'; hud.showScreen('title'); });
    on('btn-continue', () => { respawn(state); hud.showScreen(null); });
    on('btn-how', () => { document.getElementById('howto').style.display = 'block'; });
  }
  wireButtons();
  hud.showScreen('title');

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    if (actions & ACT_PAUSE) {
      if (state.screen === 'play') { state.screen = 'paused'; hud.showScreen('pause'); }
      else if (state.screen === 'paused') { state.screen = 'play'; hud.showScreen(null); }
    }
    if (actions & ACT_CONFIRM) {
      if (state.screen === 'title') { startPlay(state); hud.showScreen(null); }
      else if (state.screen === 'over') { respawn(state); hud.showScreen(null); }
    }
    if (state.screen === 'play' || state.screen === 'title') {
      let firstStep = true;
      while (accumulator >= STEP && (state.screen === 'play' || state.screen === 'title')) {
        const result = stepWorld(state, STEP, input, firstStep ? actions : 0);
        firstStep = false;
        accumulator -= STEP;
        if (result === 'over') {
          hud.showScreen('over', `Cash kept: $${Math.floor(state.cash).toLocaleString('en-US')} — hospital bill $500. Missions done: ${state.save.missionsDone.length}/10.`);
          break;
        }
      }
    } else accumulator = 0;
    if (state.screen === 'play' || state.screen === 'title') {
      view.render(state, 1 / 60);
      hud.update(state, state.city);
    }
    if (state.police.wanted > 0) state.audio.siren(true);
    else state.audio.siren(false);
  }
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
