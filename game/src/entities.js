// Vehicle and character meshes: cars built from boxes (body, cabin, wheels,
// lights), pedestrians as capsule figures, the police helicopter. All meshes
// are plain three.js groups so the world can move them without a loader.
export function makeCarMesh(color, isCop) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x1a2a3a });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 4.6), bodyMat);
  body.position.y = 0.65;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.65, 2.2), glassMat);
  cabin.position.set(0, 1.3, -0.2);
  g.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.35, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x14161a });
  g.userData.wheels = [];
  for (const [wx, wz] of [[-1.0, 1.5], [1.0, 1.5], [-1.0, -1.5], [1.0, -1.5]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wx, 0.42, wz);
    g.add(w);
    g.userData.wheels.push(w);
  }
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const wx of [-0.7, 0.7]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.1), lightMat);
    l.position.set(wx, 0.75, 2.32);
    g.add(l);
  }
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xff2a2a });
  for (const wx of [-0.7, 0.7]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.22, 0.1), tailMat);
    l.position.set(wx, 0.75, -2.32);
    g.add(l);
  }
  if (isCop) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.18, 0.5),
      new THREE.MeshBasicMaterial({ color: 0x2244ff }));
    bar.position.set(0, 1.78, -0.2);
    bar.name = 'lightbar';
    g.add(bar);
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.18, 0.5),
      new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    bar2.position.set(0, 1.78, -0.2);
    bar2.visible = false;
    bar2.name = 'lightbar2';
    g.add(bar2);
  }
  return g;
}

export function makePedMesh(color, shirt) {
  const g = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color });
  const cloth = new THREE.MeshLambertMaterial({ color: shirt });
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.8, 0.35),
    new THREE.MeshLambertMaterial({ color: 0x2a2f3a }));
  legs.position.y = 0.4;
  g.add(legs);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.85, 0.4), cloth);
  torso.position.y = 1.2;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 10), skin);
  head.position.y = 1.9;
  g.add(head);
  const armGeo = new THREE.BoxGeometry(0.18, 0.7, 0.18);
  const armL = new THREE.Mesh(armGeo, cloth);
  armL.position.set(-0.45, 1.2, 0);
  g.add(armL);
  const armR = new THREE.Mesh(armGeo, cloth);
  armR.position.set(0.45, 1.2, 0);
  g.add(armR);
  g.userData.armL = armL; g.userData.armR = armR;
  return g;
}

export function makeHeliMesh() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.2, 6.5),
    new THREE.MeshLambertMaterial({ color: 0x1c2a44 }));
  g.add(body);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.2, 2.0),
    new THREE.MeshLambertMaterial({ color: 0x9fd8ff }));
  glass.position.set(0, 0.4, 2.2);
  g.add(glass);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(11, 0.12, 0.7),
    new THREE.MeshLambertMaterial({ color: 0x222222 }));
  rotor.position.y = 1.5;
  rotor.name = 'rotor';
  g.add(rotor);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 5.5),
    new THREE.MeshLambertMaterial({ color: 0x1c2a44 }));
  tail.position.set(0, 0.3, -5.5);
  g.add(tail);
  const spot = new THREE.Mesh(
    new THREE.ConeGeometry(6, 26, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff6c0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
  spot.position.y = -13;
  spot.name = 'spotcone';
  g.add(spot);
  const spotLight = new THREE.SpotLight(0xfff2b0, 2.2, 90, 0.35, 0.5, 1.2);
  spotLight.position.set(0, -1, 0);
  spotLight.target.position.set(0, -30, 0);
  g.add(spotLight);
  g.add(spotLight.target);
  g.userData.rotor = rotor;
  return g;
}

export function makeMarkerMesh(color) {
  const g = new THREE.Group();
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 60, 16, 1, true),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
  beam.position.y = 30;
  g.add(beam);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.4, 3.4, 24),
    new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.25;
  g.add(ring);
  const arrow = new THREE.Mesh(
    new THREE.ConeGeometry(1.1, 2.6, 4),
    new THREE.MeshBasicMaterial({ color }));
  arrow.rotation.x = Math.PI;
  arrow.position.y = 8;
  arrow.name = 'arrow';
  g.add(arrow);
  return g;
}
