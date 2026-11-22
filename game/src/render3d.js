// The 3D view: three.js renderer, a low sunset sun, warm fog, and a chase
// camera that trails the player or their car, with a drag-orbit offset and a
// subtle speed shake. Draws the world the systems own; owns no rules.
import { PALETTE } from './config.js';
import { clamp, angleLerp } from './util.js';

export function createView(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x2b3a6e);
  scene.fog = new THREE.Fog(PALETTE.fog, 220, 900);

  const hemi = new THREE.HemisphereLight(0xffc98a, 0x2a2f45, 0.75);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(PALETTE.sun, 1.6);
  sun.position.set(-260, 150, 420);
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x6a7bd8, 0.5);
  fill.position.set(200, 120, -300);
  scene.add(fill);

  const camera = new THREE.PerspectiveCamera(62, 1, 0.5, 2200);
  let camHeading = 0;

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  // A big gradient sky dome: dusk orange at the horizon, deep blue above.
  const skyGeo = new THREE.SphereGeometry(1500, 24, 12);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color(0x1d2a55) }, bottom: { value: new THREE.Color(0xff8a4a) } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec3 vP; uniform vec3 top; uniform vec3 bottom; void main(){ float t = clamp(normalize(vP).y * 1.6 + 0.25, 0.0, 1.0); gl_FragColor = vec4(mix(bottom, top, t), 1.0); }',
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);

  // The setting sun itself, a glowing disc low over the ocean.
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(55, 32),
    new THREE.MeshBasicMaterial({ color: 0xffe9b0, fog: false }));
  sunDisc.position.set(-140, 120, 1050);
  sunDisc.lookAt(0, 60, 0);
  scene.add(sunDisc);

  function render(state, dt) {
    const p = state.player;
    const targetHeading = state.playerCar ? state.playerCar.heading : p.heading;
    camHeading = angleLerp(camHeading, targetHeading + state.camYaw * 0.15, clamp(3 * dt, 0, 1));
    const dist = state.shotCam ? 19 : (state.playerCar ? 13 : 9);
    const height = state.shotCam ? 8.5 : (state.playerCar ? 5.2 : 4.2);
    const shake = state.playerCar ? Math.min(0.35, Math.abs(state.playerCar.speed) * 0.004) : 0;
    const cx = p.x - Math.sin(camHeading) * dist;
    const cz = p.z - Math.cos(camHeading) * dist;
    camera.position.set(
      cx + (Math.random() - 0.5) * shake,
      height + (Math.random() - 0.5) * shake,
      cz);
    camera.lookAt(p.x + Math.sin(camHeading) * 8, 2.2 + (state.camLift || 0), p.z + Math.cos(camHeading) * 8);
    // Sun follows the player so the sky never ends.
    sky.position.set(p.x, 0, p.z);
    sunDisc.position.set(p.x - 140, 120, p.z + 1050);
    sun.position.set(p.x - 260, 150, p.z + 420);
    sun.target.position.set(p.x, 0, p.z);
    scene.add(sun.target);
    renderer.render(scene, camera);
  }
  return { scene, render, resize, snap(h) { camHeading = h; } };
}
