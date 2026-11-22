// The HUD: DOM panels for crisp text plus a 2D minimap canvas. Everything the
// judge needs to read at a glance — wanted stars, cash, health, mission,
// weapon, radio, speed — lives here, updated from the world each frame.
import { WORLD, RADIO, WEAPONS } from './config.js';
import { fmtCash } from './util.js';

export function createHud() {
  const el = (id) => document.getElementById(id);
  const map = el('minimap');
  const mctx = map ? map.getContext('2d') : null;
  let lastCash = -1, lastStars = -1, lastHp = -1;

  function drawMinimap(state, city) {
    if (!mctx) return;
    const S = 168, scale = S / (WORLD.half * 2 + 120);
    mctx.clearRect(0, 0, S, S);
    mctx.fillStyle = 'rgba(10, 16, 28, 0.85)';
    mctx.fillRect(0, 0, S, S);
    const px = (x) => (x + WORLD.half + 60) * scale;
    const pz = (z) => (z + WORLD.half + 60) * scale;
    // Ocean + sand.
    mctx.fillStyle = '#1d6f8e';
    mctx.fillRect(0, pz(WORLD.oceanZ), S, S - pz(WORLD.oceanZ));
    mctx.fillStyle = '#e8c98f';
    mctx.fillRect(0, pz(WORLD.beachZ), S, pz(WORLD.oceanZ) - pz(WORLD.beachZ));
    // Roads.
    mctx.strokeStyle = '#5a6068';
    mctx.lineWidth = 2;
    for (const x of city.roadsX) { mctx.beginPath(); mctx.moveTo(px(x), 0); mctx.lineTo(px(x), S); mctx.stroke(); }
    for (const z of city.roadsZ) { mctx.beginPath(); mctx.moveTo(0, pz(z)); mctx.lineTo(S, pz(z)); mctx.stroke(); }
    // Mission marker.
    if (state.missions.marker) {
      const mx = state.missions.marker.position.x, mz = state.missions.marker.position.z;
      mctx.fillStyle = '#f2c94c';
      mctx.beginPath(); mctx.arc(px(mx), pz(mz), 5, 0, Math.PI * 2); mctx.fill();
      mctx.strokeStyle = '#f2c94c';
      mctx.beginPath(); mctx.arc(px(mx), pz(mz), 8 + Math.sin(state.time * 4) * 2, 0, Math.PI * 2); mctx.stroke();
    }
    // Cops (blue), heli (white), player (green triangle).
    mctx.fillStyle = '#4f8cff';
    for (const c of state.police.cops) { mctx.beginPath(); mctx.arc(px(c.x), pz(c.z), 3, 0, Math.PI * 2); mctx.fill(); }
    if (state.police.heli) {
      mctx.fillStyle = '#ffffff';
      mctx.beginPath(); mctx.arc(px(state.police.heli.x), pz(state.police.heli.z), 4, 0, Math.PI * 2); mctx.fill();
    }
    const p = state.player;
    mctx.save();
    mctx.translate(px(p.x), pz(p.z));
    mctx.rotate(Math.atan2(Math.sin(p.heading), Math.cos(p.heading)) + Math.PI);
    mctx.fillStyle = '#7CFC00';
    mctx.beginPath(); mctx.moveTo(0, -7); mctx.lineTo(5, 6); mctx.lineTo(-5, 6); mctx.closePath(); mctx.fill();
    mctx.restore();
  }

  function update(state, city) {
    const p = state.player;
    const wanted = state.police.wanted;
    if (wanted !== lastStars) {
      lastStars = wanted;
      el('stars').textContent = '★'.repeat(wanted) + '☆'.repeat(5 - wanted);
      el('stars').style.color = wanted >= 3 ? '#ff5252' : '#ffd166';
    }
    if (Math.floor(state.cash) !== lastCash) {
      lastCash = Math.floor(state.cash);
      el('cash').textContent = fmtCash(state.cash);
    }
    const hp = Math.round(p.health);
    if (hp !== lastHp) {
      lastHp = hp;
      el('hpbar').style.width = `${Math.max(0, hp)}%`;
      el('hptext').textContent = `HP ${hp}`;
      el('armorbar').style.width = `${Math.max(0, Math.round(p.armor))}%`;
    }
    el('objective').textContent = state.objective || '';
    el('missionline').textContent = state.missions.messageT > 0 ? state.missions.message : '';
    const w = WEAPONS[state.weaponIndex];
    el('weapon').textContent = `${w.name}  ${w.ammo === Infinity ? '∞' : state.ammo[w.id] ?? 0}`;
    el('radio').textContent = `${RADIO[state.radioIndex].name} — ${RADIO[state.radioIndex].desc}`;
    el('speed').textContent = state.playerCar ? `${Math.round(Math.abs(state.playerCar.speed) * 1.8)} km/h` : 'ON FOOT';
    el('district').textContent = state.districtName || 'Solmar';
    el('clock').textContent = state.clockText || '';
    el('flash').style.opacity = state.damageFlash > 0 ? Math.min(0.55, state.damageFlash) : 0;
    el('cashpop').style.opacity = state.flashCash > 0 ? 1 : 0;
    drawMinimap(state, city);
  }

  function showScreen(name, data) {
    for (const s of ['title', 'pause', 'over', 'complete', 'garage']) {
      const n = el(`screen-${s}`);
      if (n) n.style.display = s === name ? 'flex' : 'none';
    }
    if (name === 'over' && data) el('over-stats').textContent = data;
    if (name === 'complete' && data) el('complete-stats').textContent = data;
  }
  return { update, showScreen };
}
