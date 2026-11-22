// Save / load: one localStorage slot. Autosaves after every finished mission
// and on demand (F). Never throws: a private window just keeps the run in memory.
import { SAVE_KEY } from './config.js';

export function blankSave() {
  return {
    cash: 1500, missionsDone: [], crew: ['rio'], garage: ['sedan'],
    standing: { marina: 0, downtown: 0, palms: 0, harbor: 0, dunes: 0 },
    weapons: { pistol: 120, smg: 0, shotgun: 0 }, best: 0, radio: 0,
  };
}
export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return blankSave();
    const data = JSON.parse(raw);
    return Object.assign(blankSave(), data);
  } catch { return blankSave(); }
}
export function writeSave(data) {
  try { window.localStorage.setItem(SAVE_KEY, JSON.stringify(data)); return true; }
  catch { return false; }
}
