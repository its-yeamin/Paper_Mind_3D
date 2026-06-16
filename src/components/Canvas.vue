
<template>
  <div
    class="canvasSettings"
    v-bind:style="[
      shapeSelectionVisibility === true ? 'z-index: 10' : '',
      selectedTool != 'draw' ? 'display: none' : '',
    ]"
  >
    <span
      class="canvas-button"
      id="canvasShapeDropdown"
      @click="toggleShapeSelectionVisibility()"
      v-bind:class="[!visible ? 'disabled' : '']"
      title="Canvas shape"
    >
      <span class="icon-and-label" v-if="shape === 'plane'"
        ><img
          src="@/assets/icons/Canvas-Plane.svg"
          alt="Plane shape selected"
        /></span
      >
      <span class="icon-and-label" v-if="shape === 'cube'"
        ><img
          src="@/assets/icons/Canvas-Cube.svg"
          alt="Cube shape selected"
        /></span
      >
      <span class="icon-and-label" v-if="shape === 'cylinder'"
        ><img
          src="@/assets/icons/Canvas-Cylinder.svg"
          alt="Cylinder shape selected"
        /></span
      >
      <span class="icon-and-label" v-if="shape === 'sphere'"
        ><img
          src="@/assets/icons/Canvas-Sphere.svg"
          alt="Sphere shape selected"
        /></span
      >
      <span class="icon-and-label" v-if="shape === 'head'">
        <img
          src="@/assets/icons/Canvas-Head.svg"
          alt="Head shape selected"
        /></span
      >
      <span class="icon-and-label shape-text-icon" v-if="shape === 'sweep-shape'"
        >3D</span
      >
    </span>
    <span
      class="canvas-button transform-mode"
      @click="toggleTransformMode()"
      v-bind:class="[!visible ? 'disabled' : '']"
      v-if="!shapeSelectionVisibility"
      title="Transform mode"
    >
      <span
        class="icon-and-label"
        v-bind:class="[mode === 'combined' ? 'active' : '']"
        v-if="mode === 'combined'"
      >
        <img src="@/assets/icons/translate.svg" alt="Move mode" />
      </span>
      <span
        class="icon-and-label"
        v-bind:class="[mode === 'scale' ? 'active' : '']"
        v-if="mode === 'scale'"
      >
        <img
          src="@/assets/icons/scale.svg"
          alt="Scale mode"
        />
      </span>
      <span
        class="icon-and-label"
        v-bind:class="[mode === 'rotate' ? 'active' : '']"
        v-if="mode === 'rotate'"
      >
        <span class="mode-letter">R</span>
      </span
      ></span
    >
    <span
      class="canvas-button"
      @click="toggleControls()"
      v-bind:class="[
        !visible ? 'disabled' : '',
        !transformationEnabled ? 'active' : '',
      ]"
      v-if="!shapeSelectionVisibility"
      title="Toggle plane controls"
      ><span
        v-bind:class="[transformationEnabled ? '' : 'hidden']"
        class="icon-and-label"
        ><img
          src="@/assets/icons/lockControls.svg"
          alt="Hide the canvas controls"
        /></span
      >
      <span
        v-bind:class="[!transformationEnabled ? '' : 'hidden']"
        class="icon-and-label"
        ><img
          src="@/assets/icons/unlockControls.svg"
          alt="Show the canvas controls"
        /></span
      >
    </span>
    <span
      class="canvas-button"
      @click="toggleVisibility()"
      v-if="!shapeSelectionVisibility"
      v-bind:class="[!visible ? 'active' : '']"
      title="Show or hide plane"
    >
      <span v-if="visible" class="icon-and-label"
        ><img
          src="@/assets/icons/hideCanvas.svg"
          alt="Hide the canvas controls"
        /></span
      >
      <span v-bind:class="[!visible ? '' : 'hidden']" class="icon-and-label"
        ><img
          src="@/assets/icons/showCanvas.svg"
          alt="Show the canvas controls"
        /></span
      ></span
    >
    <span
      class="canvas-button"
      @click="toggleSnap()"
      v-if="!shapeSelectionVisibility"
      v-bind:class="[!visible ? 'disabled' : '', snap ? 'active' : '']"
      title="Snap"
      ><span v-bind:class="[!snap ? '' : 'hidden']" class="icon-and-label"
        ><img src="@/assets/icons/snapOff.svg" alt="Turn off snap" /></span
      >
      <span v-bind:class="[snap ? '' : 'hidden']" class="icon-and-label">
        <img src="@/assets/icons/snapOn.svg" alt="Turn on snap" /></span
      ></span
    >
    <div
      class="center-row"
      v-if="!shapeSelectionVisibility"
      v-bind:class="[!visible ? 'disabled' : '']"
    >
      <span
        v-bind:class="[transformationResetDisabled ? 'disabled ' : '']"
        class="canvas-button"
        @click="resetTransformation()"
        title="Reset plane to home"
      >
        <img
          src="@/assets/icons/reset.svg"
          alt="Reset canvas position, rotation and scale"
        />
      </span>
      <button
        class="home-button"
        type="button"
        @click="setHomeFromCanvas"
        title="Set current plane as home"
      >
        Set
      </button>
      <button
        class="home-button"
        type="button"
        @click="restoreDefaultHome"
        title="Restore default home"
      >
        0
      </button>
      <button
        class="home-button stroke-plane-button"
        type="button"
        @click="$emit('toggle-stroke-plane-restore')"
        v-bind:class="[strokePlaneRestoreEnabled ? 'active' : '']"
        v-bind:title="
          strokePlaneRestoreEnabled
            ? 'Disable stroke plane restore'
            : 'Enable stroke plane restore'
        "
      >
        <img src="@/assets/icons/Cursor.svg" alt="Stroke plane restore" />
      </button>
    </div>
    <span
      class="canvas-button image-tools"
      v-if="!shapeSelectionVisibility"
      v-bind:class="[!visible ? 'disabled' : '']"
    >
      <span class="image-scale-row">
        <button
          type="button"
          @click="stepSelectedImageScale(10)"
          v-bind:disabled="!selectedImageId"
        >
          +
        </button>
        <button
          class="image-import-button"
          type="button"
          @click="importImage()"
          title="Import image"
        >
          Img
        </button>
        <input
          v-model="selectedImageScaleInput"
          inputmode="numeric"
          v-bind:disabled="!selectedImageId"
          @change="commitSelectedImageScale()"
          @keydown.enter="commitSelectedImageScale()"
          @focus="$event.target.select()"
        />
        <button
          type="button"
          @click="stepSelectedImageScale(-10)"
          v-bind:disabled="!selectedImageId"
        >
          -
        </button>
      </span>
    </span>
    <span
      class="canvas-button rotation-readout"
      v-if="!shapeSelectionVisibility"
      v-bind:class="[!visible ? 'disabled' : '']"
      title="Plane rotation"
    >
      <label>
        <span>X</span>
        <button type="button" @click="stepRotation('x', 5)">+</button>
        <input
          v-model="rotationInput.x"
          inputmode="numeric"
          @change="commitRotationInput('x')"
          @keydown.enter="commitRotationInput('x')"
          @focus="$event.target.select()"
        />
        <button type="button" @click="stepRotation('x', -5)">-</button>
      </label>
      <label>
        <span>Y</span>
        <button type="button" @click="stepRotation('y', 5)">+</button>
        <input
          v-model="rotationInput.y"
          inputmode="numeric"
          @change="commitRotationInput('y')"
          @keydown.enter="commitRotationInput('y')"
          @focus="$event.target.select()"
        />
        <button type="button" @click="stepRotation('y', -5)">-</button>
      </label>
      <label>
        <span>Z</span>
        <button type="button" @click="stepRotation('z', 5)">+</button>
        <input
          v-model="rotationInput.z"
          inputmode="numeric"
          @change="commitRotationInput('z')"
          @keydown.enter="commitRotationInput('z')"
          @focus="$event.target.select()"
        />
        <button type="button" @click="stepRotation('z', -5)">-</button>
      </label>
    </span>
    <!-- <span
      v-bind:class="[!visible ? 'disabled' : '']"
      class="canvas-button"
      @click="restoreTransformation()"
      v-if="!shapeSelectionVisibility"
    >
      <img
        src="@/assets/icons/MagicWand.svg"
        alt="Restore canvas position, rotation and scale"
      />
    </span> -->
    <div
      class="canvasShapeSelection"
      v-bind:class="[shapeSelectionVisibility ? '' : 'hidden']"
    >
      <span @click="setCanvasShape('plane')">
        <input
          type="radio"
          id="shapePlane"
          name="shape"
          value="plane"
          v-model="shape"
        /><label for="plane"
          ><img
            src="@/assets/icons/Canvas-Plane.svg"
            alt="Set the 3d canvas shape to plane"
        /></label>
      </span>
      <span @click="setCanvasShape('cube')">
        <input
          type="radio"
          id="shapeCube"
          name="shape"
          value="cube"
          v-model="shape"
        /><label for="cube"
          ><img
            src="@/assets/icons/Canvas-Cube.svg"
            alt="Set the 3d canvas shape to cube"
        /></label> </span
      ><span @click="setCanvasShape('cylinder')">
        <input
          type="radio"
          id="shapeCylinder"
          name="shape"
          value="cylinder"
          v-model="shape"
        /><label for="cylinder"
          ><img
            src="@/assets/icons/Canvas-Cylinder.svg"
            alt="Set the 3d canvas shape to cylinder"
        /></label> </span
      ><span @click="setCanvasShape('sphere')">
        <input
          type="radio"
          id="shapeSphere"
          name="shape"
          value="sphere"
          v-model="shape" /><label for="sphere"
          ><img
            src="@/assets/icons/Canvas-Sphere.svg"
            alt="Set the 3d canvas shape to shphere" /></label></span
      ><span @click="setCanvasShape('head')">
        <input
          type="radio"
          id="shapeHead"
          name="shape"
          value="head"
          v-model="shape"
        /><label for="head"
          ><img
            src="@/assets/icons/Canvas-Head.svg"
            alt="Set the 3d canvas shape to head"
        /></label>
      </span>
      <span @click="setCanvasShape('sweep-shape')">
        <input
          type="radio"
          id="shapeSweep"
          name="shape"
          value="sweep-shape"
          v-model="shape"
        /><label for="shapeSweep" title="3D stroke shape guide">
          <span class="shape-text-icon">3D</span>
        </label>
      </span>
    </div>
  </div>
  <div
    class="click-outside"
    v-if="shapeSelectionVisibility"
    @click="toggleShapeSelectionVisibility()"
    v-bind:style="[shapeSelectionVisibility ? 'z-index: 9' : '']"
  ></div>
