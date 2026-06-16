import * as THREE from "three";
import { cameraHomeTarget, scene, renderer, camera } from "../App.vue";
import { draw } from "./draw.js";
import { createImagePlane, disposeImagePlane } from "./imagePlane.js";
import { applyCanvasHomeState, canvas, getCanvasHomeState } from "./Canvas.vue";
import { clearSweepShapeMeshes, clearSweepShapeState } from "./sweepShape.js";

const DB_NAME = "penzil-projects";
const DB_VERSION = 1;
const STORE_NAME = "projects";
const ACTIVE_PROJECT_KEY = "penzil-active-project-id";
const PROJECT_VERSION = 3;
const RECENT_LIMIT = 3;

let autosaveTimer;
let restoringProject = false;
let activeProjectId = window.localStorage.getItem(ACTIVE_PROJECT_KEY);

function createDefaultHomeState() {
  return {
    current: {
      position: new THREE.Vector3(0.001, 0.001, 0.001),
      quaternion: new THREE.Quaternion(0.001, 0.001, 0.001, 1),
      scale: new THREE.Vector3(1, 1, 1),
    },
    default: {
      position: new THREE.Vector3(0.001, 0.001, 0.001),
      quaternion: new THREE.Quaternion(0.001, 0.001, 0.001, 1),
      scale: new THREE.Vector3(1, 1, 1),
    },
  };
}

function resetCanvasAndCameraHome() {
  const home = createDefaultHomeState();
  applyCanvasHomeState(home);

  if (canvas) {
    canvas.position.copy(home.current.position);
    canvas.quaternion.copy(home.current.quaternion);
    canvas.scale.copy(home.current.scale);
    canvas.updateMatrixWorld(true);
  }

  cameraHomeTarget.copy(home.current.position);
  window.dispatchEvent(
    new CustomEvent("penzil-home-restore", {
      detail: {
        center: home.current.position.clone(),
        resetView: true,
      },
    })
  );

  return home;
}

function createProjectId() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return "project-" + Date.now();
}

function normalizeProjectName(name) {
  const trimmed = String(name || "").trim();
  return trimmed || "Untitled";
}

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

function pruneStoredProjects() {
  return openDatabase()
    .then(
      (db) =>
        new Promise((resolve, reject) => {
          const transaction = db.transaction(STORE_NAME, "readwrite");
          const store = transaction.objectStore(STORE_NAME);
          const request = store.getAll();

          request.onsuccess = () => {
            const records = (request.result || []).sort(
              (a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
            );
            records.slice(RECENT_LIMIT).forEach((record) => {
              store.delete(record.id);
            });
          };

          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
          transaction.onerror = () => {
            db.close();
            reject(transaction.error);
          };
        })
    )
    .catch((error) => {
      console.warn("Could not prune old projects", error);
    });
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

function serializeHomeState(home) {
  if (!home?.current) return undefined;

  return {
    current: {
      position: serializeVector(home.current.position),
      quaternion: serializeQuaternion(home.current.quaternion),
      scale: serializeVector(home.current.scale),
    },
    default: home.default
      ? {
          position: serializeVector(home.default.position),
          quaternion: serializeQuaternion(home.default.quaternion),
          scale: serializeVector(home.default.scale),
        }
      : undefined,
  };
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

function deserializeHomeState(home) {
  if (!home?.current) return undefined;

  return {
    current: {
      position: deserializeVector(home.current.position),
      quaternion: deserializeQuaternion(home.current.quaternion),
      scale: deserializeVector(home.current.scale),
    },
    default: home.default
      ? {
          position: deserializeVector(home.default.position),
          quaternion: deserializeQuaternion(home.default.quaternion),
          scale: deserializeVector(home.default.scale),
        }
      : undefined,
  };
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
    home: serializeHomeState(getCanvasHomeState()),
    cameraHome: serializeVector(cameraHomeTarget),
    strokes,
    images,
  };
}

function createEmptyProject(name) {
  return {
    type: "penzil-project",
    version: PROJECT_VERSION,
    name: normalizeProjectName(name),
    savedAt: new Date().toISOString(),
    strokes: [],
    images: [],
  };
}

async function writeProjectToFileHandle(fileHandle, project) {
  if (!fileHandle?.createWritable) return;

  try {
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(project));
    await writable.close();
  } catch (error) {
    console.warn("Could not write project file", error);
  }
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
    name: normalizeProjectName(data?.name),
    savedAt: data?.savedAt,
    home: data?.home,
    cameraHome: data?.cameraHome,
    strokes: Array.isArray(data?.strokes) ? data.strokes : [],
    images: Array.isArray(data?.images) ? data.images : [],
  };
}

