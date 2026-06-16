import * as THREE from "three";
import { scene, renderer, camera } from "../App.vue";
import { MeshLine, MeshLineMaterial } from "meshline";

const SWEEP_SHAPE = "sweep-shape";
const SWEEP_CONE = "sweep-cone";
const SWEEP_VARIABLE = "sweep-variable";
let pendingPath = undefined;
let pendingControl = undefined;

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

function getTaperScale(pathIndex, pathLength, taper) {
  if (!taper) return 1;
  if (pathLength <= 1) return 1;

  return Math.max(0.03, pathIndex / (pathLength - 1));
}

function samplePoint(points, index, targetLength) {
  if (points.length === 0) return undefined;
  if (targetLength <= 1 || points.length === 1) return points[0];

  const sourceIndex = Math.round((index / (targetLength - 1)) * (points.length - 1));
  return points[Math.min(points.length - 1, Math.max(0, sourceIndex))];
}

function getVariableScale(pathPoint, pathIndex, pathLength, control, maxDistance) {
  if (!control || maxDistance <= 0.0001) return 1;

  const controlPoint = samplePoint(control, pathIndex, pathLength);
  if (!controlPoint) return 1;

  return THREE.MathUtils.clamp(pathPoint.distanceTo(controlPoint) / maxDistance, 0.03, 2.5);
}

function getSweptPoint(sweep, profilePoint, pathPoint, pathIndex) {
  const taperScale = getTaperScale(pathIndex, sweep.path.length, sweep.taper);
  const variableScale = getVariableScale(
    pathPoint,
    pathIndex,
    sweep.path.length,
    sweep.control,
    sweep.maxControlDistance
  );
  const scale = taperScale * variableScale;
  return profilePoint
    .clone()
    .sub(sweep.pathEnd)
    .multiplyScalar(scale)
    .add(pathPoint);
}

function getMaxControlDistance(path, control) {
  if (!control) return 1;

  let maxDistance = 0;
  path.forEach((pathPoint, index) => {
    const controlPoint = samplePoint(control, index, path.length);
    if (controlPoint) {
      maxDistance = Math.max(maxDistance, pathPoint.distanceTo(controlPoint));
    }
  });

  return maxDistance || 1;
}