</template>

<script>
import * as THREE from "three";
import { Earcut } from "three/src/extras/Earcut.js";
import { TransformControls } from "./transformControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { scene, renderer, camera, vm } from "../App.vue";
import { createImagePlane } from "./imagePlane.js";
import { draw } from "./draw.js";
import { undoManager, undoRedoComponent } from "./UndoRedo.vue";
import { SWEEP_SHAPE, clearSweepShapeState } from "./sweepShape.js";

export let canvas, controls, currentShape;
let raycaster;
let canvasMirror;
let geometry = new THREE.PlaneGeometry(5, 5);
let headGeometry;
let canvasComponent;

function makeSweepShapeGeometry() {
  const vertical = new THREE.PlaneGeometry(5, 5);
  vertical.rotateX(Math.PI / 2);
  vertical.translate(0, 0, 2.5);

  const top = new THREE.PlaneGeometry(5, 5);
  top.translate(0, 2.5, 5);

  const verticalPosition = vertical.getAttribute("position");
  const topPosition = top.getAttribute("position");
  const verticalIndex = vertical.getIndex().array;
  const topIndex = top.getIndex().array;
  const positions = [];
  const indices = [];

  for (let i = 0; i < verticalPosition.count; i++) {
    positions.push(
      verticalPosition.getX(i),
      verticalPosition.getY(i),
      verticalPosition.getZ(i)
    );
  }

  for (let i = 0; i < topPosition.count; i++) {
    positions.push(topPosition.getX(i), topPosition.getY(i), topPosition.getZ(i));
  }

  verticalIndex.forEach((index) => indices.push(index));
  topIndex.forEach((index) => indices.push(index + verticalPosition.count));

  vertical.dispose();
  top.dispose();

  const sweepGeometry = new THREE.BufferGeometry();
  sweepGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3)
  );
  sweepGeometry.setIndex(indices);
  sweepGeometry.computeVertexNormals();
  sweepGeometry.computeBoundingSphere();

  return sweepGeometry;
}

