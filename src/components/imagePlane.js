import * as THREE from "three";
import { scene, renderer, camera } from "../App.vue";

const loader = new THREE.TextureLoader();

function cloneVector(value) {
  return new THREE.Vector3(value.x, value.y, value.z);
}

function cloneQuaternion(value) {
  return new THREE.Quaternion(
    value.x ?? value._x ?? 0,
    value.y ?? value._y ?? 0,
    value.z ?? value._z ?? 0,
    value.w ?? value._w ?? 1
  );
}

export function createImagePlane(options) {
  const texture = loader.load(options.src, () => {
    renderer.render(scene, camera);
  });
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const geometry = new THREE.PlaneGeometry(options.width, options.height);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: options.opacity ?? 1,
    side: THREE.DoubleSide,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });
  const mesh = new THREE.Mesh(geometry, material);

  mesh.position.copy(cloneVector(options.position));
  mesh.quaternion.copy(cloneQuaternion(options.quaternion));
  mesh.scale.copy(cloneVector(options.scale || { x: 1, y: 1, z: 1 }));
  mesh.renderOrder = 0;
  mesh.layers.set(1);
  mesh.userData.kind = "imagePlane";
  mesh.userData.image = {
    src: options.src,
    width: options.width,
    height: options.height,
    scalePercent: options.scalePercent || 100,
  };
  mesh.userData.canvas = {
    shape: options.canvas.shape,
    position: cloneVector(options.canvas.position),
    quaternion: cloneQuaternion(options.canvas.quaternion),
    scale: cloneVector(options.canvas.scale),
  };

  scene.add(mesh);
  renderer.render(scene, camera);

  return mesh;
}

export function disposeImagePlane(mesh) {
  scene.remove(mesh);

  if (mesh.material?.map) {
    mesh.material.map.dispose();
  }

  if (mesh.material) {
    mesh.material.dispose();
  }

  if (mesh.geometry) {
    mesh.geometry.dispose();
  }
}
