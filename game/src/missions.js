// The story: ten missions, one rise. Each mission is a small state machine
// over waypoints — go here, do the thing, get out — with a live objective
// line, a marker in the world, payouts, and district standing on completion.
import { MISSIONS, DISTRICTS } from './config.js';
import { makeMarkerMesh } from './entities.js';
import { dist2 } from './util.js';

export function createMissionRunner(scene) {
  return {
    index: 0, active: null, marker: null, phase: 'idle',
    timer: 0, targetsLeft: 0, message: '', messageT: 0,
  };
}

export function currentMission(runner) {
  return MISSIONS[runner.index] || null;
}

export function startMission(state, scene) {
  const runner = state.missions;
  const def = currentMission(runner);
  if (!def) return false;
  runner.active = def;
  runner.phase = 'go';
  runner.timer = 0;
  runner.targetsLeft = def.type === 'shootout' ? 6 : def.type === 'ram' ? 3 : def.type === 'heist' ? 4 : 0;
  if (runner.marker) scene.remove(runner.marker);
  runner.marker = makeMarkerMesh(0xf2c94c);
  runner.marker.position.set(def.target.x, 0, def.target.z);
  scene.add(runner.marker);
  setMessage(state, `${def.n}. ${def.title} — ${def.giver}: ${def.brief}`, 9);
  state.objective = `Go to ${def.title} — ${def.giver}`;
  return true;
}

export function setMessage(state, text, seconds) {
  state.missions.message = text;
  state.missions.messageT = seconds || 5;
}

export function completeMission(state, scene) {
  const runner = state.missions;
  const def = runner.active;
  if (!def) return;
  const fixer = state.crew.includes('lena') ? 1.2 : 1;
  const payout = Math.round(def.payout * fixer);
  state.cash += payout;
  state.save.missionsDone.push(def.id);
  const d = DISTRICTS.find((x) => x.id === def.district);
  if (d) state.save.standing[def.district] = Math.min(100, (state.save.standing[def.district] || 0) + 12);
  runner.index += 1;
  runner.active = null;
  runner.phase = 'idle';
  if (runner.marker) { scene.remove(runner.marker); runner.marker = null; }
  setMessage(state, `MISSION COMPLETE — ${def.title}: +$${payout.toLocaleString('en-US')}. ${d ? d.name + ' standing up.' : ''}`, 7);
  state.objective = currentMission(runner) ? `Next: ${currentMission(runner).title} — press E at the marker` : 'Story complete — Solmar is yours.';
  state.flashCash = 1.2;
  if (state.onMissionComplete) state.onMissionComplete(payout);
}

export function failMission(state, scene, why) {
  const runner = state.missions;
  if (!runner.active) return;
  setMessage(state, `MISSION FAILED — ${why}. Try again from the marker.`, 6);
  runner.active = null;
  runner.phase = 'idle';
  if (runner.marker) { scene.remove(runner.marker); runner.marker = null; }
  state.objective = 'Mission failed — return to the marker to retry.';
}

export function updateMissions(state, dt, scene) {
  const runner = state.missions;
  if (runner.messageT > 0) runner.messageT -= dt;
  if (!runner.active) return;
  const def = runner.active;
  const p = state.player;
  const atTarget = dist2(p.x, p.z, def.target.x, def.target.z) < 20 * 20;
  const atDest = dist2(p.x, p.z, def.dest.x, def.dest.z) < 22 * 22;
  runner.timer += dt;

  if (runner.marker) {
    const arrow = runner.marker.getObjectByName('arrow');
    if (arrow) arrow.position.y = 8 + Math.sin(state.time * 3) * 1.2;
    runner.marker.rotation.y += dt * 0.8;
  }

  switch (runner.phase) {
    case 'go':
      state.objective = `${def.title}: reach the marker (${Math.round(Math.hypot(p.x - def.target.x, p.z - def.target.z))}m)`;
      if (atTarget) {
        if (def.type === 'survive') {
          runner.phase = 'survive';
          setMessage(state, 'SURVIVE: lose the cops for 2 minutes!', 5);
          state.police.wanted = 5;
        } else if (def.type === 'shootout' || def.type === 'ram' || def.type === 'heist') {
          runner.phase = 'fight';
          setMessage(state, def.type === 'shootout' ? 'Clear the crew — 6 hostiles!' : def.type === 'ram' ? 'Ram the tow trucks off the road!' : 'Take the case from the convoy!', 5);
        } else if (def.type === 'tail') {
          runner.phase = 'tail';
          setMessage(state, 'Tail the courier — stay close, stay unseen.', 5);
        } else if (def.type === 'vault') {
          runner.phase = 'crack';
          runner.timer = 0;
          setMessage(state, 'Cracking the vault — 90 seconds before the cameras wake up!', 5);
        } else {
          runner.phase = 'deliver';
          if (runner.marker) runner.marker.position.set(def.dest.x, 0, def.dest.z);
          setMessage(state, 'Got it. Now deliver it — fast and quiet.', 4);
        }
      }
      break;
    case 'tail': {
      const d = Math.hypot(p.x - def.target.x, p.z - def.target.z);
      state.objective = `${def.title}: stay on the courier (${Math.round(d)}m) — don't get spotted`;
      if (d < 8) { failMission(state, scene, 'spotted by the courier'); break; }
      if (d > 90) { failMission(state, scene, 'lost the courier'); break; }
      if (runner.timer > 45) {
        runner.phase = 'deliver';
        if (runner.marker) runner.marker.position.set(def.dest.x, 0, def.dest.z);
        setMessage(state, 'Ledger location confirmed. Get to the drop.', 4);
      }
      break;
    }
    case 'crack':
      state.objective = `${def.title}: cracking the vault (${Math.max(0, 90 - Math.round(runner.timer))}s left)`;
      if (runner.timer > 90) { failMission(state, scene, 'the cameras woke up'); break; }
      if (runner.timer > 12) {
        runner.phase = 'deliver';
        if (runner.marker) runner.marker.position.set(def.dest.x, 0, def.dest.z);
        state.police.wanted = 4;
        setMessage(state, 'Ledger secured! Every cop in Solmar is coming — RUN.', 5);
      }
      break;
    case 'survive':
      state.objective = `${def.title}: survive the heat (${Math.max(0, def.survive - Math.round(runner.timer))}s)`;
      if (runner.timer > def.survive) {
        runner.phase = 'deliver';
        if (runner.marker) runner.marker.position.set(def.dest.x, 0, def.dest.z);
        setMessage(state, 'You broke the line! Get to the harbor tunnel.', 5);
      }
      break;
    case 'fight':
      state.objective = `${def.title}: hostiles left ${runner.targetsLeft}`;
      if (runner.targetsLeft <= 0) {
        runner.phase = 'deliver';
        if (runner.marker) runner.marker.position.set(def.dest.x, 0, def.dest.z);
        setMessage(state, 'Done. Now get to the drop before backup arrives.', 4);
      }
      break;
    case 'protect':
      state.objective = `${def.title}: keep the informant alive`;
      if (runner.timer > 30) {
        runner.phase = 'deliver';
        if (runner.marker) runner.marker.position.set(def.dest.x, 0, def.dest.z);
        setMessage(state, 'Informant safe. Move him to the safehouse.', 4);
      }
      break;
    case 'deliver':
      state.objective = `${def.title}: deliver to the marker (${Math.round(Math.hypot(p.x - def.dest.x, p.z - def.dest.z))}m)`;
      if (atDest) completeMission(state, scene);
      break;
    default:
      break;
  }
}