function cloneHomeTransform(home) {
  return {
    position: home.position.clone(),
    quaternion: home.quaternion.clone(),
    scale: home.scale.clone(),
  };
}

export function getCanvasHomeState() {
  if (!canvasComponent) return undefined;

  return {
    current: cloneHomeTransform({
      position: canvasComponent.startPosition,
      quaternion: canvasComponent.startQuaternion,
      scale: canvasComponent.startScale,
    }),
    default: cloneHomeTransform(canvasComponent.defaultHome),
  };
}

export function applyCanvasHomeState(home) {
  if (!canvasComponent || !home?.current) return;

  canvasComponent.startPosition.copy(home.current.position);
  canvasComponent.startQuaternion.copy(home.current.quaternion);
  canvasComponent.startScale.copy(home.current.scale);

  if (home.default) {
    canvasComponent.defaultHome.position.copy(home.default.position);
    canvasComponent.defaultHome.quaternion.copy(home.default.quaternion);
    canvasComponent.defaultHome.scale.copy(home.default.scale);
  }
}

export default {
  name: "Canvas",
  data() {
    return {
      material: new THREE.MeshToonMaterial({
        color: 0xe6edf5,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: 2.5,
        polygonOffsetUnits: -1,
        depthWrite: false,
        emissive: new THREE.Color("rgb(255,255,255)"),
        emissiveIntensity: 0.3,
        // wireframe: true,
      }),
      startPosition: new THREE.Vector3(0.001, 0.001, 0.001),
      startQuaternion: new THREE.Quaternion(0.001, 0.001, 0.001, 1),
      startScale: new THREE.Vector3(1, 1, 1),
      defaultHome: {
        position: new THREE.Vector3(0.001, 0.001, 0.001),
        quaternion: new THREE.Quaternion(0.001, 0.001, 0.001, 1),
        scale: new THREE.Vector3(1, 1, 1),
      },
      transformationResetDisabled: true,
      transformationEnabled: true,
      visible: true,
      mode: "combined",
      shape: "plane",
      snap: false,
      shapeSelectionVisibility: false,
      restoringTransformation: false,
      rotationDegrees: { x: 0, y: 0, z: 0 },
      rotationInput: { x: "0", y: "0", z: "0" },
      selectedImage: undefined,
      selectedImageId: undefined,
      selectedImageScaleInput: "100%",
    };
  },
  props: {
    selectedShape: String,
    selectedTool: String,
    strokePlaneRestoreEnabled: Boolean,
    mirror: [Boolean, String],
    mouse: Object,
  },
  emits: [
    "selected-canvas-shape",
    "toggle-stroke-plane-restore",
    "set-tool-enabled",
    "set-camera-home",
  ],
  methods: {
    setUp() {
      const material = this.material;
      canvas = new THREE.Mesh(geometry, material);
      scene.add(canvas);
      this.updateRotationReadout();
      controls = new TransformControls(camera, renderer.domElement);
      controls.mode = "combined";
      // controls.scale.set(1.1, 1.1, 1.1);
      controls.addEventListener("change", () => {
        //this is not very elegant but…
        if (vm != undefined) {
          vm.$refs.raycastCanvas.transformationResetDisabled = false;
          vm.$refs.raycastCanvas.updateRotationReadout();
          vm.$refs.raycastCanvas.updateImagePresentation();
        }

        if (canvasMirror !== undefined) {
          var position = new THREE.Vector3();
          canvas.getWorldPosition(position);
          var quaternion = new THREE.Quaternion();
          canvas.getWorldQuaternion(quaternion);
          var scale = new THREE.Vector3();
          canvas.getWorldScale(scale);
          switch (vm.$refs.raycastCanvas.mirror) {
            case "x":
              canvasMirror.position.set(-position.x, position.y, position.z);
              canvasMirror.quaternion.set(
                -quaternion.x,
                quaternion.y,
                quaternion.z,
                -quaternion.w
              );
              canvasMirror.scale.set(-scale.x, scale.y, scale.z);
              canvasMirror.matrixWorldNeedsUpdate = true;
              break;
            case "y":
              canvasMirror.position.set(position.x, -position.y, position.z);
              canvasMirror.quaternion.set(
                quaternion.x,
                -quaternion.y,
                quaternion.z,
                -quaternion.w
              );
              canvasMirror.scale.set(scale.x, -scale.y, scale.z);
              canvasMirror.matrixWorldNeedsUpdate = true;
              break;
            case "z":
              canvasMirror.position.set(position.x, position.y, -position.z);
              canvasMirror.quaternion.set(
                quaternion.x,
                quaternion.y,
                -quaternion.z,
                -quaternion.w
              );
              canvasMirror.scale.set(scale.x, scale.y, -scale.z);
              canvasMirror.matrixWorldNeedsUpdate = true;
              break;
            default:
              return;
          }
        }
        renderer.render(scene, camera);
      });
      controls.enabled = true;
      scene.add(controls);
      controls.attach(canvas);
      renderer.render(scene, camera);
    },
    transformsMatchCanvas(canvasData) {
      if (!canvasData || !canvas) return false;

      let position = new THREE.Vector3();
      let quaternion = new THREE.Quaternion();
      let scale = new THREE.Vector3();
      canvas.getWorldPosition(position);
      canvas.getWorldQuaternion(quaternion);
      canvas.getWorldScale(scale);

      let savedPosition = new THREE.Vector3(
        canvasData.position.x,
        canvasData.position.y,
        canvasData.position.z
      );
      let savedQuaternion = new THREE.Quaternion(
        canvasData.quaternion.x ?? canvasData.quaternion._x,
        canvasData.quaternion.y ?? canvasData.quaternion._y,
        canvasData.quaternion.z ?? canvasData.quaternion._z,
        canvasData.quaternion.w ?? canvasData.quaternion._w
      );
      let savedScale = new THREE.Vector3(
        canvasData.scale.x,
        canvasData.scale.y,
        canvasData.scale.z
      );

      return (
        position.distanceTo(savedPosition) < 0.01 &&
        Math.abs(quaternion.dot(savedQuaternion)) > 0.9999 &&
        scale.distanceTo(savedScale) < 0.01
      );
    },
    updateImagePresentation() {
      if (!scene || !canvas) return;

      scene.children.forEach((object) => {
        if (object.userData.kind !== "imagePlane") return;

        object.material.opacity = 1;
        object.material.depthTest = true;
        object.material.depthWrite = false;
        object.renderOrder = 0;
        object.material.polygonOffsetFactor = -4;
        object.material.polygonOffsetUnits = -4;
        object.material.needsUpdate = true;
      });
    },
    updateRotationReadout() {
      if (!canvas) return;

      let euler = new THREE.Euler().setFromQuaternion(
        canvas.quaternion,
        "XYZ"
      );

      this.rotationDegrees = {
        x: Math.round(THREE.MathUtils.radToDeg(euler.x)),
        y: Math.round(THREE.MathUtils.radToDeg(euler.y)),
        z: Math.round(THREE.MathUtils.radToDeg(euler.z)),
      };
      this.rotationInput = {
        x: String(this.rotationDegrees.x),
        y: String(this.rotationDegrees.y),
        z: String(this.rotationDegrees.z),
      };
    },
    commitRotationInput(axis) {
      let value = parseFloat(this.rotationInput[axis]);

      if (Number.isNaN(value)) {
        this.updateRotationReadout();
        return;
      }

      this.rotationDegrees[axis] = Math.round(value);

      let euler = new THREE.Euler(
        THREE.MathUtils.degToRad(this.rotationDegrees.x),
        THREE.MathUtils.degToRad(this.rotationDegrees.y),
        THREE.MathUtils.degToRad(this.rotationDegrees.z),
        "XYZ"
      );

      canvas.quaternion.setFromEuler(euler);
      canvas.updateMatrixWorld(true);
      this.transformationResetDisabled = false;
      this.updateRotationReadout();
      renderer.render(scene, camera);
    },
    stepRotation(axis, amount) {
      this.rotationDegrees[axis] += amount;
      this.rotationInput[axis] = String(this.rotationDegrees[axis]);
      this.commitRotationInput(axis);
    },
    getCurrentCanvasData() {
      let position = new THREE.Vector3();
      canvas.getWorldPosition(position);
      let quaternion = new THREE.Quaternion();
      canvas.getWorldQuaternion(quaternion);
      let scale = new THREE.Vector3();
      canvas.getWorldScale(scale);

      return {
        shape: currentShape,
        position,
        quaternion,
        scale,
      };
    },
    importImage() {
      let input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.style.display = "none";
      document.body.appendChild(input);

      input.onchange = (event) => {
        let file = event.target.files[0];
        if (!file) return;

        let reader = new FileReader();
        reader.onload = (readerEvent) => {
          let image = new Image();
          image.onload = () => {
            let maxSize = 5;
            let aspect = image.width / image.height;
            let width = aspect >= 1 ? maxSize : maxSize * aspect;
            let height = aspect >= 1 ? maxSize / aspect : maxSize;
            let canvasData = this.getCurrentCanvasData();
            let mesh = createImagePlane({
              src: readerEvent.target.result,
              width,
              height,
              position: canvasData.position,
              quaternion: canvasData.quaternion,
              scale: canvasData.scale,
              canvas: canvasData,
            });

            this.selectImage(mesh);
            this.updateImagePresentation();
            window.dispatchEvent(new CustomEvent("penzil-project-change"));
          };
          image.src = readerEvent.target.result;
        };
        reader.readAsDataURL(file);
        document.body.removeChild(input);
      };

      input.click();
    },
    selectImage(image) {
      this.selectedImage = image;
      this.selectedImageId = image?.uuid;
      this.selectedImageScaleInput = image
        ? (image.userData.image.scalePercent || 100) + "%"
        : "100%";
    },
    getSelectedImage() {
      if (
        this.selectedImage &&
        scene.getObjectByProperty("uuid", this.selectedImage.uuid)
      ) {
        return this.selectedImage;
      }

      if (this.selectedImageId) {
        let image = scene.getObjectByProperty("uuid", this.selectedImageId);
        if (image && image.userData.kind === "imagePlane") {
          this.selectedImage = image;
          return image;
        }
      }

      this.selectedImage = undefined;
      this.selectedImageId = undefined;
      return undefined;
    },
    cloneCanvasData(canvasData) {
      if (!canvasData) return undefined;

      return {
        shape: canvasData.shape,
        position: canvasData.position.clone
          ? canvasData.position.clone()
          : new THREE.Vector3(
              canvasData.position.x,
              canvasData.position.y,
              canvasData.position.z
            ),
        quaternion: canvasData.quaternion.clone
          ? canvasData.quaternion.clone()
          : new THREE.Quaternion(
              canvasData.quaternion.x ?? canvasData.quaternion._x,
              canvasData.quaternion.y ?? canvasData.quaternion._y,
              canvasData.quaternion.z ?? canvasData.quaternion._z,
              canvasData.quaternion.w ?? canvasData.quaternion._w
            ),
        scale: canvasData.scale.clone
          ? canvasData.scale.clone()
          : new THREE.Vector3(
              canvasData.scale.x,
              canvasData.scale.y,
              canvasData.scale.z
            ),
      };
    },
    cloneStrokeOptions(stroke, forceOverride) {
      return {
        show_stroke: stroke.show_stroke,
        color: stroke.color,
        lineWidth: stroke.lineWidth,
        force: forceOverride ? forceOverride.slice() : (stroke.force || []).slice(),
      };
    },
    cloneFillOptions(fill) {
      return {
        show_fill: fill.show_fill,
        color: fill.color,
      };
    },
    getStrokeObjects() {
      return scene.children.filter(
        (object) => object.geometry?.type === "MeshLine" && object.layers.mask === 2
      );
    },
    snapshotStrokeObject(strokeObject) {
      let position = new THREE.Vector3();
      let quaternion = new THREE.Quaternion();
      let scale = new THREE.Vector3();

      strokeObject.getWorldPosition(position);
      strokeObject.getWorldQuaternion(quaternion);
      strokeObject.getWorldScale(scale);

      return {
        uuid: strokeObject.uuid,
        vertices: new Float32Array(strokeObject.geometry.points),
        stroke: this.cloneStrokeOptions(strokeObject.userData.stroke),
        fill: this.cloneFillOptions(strokeObject.userData.fill),
        position,
        quaternion,
        scale,
        matrix: strokeObject.matrix.clone(),
        canvas: this.cloneCanvasData(strokeObject.userData.canvas),
      };
    },
    snapshotStrokes() {
      return this.getStrokeObjects().map((object) =>
        this.snapshotStrokeObject(object)
      );
    },
    restoreStrokeSnapshot(snapshot) {
      draw.fromVertices(
        new Float32Array(snapshot.vertices),
        this.cloneStrokeOptions(snapshot.stroke),
        this.cloneFillOptions(snapshot.fill),
        false,
        snapshot.uuid,
        snapshot.position.clone(),
        snapshot.quaternion.clone(),
        snapshot.scale.clone(),
        snapshot.matrix.clone(),
        false,
        this.cloneCanvasData(snapshot.canvas)
      );
    },
    restoreStrokeSnapshots(snapshots) {
      this.getStrokeObjects().forEach((object) => {
        this.removeStrokeObject(object);
      });

      snapshots.forEach((snapshot) => {
        this.restoreStrokeSnapshot(snapshot);
      });
    },
    setImageState(image, state) {
      let targetImage = scene.getObjectByProperty("uuid", state.uuid) || image;
      if (!targetImage || !scene.getObjectByProperty("uuid", targetImage.uuid)) return;

      targetImage.scale.copy(state.scale);
      targetImage.userData.image.scalePercent = state.scalePercent;
      targetImage.updateMatrixWorld(true);
      this.selectedImageScaleInput = state.scalePercent + "%";
    },
    snapshotImageState(image) {
      return {
        uuid: image.uuid,
        scale: image.scale.clone(),
        scalePercent: image.userData.image.scalePercent || 100,
      };
    },
    getStrokeWidthCallback(strokeObject, pointCount) {
      return (p) => {
        let length = pointCount || strokeObject.geometry.points.length / 3;
        let force = strokeObject.userData.stroke.force || [];

        function map(n, start1, stop1, start2, stop2) {
          return ((n - start1) / (stop1 - start1)) * (stop2 - start2) + start2;
        }

        let index = Math.round(p * (length - 1));
        let minWidth = 0;
        let baseWidth = 3;
        let width = (force[index] || 0) * 16;
        let tailLength = 3;

        if (index < tailLength) {
          return map(index, minWidth, tailLength, minWidth, baseWidth + width);
        }

        if (index > length - tailLength) {
          return map(
            index,
            length - tailLength,
            length - 1,
            baseWidth + width,
            minWidth
          );
        }

        return baseWidth + width;
      };
    },
    refreshStrokeFill(strokeObject, points) {
      if (!strokeObject.userData.fill?.show_fill || !strokeObject.children[0]) {
        return;
      }

      let fillMesh = strokeObject.children[0];

      if (points.length < 9) {
        fillMesh.geometry.setAttribute(
          "position",
          new THREE.BufferAttribute(new Float32Array([]), 3)
        );
        fillMesh.geometry.setIndex(null);
        return;
      }

      fillMesh.geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(points, 3)
      );
      fillMesh.geometry.setIndex(
        new THREE.BufferAttribute(
          new Uint16Array(Earcut.triangulate(points, null, 3)),
          1
        )
      );
      fillMesh.geometry.attributes.position.needsUpdate = true;
      fillMesh.geometry.index.needsUpdate = true;
      fillMesh.geometry.computeBoundingSphere();
      fillMesh.geometry.computeBoundingBox();
    },
    removeStrokeObject(strokeObject) {
      scene.remove(strokeObject);

      if (strokeObject.material) {
        strokeObject.material.dispose();
      }

      strokeObject.children.forEach((child) => {
        if (child.material) {
          child.material.dispose();
        }

        if (child.geometry) {
          child.geometry.dispose();
        }
      });

      if (strokeObject.geometry) {
        strokeObject.geometry.dispose();
      }
    },
    restoreStrokeSegment(baseSnapshot, points, force) {
      let snapshot = {
        ...baseSnapshot,
        position: baseSnapshot.position.clone(),
        quaternion: baseSnapshot.quaternion.clone(),
        scale: baseSnapshot.scale.clone(),
        matrix: baseSnapshot.matrix.clone(),
        canvas: this.cloneCanvasData(baseSnapshot.canvas),
      };
      snapshot.vertices = new Float32Array(points);
      snapshot.stroke = this.cloneStrokeOptions(baseSnapshot.stroke, force);
      snapshot.uuid = undefined;
      this.restoreStrokeSnapshot(snapshot);
    },
    scaleStrokePointsOnImage(strokeObject, image, factor) {
      let sourcePoints = strokeObject.geometry.points;

      if (!sourcePoints || sourcePoints.length < 3) return false;

      strokeObject.updateMatrixWorld(true);
      image.updateMatrixWorld(true);

      let imageToWorld = image.matrixWorld.clone();
      let worldToImage = image.matrixWorld.clone().invert();
      let strokeToWorld = strokeObject.matrixWorld.clone();
      let worldToStroke = strokeObject.matrixWorld.clone().invert();
      let halfWidth = image.userData.image.width / 2;
      let halfHeight = image.userData.image.height / 2;
      let planeTolerance = Math.max(image.userData.image.width, image.userData.image.height) * 0.04;
      let segments = [];
      let currentPoints = [];
      let currentForce = [];
      let force = strokeObject.userData.stroke.force || [];
      let insideCount = 0;
      let outsideCount = 0;

      function keepSegment() {
        if (currentPoints.length >= 6) {
          segments.push({
            points: currentPoints.slice(),
            force: currentForce.slice(),
          });
        }

        currentPoints = [];
        currentForce = [];
      }

      for (let i = 0; i < sourcePoints.length; i += 3) {
        let strokeLocalPoint = new THREE.Vector3(
          sourcePoints[i],
          sourcePoints[i + 1],
          sourcePoints[i + 2]
        );
        let imageLocalPoint = strokeLocalPoint
          .clone()
          .applyMatrix4(strokeToWorld)
          .applyMatrix4(worldToImage);

        let pointIsInsideImage =
          Math.abs(imageLocalPoint.x) <= halfWidth &&
          Math.abs(imageLocalPoint.y) <= halfHeight &&
          Math.abs(imageLocalPoint.z) <= planeTolerance;

        if (!pointIsInsideImage) {
          outsideCount++;
          keepSegment();
          continue;
        }

        insideCount++;
        imageLocalPoint.x *= factor;
        imageLocalPoint.y *= factor;

        let nextStrokeLocalPoint = imageLocalPoint
          .applyMatrix4(imageToWorld)
          .applyMatrix4(worldToStroke);

        currentPoints.push(
          nextStrokeLocalPoint.x,
          nextStrokeLocalPoint.y,
          nextStrokeLocalPoint.z
        );
        currentForce.push(force[i / 3] || 0);
      }

      keepSegment();

      if (insideCount === 0) return false;

      if (segments.length === 0) {
        this.removeStrokeObject(strokeObject);
        return true;
      }

      if (outsideCount > 0) {
        let baseSnapshot = this.snapshotStrokeObject(strokeObject);
        this.removeStrokeObject(strokeObject);
        segments.forEach((segment) => {
          this.restoreStrokeSegment(baseSnapshot, segment.points, segment.force);
        });
        return true;
      }

      let nextPoints = new Float32Array(segments[0].points);

      strokeObject.geometry.setPoints(
        nextPoints,
        this.getStrokeWidthCallback(strokeObject, nextPoints.length / 3)
      );
      this.refreshStrokeFill(strokeObject, nextPoints);
      strokeObject.geometry.computeBoundingSphere();
      strokeObject.geometry.computeBoundingBox();
      strokeObject.userData.vertices = Array.from(
        nextPoints,
        (value, index) => {
          if (index % 3 === 0) {
            return [
              nextPoints[index],
              nextPoints[index + 1],
              nextPoints[index + 2],
            ];
          }

          return undefined;
        }
      ).filter(Boolean);
      return true;
    },
    scaleStrokesOnImage(image, factor) {
      this.getStrokeObjects().forEach((object) => {
        this.scaleStrokePointsOnImage(object, image, factor);
      });
    },
    performImageScale(image, amount, nextPercent) {
      this.scaleStrokesOnImage(image, amount);
      image.scale.multiplyScalar(amount);
      image.updateMatrixWorld(true);
      image.userData.image.scalePercent = Math.round(nextPercent);
      this.selectedImageScaleInput = image.userData.image.scalePercent + "%";
      this.updateImagePresentation();
      renderer.render(scene, camera);
      window.dispatchEvent(new CustomEvent("penzil-project-change"));
    },
    applyImageScale(percent) {
      let image = this.getSelectedImage();
      if (!image) return;

      let nextPercent = THREE.MathUtils.clamp(percent, 10, 1000);
      let currentPercent = image.userData.image.scalePercent || 100;
      let factor = nextPercent / currentPercent;

      if (factor === 1) return;

      let beforeImageState = this.snapshotImageState(image);
      let beforeStrokes = this.snapshotStrokes();
      let component = this;

      this.performImageScale(image, factor, nextPercent);

      let afterImageState = this.snapshotImageState(image);
      let afterStrokes = this.snapshotStrokes();

      undoManager.add({
        undo() {
          component.setImageState(image, beforeImageState);
          component.restoreStrokeSnapshots(beforeStrokes);
          renderer.render(scene, camera);
          window.dispatchEvent(new CustomEvent("penzil-project-change"));
        },
        redo() {
          component.setImageState(image, afterImageState);
          component.restoreStrokeSnapshots(afterStrokes);
          renderer.render(scene, camera);
          window.dispatchEvent(new CustomEvent("penzil-project-change"));
        },
      });

      if (undoRedoComponent) {
        undoRedoComponent.$.ctx.updateUi();
      }
    },
    scaleSelectedImage(amount) {
      let image = this.getSelectedImage();
      if (!image) return;

      this.applyImageScale((image.userData.image.scalePercent || 100) * amount);
    },
    setSelectedImageScale(percent) {
      this.applyImageScale(percent);
    },
    commitSelectedImageScale() {
      let value = parseFloat(String(this.selectedImageScaleInput).replace("%", ""));

      if (Number.isNaN(value)) {
        let image = this.getSelectedImage();
        this.selectedImageScaleInput = image
          ? (image.userData.image.scalePercent || 100) + "%"
          : "100%";
        return;
      }

      this.setSelectedImageScale(value);
    },
    stepSelectedImageScale(amount) {
      let image = this.getSelectedImage();
      if (!image) return;

      this.setSelectedImageScale((image.userData.image.scalePercent || 100) + amount);
    },
    getCanvasTransform() {
      return {
        position: canvas.position.clone(),
        quaternion: canvas.quaternion.clone(),
        scale: canvas.scale.clone(),
      };
    },
    applyCanvasTransform(transform) {
      canvas.position.copy(transform.position);
      canvas.quaternion.copy(transform.quaternion);
      canvas.scale.copy(transform.scale);
      this.updateRotationReadout();
      this.updateImagePresentation();
      renderer.render(scene, camera);
    },
    resetTransformation(updateCameraHome = true) {
      this.applyCanvasTransform({
        position: this.startPosition,
        quaternion: this.startQuaternion,
        scale: this.startScale,
      });
      if (updateCameraHome) {
        this.$emit("set-camera-home", {
          center: this.startPosition.clone(),
          resetView: false,
        });
      }
      this.transformationResetDisabled = true;
    },
    setHomeFromCanvas() {
      let home = this.getCanvasTransform();
      this.startPosition.copy(home.position);
      this.startQuaternion.copy(home.quaternion);
      this.startScale.copy(home.scale);
      this.$emit("set-camera-home", {
        center: this.startPosition.clone(),
        resetView: true,
      });
      this.transformationResetDisabled = true;
    },
    restoreDefaultHome() {
      this.startPosition.copy(this.defaultHome.position);
      this.startQuaternion.copy(this.defaultHome.quaternion);
      this.startScale.copy(this.defaultHome.scale);
      this.resetTransformation(false);
      this.$emit("set-camera-home", {
        center: this.startPosition.clone(),
        resetView: true,
      });
    },
    restoreTransformation() {
      this.$emit("set-tool-enabled", false);
      this.restoringTransformation = true;
    },
    setShapeAndMatrix(shape, position, quaternion, scale) {
      this.setCanvasShape(shape);
      canvas.position.set(position.x, position.y, position.z);
      canvas.quaternion.set(
        quaternion.x,
        quaternion.y,
        quaternion.z,
        quaternion.w
      );
      canvas.scale.set(scale.x, scale.y, scale.z);
      this.updateRotationReadout();
      this.updateImagePresentation();
      renderer.render(scene, camera);
    },
    toggleTransformMode() {
      if (this.mode === "combined") {
        this.mode = "rotate";
        controls.mode = "rotate";
        renderer.render(scene, camera);
      } else if (this.mode === "rotate") {
        this.mode = "scale";
        controls.mode = "scale";
        renderer.render(scene, camera);
      } else {
        this.mode = "combined";
        controls.mode = "combined";
        renderer.render(scene, camera);
      }
    },
    toggleControls() {
      if (controls.visible === true) {
        this.transformationEnabled = false;
        controls.enabled = false;
        controls.visible = false;
        renderer.render(scene, camera);
      } else {
        this.transformationEnabled = true;
        controls.enabled = true;
        controls.visible = true;
        renderer.render(scene, camera);
      }
    },
    toggleVisibility() {
      if (canvas.visible === true) {
        this.visible = false;

        if (this.transformationEnabled === true) {
          controls.visible = false;
        }

        //if controls are enabled we temporary disable them without overriding the setting
        if (controls.enabled === true) {
          controls.enabled = false;
        }

        canvas.visible = false;
        renderer.render(scene, camera);
      } else {
        this.visible = true;

        if (this.transformationEnabled === true) {
          controls.visible = true;
        }

        //if controls were enabled, restore them to be enabled
        if (controls.enabled === false && this.transformationEnabled === true) {
          controls.enabled = true;
        }

        canvas.visible = true;

        renderer.render(scene, camera);
      }
    },
    toggleSnap() {
      if (this.snap === true) {
        this.snap = !this.snap;
        controls.translationSnap = null;
        controls.rotationSnap = null;
      } else {
        this.snap = !this.snap;
        controls.translationSnap = 1 / 3;
        controls.rotationSnap = Math.PI / 6;
      }
    },
    toggleShapeSelectionVisibility() {
      this.shapeSelectionVisibility = !this.shapeSelectionVisibility;
    },
    setCanvasShape(val) {
      this.shape = val;
      currentShape = val;
      if (val !== SWEEP_SHAPE) {
        clearSweepShapeState();
      }
      this.$emit("selected-canvas-shape", val);
      this.shapeSelectionVisibility = false;
    },
    setUpMirror(val) {
      switch (val) {
        case "x":
          canvasMirror = canvas.clone();
          canvasMirror.applyMatrix4(canvas.matrixWorld.makeScale(-1, 1, 1));
          scene.add(canvasMirror);
          renderer.render(scene, camera);
          break;

        case "y":
          break;

        case "z":
          break;

        default:
          break;
      }
    },
    removeMirror() {
      scene.remove(canvasMirror);
    },
  },
  watch: {
    opacity: function (val) {
      this.material.opacity = val;
      if (val == 0) {
        this.material.visible = false;
      } else {
        this.material.visible = true;
      }
      renderer.render(scene, camera);
    },
    shape: function (val) {
      canvas.geometry.dispose();

      switch (val) {
        case "plane":
          canvas.geometry = new THREE.PlaneGeometry(5, 5);

          break;
        case "cube":
          canvas.geometry = new THREE.BoxGeometry(5, 5, 5);
          break;
        case "cylinder":
          canvas.geometry = new THREE.CylinderGeometry(2.5, 2.5, 5, 15);
          break;
        case "sphere":
          canvas.geometry = new THREE.SphereGeometry(2.5, 15, 15);
          break;
        case "head":
          if (headGeometry === undefined) {
            const loader = new GLTFLoader();
            loader.load("/asaro.glb", function (gltf) {
              headGeometry = gltf.scene.children[0].geometry;
              canvas.geometry.dispose();
              canvas.geometry = headGeometry;
              canvas.geometry.needsUpdate = true;
              renderer.render(scene, camera);
            });
          } else {
            canvas.geometry.dispose();
            canvas.geometry = headGeometry;
            canvas.geometry.needsUpdate = true;
            renderer.render(scene, camera);
          }
          break;
        case SWEEP_SHAPE:
          canvas.geometry = makeSweepShapeGeometry();
          break;

        default:
          canvas.geometry = new THREE.PlaneGeometry(5, 5);
          break;
      }

      canvas.geometry.needsUpdate = true;
      renderer.render(scene, camera);

      // if (val === "plane") {
      //   canvas.geometry.dispose();
      //   canvas.geometry = new THREE.PlaneGeometry(5, 5);
      //   canvas.geometry.needsUpdate = true;
      //   renderer.render(scene, camera);
      // } else if (val === "sphere") {
      //   canvas.geometry.dispose();
      //   canvas.geometry = new THREE.SphereGeometry(2.5, 15, 15);
      //   canvas.geometry.needsUpdate = true;
      //   renderer.render(scene, camera);
      // } else if (val === "head") {
      //   if (headGeometry === undefined) {
      //     const loader = new GLTFLoader();
      //     loader.load("/asaro.glb", function (gltf) {
      //       headGeometry = gltf.scene.children[0].geometry;
      //       canvas.geometry.dispose();
      //       canvas.geometry = headGeometry;
      //       canvas.geometry.needsUpdate = true;
      //       renderer.render(scene, camera);
      //     });
      //   } else {
      //     canvas.geometry.dispose();
      //     canvas.geometry = headGeometry;
      //     canvas.geometry.needsUpdate = true;
      //     renderer.render(scene, camera);
      //   }
      // }
    },
    mirror: function (val) {
      if (val === false) {
        this.removeMirror();
      } else {
        this.setUpMirror(val);
      }
    },
    mouse: function (val) {
      if (this.restoringTransformation === true) {
        raycaster = new THREE.Raycaster();
        try {
          raycaster.setFromCamera(new THREE.Vector2(val.x, val.y), camera);
          raycaster.params.Line.threshold = 0.05;
          raycaster.layers.set(1);
          let obj = raycaster.intersectObjects(scene.children)[0].object;
          if (obj != undefined && obj.geometry.type == "MeshLine") {
            this.setShapeAndMatrix(
              obj.userData.canvas.shape,
              obj.userData.canvas.position,
              obj.userData.canvas.quaternion,
              obj.userData.canvas.scale
            );
          }
        } catch (error) {
          // Some scene objects do not carry saved canvas data.
        }
        this.$emit("set-tool-enabled", true);
        this.restoringTransformation = false;
      }
    },
  },
  mounted() {
    canvasComponent = this;
    this.setCanvasShape(this.shape);
  },
};
</script>