export function clearProjectScene() {
  clearSweepShapeMeshes();

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
  clearSweepShapeState();

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

  const home = deserializeHomeState(project.home);
  if (home) {
    applyCanvasHomeState(home);
  }

  const cameraHome = project.cameraHome
    ? deserializeVector(project.cameraHome)
    : home?.current?.position;

  if (cameraHome) {
    window.dispatchEvent(
      new CustomEvent("penzil-home-restore", {
        detail: {
          center: cameraHome,
          resetView: false,
        },
      })
    );
  }

  renderer.render(scene, camera);
  restoringProject = false;
}

export function saveCurrentProject() {
  if (!activeProjectId) {
    activeProjectId = createProjectId();
    window.localStorage.setItem(ACTIVE_PROJECT_KEY, activeProjectId);
  }

  const project = serializeProject();

  return runTransaction("readwrite", (store) => store.get(activeProjectId))
    .then((record) => {
      project.name = normalizeProjectName(record?.name || record?.project?.name);
      const fileHandle = record?.fileHandle;

      return runTransaction("readwrite", (store) =>
        store.put({
          id: activeProjectId,
          name: project.name,
          updatedAt: project.savedAt,
          project,
          fileHandle,
        })
      )
        .then(() => writeProjectToFileHandle(fileHandle, project))
        .then(() => pruneStoredProjects());
    })
    .catch((error) => {
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
  if (!activeProjectId) {
    return Promise.resolve(false);
  }

  return runTransaction("readonly", (store) => store.get(activeProjectId))
    .then((record) => {
      if (record?.project) {
        restoreProject(record.project, true);
        return true;
      }
      return false;
    })
    .catch((error) => {
      console.warn("Could not load local project", error);
      return false;
    });
}

export function listRecentProjects() {
  return runTransaction("readonly", (store) => store.getAll())
    .then((records) =>
      records
        .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
        .slice(0, RECENT_LIMIT)
        .map((record) => ({
          id: record.id,
          name: normalizeProjectName(record.name || record.project?.name),
          updatedAt: record.updatedAt,
        }))
    )
    .catch((error) => {
      console.warn("Could not load recent projects", error);
      return [];
    });
}

export function createNewProject(name, fileHandle) {
  const id = createProjectId();
  const project = createEmptyProject(name);

  restoringProject = true;
  clearProjectScene();
  const home = resetCanvasAndCameraHome();
  project.home = serializeHomeState(home);
  project.cameraHome = serializeVector(home.current.position);
  renderer.render(scene, camera);
  restoringProject = false;

  activeProjectId = id;
  window.localStorage.setItem(ACTIVE_PROJECT_KEY, activeProjectId);

  return runTransaction("readwrite", (store) =>
    store.put({
      id,
      name: project.name,
      updatedAt: project.savedAt,
      project,
      fileHandle,
    })
  )
    .then(() => writeProjectToFileHandle(fileHandle, project))
    .then(() => pruneStoredProjects());
}

export function createProjectFromBackup(data, name) {
  const id = createProjectId();
  const project = normalizeProject(data);
  project.name = normalizeProjectName(name || project.name);
  project.savedAt = new Date().toISOString();

  restoreProject(project, true);

  activeProjectId = id;
  window.localStorage.setItem(ACTIVE_PROJECT_KEY, activeProjectId);

  return runTransaction("readwrite", (store) =>
    store.put({
      id,
      name: project.name,
      updatedAt: project.savedAt,
      project,
      fileHandle: undefined,
    })
  ).then(() => pruneStoredProjects());
}

export function openRecentProject(id) {
  return runTransaction("readonly", (store) => store.get(id)).then((record) => {
    if (!record) return false;

    activeProjectId = id;
    window.localStorage.setItem(ACTIVE_PROJECT_KEY, activeProjectId);
    restoreProject(record.project, true);
    return true;
  });
}

export async function pickProjectFile(name) {
  if (!window.showSaveFilePicker) return undefined;

  try {
    return await window.showSaveFilePicker({
      suggestedName: normalizeProjectName(name) + ".penzil",
      types: [
        {
          description: "Penzil project",
          accept: { "application/json": [".penzil", ".json"] },
        },
      ],
    });
  } catch (error) {
    if (error.name === "AbortError") return undefined;
    throw error;
  }
}

export async function exportProjectWithPicker(project, name) {
  const data = JSON.stringify(project);

  if (window.showSaveFilePicker) {
    const handle = await pickProjectFile(name || project.name || "Untitled");
    if (!handle) return;

    const writable = await handle.createWritable();
    await writable.write(data);
    await writable.close();
    return;
  }

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(data);
  const el = document.createElement("a");
  el.setAttribute("href", dataStr);
  el.setAttribute("download", normalizeProjectName(name || project.name) + ".penzil");
  el.click();
}
