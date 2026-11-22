// Crew, garage and district standing: the meta layer. Crew members are hired
// with cash and their perks change the rules; the garage holds the cars you
// own and lets you switch your ride; standing opens cheaper prices.
import { CREW, GARAGE_CARS, DISTRICTS } from './config.js';

export function crewList(save) {
  return CREW.map((c) => ({ ...c, hired: save.crew.includes(c.id), cost: c.id === 'rio' ? 0 : 8000 }));
}
export function hireCrew(save, id) {
  const c = CREW.find((x) => x.id === id);
  if (!c || save.crew.includes(id)) return false;
  const cost = id === 'rio' ? 0 : 8000;
  if (save.cash < cost) return false;
  save.cash -= cost;
  save.crew.push(id);
  return true;
}
export function garageList(save) {
  return GARAGE_CARS.map((c) => ({ ...c, owned: save.garage.includes(c.id) }));
}
export function buyCar(save, id) {
  const c = GARAGE_CARS.find((x) => x.id === id);
  if (!c || save.garage.includes(id)) return false;
  const fixer = save.crew.includes('lena');
  const price = Math.round(c.price * (fixer ? 0.75 : 1));
  if (save.cash < price) return false;
  save.cash -= price;
  save.garage.push(id);
  return true;
}
export function districtStanding(save) {
  return DISTRICTS.map((d) => ({ ...d, standing: save.standing[d.id] || 0 }));
}
export function standingLabel(v) {
  if (v >= 70) return 'Legend';
  if (v >= 40) return 'Respected';
  if (v >= 15) return 'Known';
  return 'Nobody';
}