<style scoped>
.canvasSettings {
  z-index: 2;
  position: absolute;
  top: 12px;
  left: 12px;
  font-weight: 900;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

#canvasShapeDropdown {
  max-width: 36px;
}

.canvasShapeSelection {
  font-size: 0.45em;
  color: #1c1c1e;
  white-space: discard;
  display: flex;
  flex-direction: column;
  filter: drop-shadow(0px 4px 14px rgba(0, 0, 0, 0.1));
  border-radius: 6px;
  overflow: hidden;
  position: absolute;
  z-index: 10;
  top: calc(36px + 6px);
  width: 36px;
}

.canvasShapeSelection > span > label {
  display: flex;
  flex-direction: row;
  align-items: initial;
}

.click-outside {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  background-color: rgba(0, 0, 0, 0.2);
}

.reset-canvas {
  height: 36px;
  width: 36px;
  border-radius: 18px;
  background-color: rgba(255, 255, 255, 1);
  font-size: 2em;
  line-height: 1em;
  color: rgba(255, 255, 255, 1);
  opacity: 1;
  justify-content: center;
  align-content: center;
  text-align: center;
  z-index: 2;
  filter: drop-shadow(0px 4px 14px rgba(0, 0, 0, 0.1));
}

.canvas-button {
  width: 36px;
  height: 36px;
  border-radius: 18px;
  background-color: rgba(255, 255, 255, 1);
  font-size: 2em;
  line-height: 1em;
  color: rgba(255, 255, 255, 1);
  justify-content: center;
  align-content: center;
  text-align: center;
  z-index: 2;
  filter: drop-shadow(0px 4px 14px rgba(0, 0, 0, 0.1));
  display: flex;
  align-items: center;
}

