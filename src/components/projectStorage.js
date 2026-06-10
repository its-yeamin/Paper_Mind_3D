import * as THREE from "three";
import { scene, renderer, camera } from "../App.vue";
import { draw } from "./draw.js";
import { createImagePlane, disposeImagePlane } from "./imagePlane.js";

const DB_NAME = "penzil-projects";
const DB_VERSION = 1;
const STORE_NAME = "projects";
const CURRENT_PROJECT_ID = "current";
const PROJECT_VERSION = 3;

let autosaveTimer;
let restoringProject = false;

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("IndexedDB is not available"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function runTransaction(mode, callback) {
  return openDatabase().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        const request = callback(store);

        transaction.oncomplete = () => {
          db.close();
          resolve(request ? request.result : undefined);
        };
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
      })
  );
}

function serializeVector(vector) {
  return {
    x: vector.x,
    y: vector.y,
    z: vector.z,
  };
}

function serializeQuaternion(quaternion) {
  return {
    x: quaternion.x,
    y: quaternion.y,
    z: quaternion.z,
    w: quaternion.w,
  };
}

function serializeMatrix(matrix) {
  return matrix.elements.slice();
}

function deserializeVector(value) {
  return new THREE.Vector3(value?.x || 0, value?.y || 0, value?.z || 0);
}

function deserializeQuaternion(value) {
  return new THREE.Quaternion(
    value?.x ?? value?._x ?? 0,
    value?.y ?? value?._y ?? 0,
    value?.z ?? value?._z ?? 0,
    value?.w ?? value?._w ?? 1
  );
}

function deserializeMatrix(value) {
  const matrix = new THREE.Matrix4();

  if (Array.isArray(value)) {
    matrix.fromArray(value);
  } else if (value?.elements) {
    matrix.fromArray(value.elements);
  }

  return matrix;
}

function serializeStrokeObject(obj) {
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();

  obj.getWorldPosition(position);
  obj.getWorldQuaternion(quaternion);
  obj.getWorldScale(scale);

  return {
    vertices: Array.from(obj.geometry.points),
    stroke: obj.userData.stroke,
    fill: obj.userData.fill,
    mirrorOn: false,
    position: serializeVector(position),
    quaternion: serializeQuaternion(quaternion),
    scale: serializeVector(scale),
    matrix: serializeMatrix(obj.matrix),
    canvas: obj.userData.canvas
      ? {
          shape: obj.userData.canvas.shape,
          position: serializeVector(obj.userData.canvas.position),
          quaternion: serializeQuaternion(obj.userData.canvas.quaternion),
          scale: serializeVector(obj.userData.canvas.scale),
        }
      : undefined,
  };
}

function serializeImageObject(obj) {
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();

  obj.getWorldPosition(position);
  obj.getWorldQuaternion(quaternion);
  obj.getWorldScale(scale);

  return {
    src: obj.userData.image.src,
    width: obj.userData.image.width,
    height: obj.userData.image.height,
    scalePercent: obj.userData.image.scalePercent || 100,
    position: serializeVector(position),
    quaternion: serializeQuaternion(quaternion),
    scale: serializeVector(scale),
    canvas: obj.userData.canvas
      ? {
          shape: obj.userData.canvas.shape,
          position: serializeVector(obj.userData.canvas.position),
          quaternion: serializeQuaternion(obj.userData.canvas.quaternion),
          scale: serializeVector(obj.userData.canvas.scale),
        }
      : undefined,
  };
}

export function serializeProject() {
  const strokes = [];
  const images = [];

  scene.children.forEach((obj) => {
    if (obj.geometry && obj.geometry.type == "MeshLine" && obj.layers.mask == 2) {
      strokes.push(serializeStrokeObject(obj));
    }

    if (obj.userData.kind === "imagePlane") {
      images.push(serializeImageObject(obj));
    }
  });

  return {
    type: "penzil-project",
    version: PROJECT_VERSION,
    savedAt: new Date().toISOString(),
    strokes,
    images,
  };
}

export function normalizeProject(data) {
  if (Array.isArray(data)) {
    return {
      type: "penzil-project",
      version: 1,
      savedAt: undefined,
      strokes: data,
    };
  }

  return {
    type: data?.type || "penzil-project",
    version: data?.version || 1,
    savedAt: data?.savedAt,
    strokes: Array.isArray(data?.strokes) ? data.strokes : [],
    images: Array.isArray(data?.images) ? data.images : [],
  };
}

export function clearProjectScene() {
  const projectObjects = scene.children.filter(
    (obj) =>
      (obj.geometry && obj.geometry.type == "MeshLine" && obj.layers.mask == 2) ||
      obj.userData.kind === "imagePlane"
  );

  projectObjects.forEach((obj) => {
    if (obj.userData.kind === "imagePlane") {
      disposeImagePlane(obj);
      return;
    }

    scene.remove(obj);

    if (obj.material) {
      obj.material.dispose();
    }

    obj.children.forEach((child) => {
      if (child.material) {
        child.material.dispose();
      }
    });
  });
}

export function restoreProject(data, replace = true) {
  const project = normalizeProject(data);
  restoringProject = true;

  if (replace) {
    clearProjectScene();
  }

  project.strokes.forEach((line) => {
    draw.fromVertices(
      new Float32Array(line.vertices),
      line.stroke,
      line.fill,
      line.mirrorOn,
      null,
      deserializeVector(line.position),
      deserializeQuaternion(line.quaternion),
      deserializeVector(line.scale),
      deserializeMatrix(line.matrix),
      false,
      line.canvas
        ? {
            shape: line.canvas.shape,
            position: deserializeVector(line.canvas.position),
            quaternion: deserializeQuaternion(line.canvas.quaternion),
            scale: deserializeVector(line.canvas.scale),
          }
        : undefined
    );
  });

  project.images.forEach((image) => {
    createImagePlane({
      src: image.src,
      width: image.width,
      height: image.height,
      scalePercent: image.scalePercent || 100,
      position: deserializeVector(image.position),
      quaternion: deserializeQuaternion(image.quaternion),
      scale: deserializeVector(image.scale || { x: 1, y: 1, z: 1 }),
      canvas: image.canvas
        ? {
            shape: image.canvas.shape,
            position: deserializeVector(image.canvas.position),
            quaternion: deserializeQuaternion(image.canvas.quaternion),
            scale: deserializeVector(image.canvas.scale),
          }
        : {
            shape: "plane",
            position: deserializeVector(image.position),
            quaternion: deserializeQuaternion(image.quaternion),
            scale: deserializeVector({ x: 1, y: 1, z: 1 }),
          },
    });
  });

  renderer.render(scene, camera);
  restoringProject = false;
}

export function saveCurrentProject() {
  const project = serializeProject();

  return runTransaction("readwrite", (store) =>
    store.put({
      id: CURRENT_PROJECT_ID,
      updatedAt: project.savedAt,
      project,
    })
  ).catch((error) => {
    console.warn("Could not save project locally", error);
  });
}

export function scheduleAutoSave() {
  if (restoringProject) return;

  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    saveCurrentProject();
  }, 800);
}

export function loadCurrentProject() {
  return runTransaction("readonly", (store) => store.get(CURRENT_PROJECT_ID))
    .then((record) => {
      if (
        record?.project?.strokes?.length > 0 ||
        record?.project?.images?.length > 0
      ) {
        restoreProject(record.project, true);
      }
    })
    .catch((error) => {
      console.warn("Could not load local project", error);
    });
}
