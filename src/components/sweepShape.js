import * as THREE from "three";
import { scene, renderer, camera } from "../App.vue";

const SWEEP_SHAPE = "sweep-shape";
let pendingPath = undefined;

function getStrokeWorldPoints(strokeObject) {
  strokeObject.updateMatrixWorld(true);
  const source = strokeObject.geometry.points || strokeObject.geometry.attributes.position.array;
  const points = [];

  for (let i = 0; i < source.length; i += 3) {
    points.push(
      new THREE.Vector3(source[i], source[i + 1], source[i + 2]).applyMatrix4(
        strokeObject.matrixWorld
      )
    );
  }

  return points;
}

function simplifyPoints(points, minDistance = 0.03) {
  const simplified = [];

  points.forEach((point) => {
    const previous = simplified[simplified.length - 1];
    if (!previous || previous.distanceTo(point) >= minDistance) {
      simplified.push(point);
    }
  });

  return simplified;
}

function buildSweepGeometry(pathPoints, profilePoints) {
  const path = simplifyPoints(pathPoints, 0.05);
  let profile = simplifyPoints(profilePoints, 0.03);

  if (path.length < 2 || profile.length < 3) return undefined;

  const pathEnd = path[path.length - 1];
  const shouldClose =
    profile[0].distanceTo(profile[profile.length - 1]) < 0.2;

  if (shouldClose) {
    profile = profile.slice(0, -1);
  }

  if (profile.length < 3) return undefined;

  const positions = [];
  const indices = [];

  path.forEach((pathPoint) => {
    profile.forEach((profilePoint) => {
      const point = profilePoint.clone().sub(pathEnd).add(pathPoint);
      positions.push(point.x, point.y, point.z);
    });
  });

  for (let i = 0; i < path.length - 1; i++) {
    for (let j = 0; j < profile.length; j++) {
      const nextJ = shouldClose ? (j + 1) % profile.length : j + 1;
      if (!shouldClose && nextJ >= profile.length) continue;

      const a = i * profile.length + j;
      const b = i * profile.length + nextJ;
      const c = (i + 1) * profile.length + j;
      const d = (i + 1) * profile.length + nextJ;

      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return geometry;
}

export function clearSweepShapeState() {
  pendingPath = undefined;
}

export function clearSweepShapeMeshes() {
  clearSweepShapeState();

  scene.children
    .filter((object) => object.userData.kind === "sweepShape")
    .forEach((object) => {
      scene.remove(object);
      object.geometry?.dispose();
      object.material?.dispose();
    });
}

export function deleteSweepMeshesForStroke(strokeUuid) {
  scene.children
    .filter(
      (object) =>
        object.userData.kind === "sweepShape" &&
        (object.userData.pathUuid === strokeUuid ||
          object.userData.profileUuid === strokeUuid)
    )
    .forEach((object) => {
      scene.remove(object);
      object.geometry?.dispose();
      object.material?.dispose();
    });

  if (pendingPath?.uuid === strokeUuid) {
    pendingPath = undefined;
  }
}

export function registerSweepStroke(strokeObject) {
  if (strokeObject.userData.canvas?.shape !== SWEEP_SHAPE) return;

  if (!pendingPath || !scene.getObjectByProperty("uuid", pendingPath.uuid)) {
    pendingPath = strokeObject;
    strokeObject.userData.sweepShape = { role: "path" };
    return;
  }

  const path = pendingPath;
  const profile = strokeObject;
  const geometry = buildSweepGeometry(
    getStrokeWorldPoints(path),
    getStrokeWorldPoints(profile)
  );

  profile.userData.sweepShape = { role: "profile", pathUuid: path.uuid };
  pendingPath = undefined;

  if (!geometry) return;

  const material = new THREE.MeshStandardMaterial({
    color: profile.userData.stroke?.color || 0x4f8cff,
    transparent: true,
    opacity: 0.28,
    side: THREE.DoubleSide,
    depthWrite: false,
    roughness: 0.55,
    metalness: 0,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.kind = "sweepShape";
  mesh.userData.pathUuid = path.uuid;
  mesh.userData.profileUuid = profile.uuid;
  mesh.renderOrder = 1;
  scene.add(mesh);
  renderer.render(scene, camera);
}

export { SWEEP_SHAPE };