.icon-and-label {
  display: flex;
  flex-direction: row;
  align-items: center;
  font-size: 0.5em;
  border-radius: 18px;
  color: #1c1c1e;
  justify-content: center;
  padding: 0;
  width: 100%;
  height: 100%;
}

.shape-text-icon {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: #1c1c1e;
  font-size: 0.42em;
  font-weight: 900;
}

.transform-mode {
  padding: 0;
}

.mode-letter {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  color: #1c1c1e;
  font-size: 0.58em;
}

.center-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  align-self: flex-start;
}

.home-button {
  width: 36px;
  min-width: 36px;
  height: 36px;
  border: 0;
  border-radius: 18px;
  background-color: #ffffff;
  color: #1c1c1e;
  font-size: 0.6em;
  font-weight: 900;
  padding: 0 8px;
  filter: drop-shadow(0px 4px 14px rgba(0, 0, 0, 0.1));
}

.home-button:hover,
.home-button:focus {
  background-color: #ffe8b3;
}

.stroke-plane-button img {
  width: 16px;
  height: 16px;
}

.stroke-plane-button.active {
  background-color: #ffe8b3;
  box-shadow: inset 0px 0px 0px 1px #fff;
}

.image-tools {
  height: auto;
  width: 36px;
  border-radius: 6px;
  gap: 3px;
  padding: 5px;
  flex-direction: column;
  align-items: center;
  align-self: flex-start;
}