function buildSweepGeometry(pathPoints, profilePoints, options = {}) {
  const path = simplifyPoints(pathPoints, 0.05);
  const control = options.controlPoints
    ? simplifyPoints(options.controlPoints, 0.05)
    : undefined;
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
  const sweep = {
    path,
    profile,
    pathEnd,
    shouldClose,
    taper: options.taper === true,
    control,
    maxControlDistance: getMaxControlDistance(path, control),
  };

  path.forEach((pathPoint, pathIndex) => {
    profile.forEach((profilePoint) => {
      const point = getSweptPoint(sweep, profilePoint, pathPoint, pathIndex);
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

  return {
    ...sweep,
    geometry,
  };
}

function disposeSweepObject(object) {
  object.traverse?.((child) => {
    child.geometry?.dispose();
    child.material?.dispose();
  });

  object.geometry?.dispose();
  object.material?.dispose();
}

function sampleIndexes(length, maxCount) {
  if (length <= maxCount) {
    return Array.from({ length }, (_, index) => index);
  }

  const indexes = [];
  const step = (length - 1) / (maxCount - 1);

  for (let i = 0; i < maxCount; i++) {
    indexes.push(Math.round(i * step));
  }

  return Array.from(new Set(indexes));
}

function createStrokeMesh(points, color, lineWidth) {
  const line = new MeshLine();
  const vertices = [];

  points.forEach((point) => {
    vertices.push(point.x, point.y, point.z);
  });

  line.setPoints(vertices);

  const material = new MeshLineMaterial({
    lineWidth,
    sizeAttenuation: 1,
    color,
    side: THREE.DoubleSide,
    depthTest: false,
    depthWrite: false,
    transparent: false,
    opacity: 1,
  });

  const mesh = new THREE.Mesh(line, material);
  mesh.renderOrder = 2;
  mesh.layers.set(1);
  return mesh;
}

function createSweepStrokeGroup(sweep, strokeStyle) {
  const group = new THREE.Group();
  const color = new THREE.Color(strokeStyle?.color || 0x4f8cff);
  const lineWidth = Math.max(0.005, strokeStyle?.lineWidth || 0.02);
  const ringIndexes = sampleIndexes(sweep.path.length, 14);
  const railIndexes = sampleIndexes(sweep.profile.length, 14);

  ringIndexes.forEach((pathIndex) => {
    const pathPoint = sweep.path[pathIndex];
    const ring = sweep.profile.map((profilePoint) =>
      getSweptPoint(sweep, profilePoint, pathPoint, pathIndex)
    );

    if (sweep.shouldClose) {
      ring.push(ring[0].clone());
    }

    group.add(createStrokeMesh(ring, color, lineWidth));
  });

  railIndexes.forEach((profileIndex) => {
    const profilePoint = sweep.profile[profileIndex];
    const rail = sweep.path.map((pathPoint, pathIndex) =>
      getSweptPoint(sweep, profilePoint, pathPoint, pathIndex)
    );

    group.add(createStrokeMesh(rail, color, lineWidth));
  });

  const surfaceMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.08,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const surface = new THREE.Mesh(sweep.geometry, surfaceMaterial);
  surface.renderOrder = 1;
  surface.layers.set(1);
  group.add(surface);

  return group;
}

function hideGuideStroke(strokeObject) {
  strokeObject.visible = false;
  strokeObject.userData.sweepShape = {
    ...strokeObject.userData.sweepShape,
    hiddenGuide: true,
  };
}

export function clearSweepShapeState() {
  pendingPath = undefined;
  pendingControl = undefined;
}

export function clearSweepShapeMeshes() {
  clearSweepShapeState();

  scene.children
    .filter((object) => object.userData.kind === "sweepShape")
    .forEach((object) => {
      scene.remove(object);
      disposeSweepObject(object);
    });
}

export function deleteSweepMeshesForStroke(strokeUuid) {
  scene.children
    .filter(
      (object) =>
        object.userData.kind === "sweepShape" &&
        (object.userData.pathUuid === strokeUuid ||
          object.userData.controlUuid === strokeUuid ||
          object.userData.profileUuid === strokeUuid)
    )
    .forEach((object) => {
      scene.remove(object);
      disposeSweepObject(object);
    });

  if (pendingPath?.uuid === strokeUuid) {
    pendingPath = undefined;
  }

  if (pendingControl?.uuid === strokeUuid) {
    pendingControl = undefined;
  }
}

export function registerSweepStroke(strokeObject) {
  const shape = strokeObject.userData.canvas?.shape;
  const isSweepShape =
    shape === SWEEP_SHAPE || shape === SWEEP_CONE || shape === SWEEP_VARIABLE;
  if (!isSweepShape) return;

  if (!pendingPath || !scene.getObjectByProperty("uuid", pendingPath.uuid)) {
    pendingPath = strokeObject;
    pendingControl = undefined;
    strokeObject.userData.sweepShape = { role: "path" };
    return;
  }

  if (shape === SWEEP_VARIABLE && !pendingControl) {
    pendingControl = strokeObject;
    strokeObject.userData.sweepShape = {
      role: "control",
      pathUuid: pendingPath.uuid,
    };
    return;
  }

  const path = pendingPath;
  const control = pendingControl;
  const profile = strokeObject;
  const sweep = buildSweepGeometry(
    getStrokeWorldPoints(path),
    getStrokeWorldPoints(profile),
    {
      taper: shape === SWEEP_CONE,
      controlPoints: control ? getStrokeWorldPoints(control) : undefined,
    }
  );

  profile.userData.sweepShape = {
    role: "profile",
    pathUuid: path.uuid,
    controlUuid: control?.uuid,
  };
  pendingPath = undefined;
  pendingControl = undefined;

  if (!sweep) return;

  const group = createSweepStrokeGroup(sweep, profile.userData.stroke);
  group.userData.kind = "sweepShape";
  group.userData.pathUuid = path.uuid;
  group.userData.controlUuid = control?.uuid;
  group.userData.profileUuid = profile.uuid;
  scene.add(group);
  hideGuideStroke(path);
  if (control) {
    hideGuideStroke(control);
  }
  hideGuideStroke(profile);
  renderer.render(scene, camera);
}

export { SWEEP_CONE, SWEEP_SHAPE, SWEEP_VARIABLE };