.image-tools button {
  height: 22px;
  border: 0;
  border-radius: 4px;
  background-color: transparent;
  color: #1c1c1e;
  font-size: 0.34em;
  font-weight: 900;
  padding: 0 6px;
}

.image-import-button {
  width: 30px;
}

.image-scale-row {
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
  border-radius: 4px;
  gap: 2px;
}

.image-scale-row input {
  min-width: 0;
  width: 30px;
  height: 22px;
  border: 0;
  border-left: 1px solid rgba(0, 0, 0, 0.08);
  border-right: 1px solid rgba(0, 0, 0, 0.08);
  color: #1c1c1e;
  font-size: 0.34em;
  font-weight: 900;
  text-align: center;
  padding: 0 2px;
  outline: none;
}

.image-tools button:not(:disabled):hover,
.image-tools button:not(:disabled):focus {
  background-color: #ffe8b3;
}

.image-tools button:disabled {
  opacity: 0.35;
}

.rotation-readout {
  width: auto;
  height: auto;
  border-radius: 6px;
  gap: 3px;
  padding: 5px;
  flex-direction: column;
  align-items: center;
  color: #1c1c1e;
}

.rotation-readout label {
  width: 36px;
  height: auto;
  display: grid;
  grid-template-columns: 1fr;
  align-items: center;
  justify-items: center;
  gap: 3px;
  color: #1c1c1e;
  font-size: 0.34em;
  font-weight: 900;
}

.rotation-readout button {
  width: 28px;
  height: 20px;
  border: 0;
  border-radius: 4px;
  background-color: transparent;
  color: #1c1c1e;
  font-size: 1em;
  font-weight: 900;
  line-height: 1;
  padding: 0;
}

.rotation-readout input {
  min-width: 0;
  width: 28px;
  height: 20px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 4px;
  color: #1c1c1e;
  font-size: 1em;
  font-weight: 900;
  text-align: center;
  padding: 0 2px;
  outline: none;
}

.rotation-readout button:not(:disabled):hover,
.rotation-readout button:not(:disabled):focus,
.rotation-readout input:focus {
  background-color: #ffe8b3;
}

.active {
  box-shadow: inset 0px 0px 0px 1px #fff;
  background-color: #ffe8b3;
}

.hidden {
  display: none;
}

label {
  display: flex;
  width: 36px;
  height: 36px;
  align-content: center;
  justify-content: center;
  margin: 0px;
}

#transform-mode {
  background-color: white;
  border: none;
  padding: 8px;
  border-radius: 8px;
  font-weight: 900;
  filter: drop-shadow(0px 0px 24px rgba(0, 0, 0, 0.08));
}

@media (pointer: coarse) {
  #transform-mode {
    display: none;
  }
}

@media (min-width: 320px) and (max-width: 480px) {
  .canvasSettings {
    top: 80px;
  }

  .icon-and-label {
    max-width: 36px;
    overflow: hidden;
  }

  .image-tools {
    width: 36px;
    height: auto;
    padding: 5px;
  }

  .rotation-readout {
    width: auto;
  }
}
</style>
