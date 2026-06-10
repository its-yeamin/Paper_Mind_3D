<template>
  <video-export-preview :show="previewing" @stop-previewing="setPreview" />
  <modal :modalProp="modalProp" @modal-set="setModal" />
  <viewport-cube
    :quaternion="quaternion"
    :cameraResetDisabled="cameraResetDisabled"
    :cameraZoomPercent="cameraZoomPercent"
    @camera-zoom="setCameraZoom"
  />
  <tool-selector @selected-tool="setSelectedTool" :selectedTool="tool" />
  <line-settings @stroke="setStroke" @fill="setFill" :selectedTool="tool" />
  <transorm-toolbar
    :top="transformToolbar.top"
    :left="transformToolbar.left"
    :location="transformToolbar.location"
    :display="transformToolbar.display"
    :selectedTool="tool"
  />
  <undo-redo @selected-tool="setSelectedTool" ref="undoRedo" />
  <Input
    @mouse-coordinates="setMouseCoordinates"
    :selectedTool="tool"
    :mirror="mirror"
    :stroke="stroke"
    :fill="fill"
    :toolEnabled="toolEnabled"
  />
  <Canvas
    ref="raycastCanvas"
    @selected-canvas-shape="setSelectedCanvasShape"
    @set-tool-enabled="setToolEnabled"
    :selectedShape="canvasShape"
    :selectedTool="tool"
    :mirror="mirror"
    :mouse="mouse"
  />
  <Menu @modal-set="setModal" ref="dotdotdot" />
  <Share @modal-set="setModal" @preview="setPreview" ref="share" />
  <show-tutorial @modal-set="setModal" :show="showTutorialButton" />
  <project-start
    v-if="projectStartVisible"
    :recentProjects="recentProjects"
    @new-project="startNewProject"
    @open-project="openProject"
  />
  <button
    class="grid-guide-toggle"
    v-bind:class="[gridGuideVisible ? 'active' : '']"
    @click="toggleGridGuide"
  >
    3D Grid
  </button>
  <!-- <div>
    <a id="ar" rel="ar"><img src="@/assets/icons/AR.png" /></a>
  </div> -->
</template>

<script>
import * as THREE from "three";
//import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import CameraControls from "camera-controls";
CameraControls.install({ THREE: THREE });
import InfiniteGridHelper from "./components/InfiniteGridHelper.js";

import Input from "./components/Input.vue";
import ToolSelector from "./components/ToolSelector.vue";
import ViewportCube from "./components/ViewportCube.vue";
import UndoRedo, { undoManager } from "./components/UndoRedo.vue";
import TransormToolbar from "./components/TransformToolbar.vue";
import { select } from "./components/select.js";
import LineSettings from "./components/LineSettings.vue";
import Menu from "./components/Menu.vue";
import Share from "./components/Share.vue";
import Canvas from "./components/Canvas.vue";
import { controls, canvas } from "./components/Canvas.vue";
import Modal from "./components/Modal.vue";
import VideoExportPreview from "./components/VideoExportPreview.vue";
import ShowTutorial from "./components/ShowTutorial.vue";
import ProjectStart from "./components/ProjectStart.vue";
import {
  createNewProject,
  listRecentProjects,
  openRecentProject,
  scheduleAutoSave,
} from "./components/projectStorage.js";

export let renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true,
  preserveDrawingBuffer: true, //this is the configuration that allows the renderer to redraw only the current line when we are drawing instead of the whole scene. If I remember correctly it could create some issues with the video rendering. Leaving a note in case it does. One potential workaround would be to have two separte renderers, one for the scene, one for the current line.
});
export let camera = new THREE.PerspectiveCamera(
  100,
  window.innerWidth / window.innerHeight,
  1,
  1000
);

//source for this is https://stackoverflow.com/questions/48758959/what-is-required-to-convert-threejs-perspective-camera-to-orthographic
// const aspect = window.innerWidth / window.innerHeight;
// const height_ortho = 6 * 2 * Math.atan( 100*(Math.PI/180) / 2 )
// const width_ortho  = height_ortho * aspect;

// let cameraOrtho = new THREE.OrthographicCamera(
//     width_ortho  / -2, width_ortho   /  2,
//     height_ortho /  2, height_ortho  / -2,
//     1, 1000 );

export let scene, drawingScene, cameraControls, vm, drawingprop;

var main, clock, gridGuide;
var touchPointers = new Map();

export default {
  name: "App",
  components: {
    Input,
    LineSettings,
    ToolSelector,
    TransormToolbar,
    ViewportCube,
    UndoRedo,
    Menu,
    Share,
    Canvas,
    Modal,
    VideoExportPreview,
    ShowTutorial,
    ProjectStart,
  },
  data() {
    return {
      tool: "draw",
      toolEnabled: true,
      canvasShape: "plane",
      multitouch: "canvas",
      toolHistory: ["draw"],
      stroke: {}, //filled by the component on mount
      fill: {}, //filled by the component on mount
      mirror: false,
      quaternion: undefined,
      cameraResetDisabled: false,
      cameraZoomPercent: 100,
      selected: undefined,
      transformToolbar: { top: 0, left: 0, location: "above", display: false },
      canvasTransformEnabled: true,
      modalProp: { show: false, mode: "about" },
      previewing: false,
      showTutorialButton: true,
      mouse: {},
      gridGuideVisible: false,
      projectStartVisible: true,
      recentProjects: [],
      touchGesture: {
        active: false,
        x: 0,
        y: 0,
        distance: 0,
      },
    };
  },
  emits: ["modal-set", "selected-canvas-shape"],
  methods: {
    init: function () {
      CameraControls.install({ THREE: THREE });
      main = document.getElementById("threed");

      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.setClearColor(0x000000, 0); // the default
      renderer.setSize(window.innerWidth, window.innerHeight);
      main.appendChild(renderer.domElement);
      renderer.domElement.id = "threeJsCanvas";

      scene = new THREE.Scene();
      //Set the background based on the css variable;
      var bgCol = 0xdddddd;
      scene.background = new THREE.Color(bgCol);
      scene.fog = new THREE.Fog(bgCol, 10, 25);

      drawingScene = new THREE.Scene(); //this scene is only used for rendering lines as they are being drawn. Lines are then moved to the main scene.

      const grid = new InfiniteGridHelper(1, 10, new THREE.Color(0x0000ff), 40);
      scene.add(grid);
      this.addGridGuide();

      camera.layers.enable(0); // enabled by default
      camera.layers.enable(1);
      camera.zoom = 3;
      camera.position.set(5, 5, 10);

      clock = new THREE.Clock();

      cameraControls = new CameraControls(camera, renderer.domElement);
      cameraControls.dampingFactor = 20;
      cameraControls.draggingDampingFactor = 200;
      cameraControls.mouseButtons.left = CameraControls.ACTION.NONE;
      cameraControls.mouseButtons.wheel = CameraControls.ACTION.ROTATE;
      document.addEventListener("keydown", (event) => {
        if (event.code === "Space") {
          cameraControls.mouseButtons.left = CameraControls.ACTION.TRUCK;
          this.toolEnabled = false;
        }
      });
      document.addEventListener("keyup", (event) => {
        if (event.code === "Space") {
          cameraControls.mouseButtons.left = CameraControls.ACTION.NONE;
          this.toolEnabled = true;
        }
      });
      document.addEventListener("keydown", (event) => {
        if (event.code === "AltLeft") {
          cameraControls.mouseButtons.left = CameraControls.ACTION.ROTATE;
          this.toolEnabled = false;
        }
      });
      document.addEventListener("keyup", (event) => {
        if (event.code === "AltLeft") {
          cameraControls.mouseButtons.left = CameraControls.ACTION.NONE;
          this.toolEnabled = true;
        }
      });
      cameraControls.mouseButtons.middle = CameraControls.ACTION.DOLLY;
      cameraControls.mouseButtons.right = CameraControls.ACTION.ZOOM;
      cameraControls.touches.one = CameraControls.ACTION.NONE;
      cameraControls.touches.two = CameraControls.ACTION.TOUCH_ZOOM_ROTATE;
      cameraControls.touches.three = CameraControls.ACTION.TOUCH_DOLLY_TRUCK;
      cameraControls.maxZoom = 4000;
      cameraControls.minZoom = 1.5;
      cameraControls.enabled = true;
      main.addEventListener("touchstart", this.handleCanvasTouchStart, {
        capture: true,
        passive: false,
      });
      main.addEventListener("touchmove", this.handleCanvasTouchMove, {
        capture: true,
        passive: false,
      });
      main.addEventListener("touchend", this.handleCanvasTouchEnd, {
        capture: true,
        passive: false,
      });
      main.addEventListener("touchcancel", this.handleCanvasTouchEnd, {
        capture: true,
        passive: false,
      });
      main.addEventListener("pointerdown", this.handleCanvasPointerDown, {
        capture: true,
        passive: false,
      });
      main.addEventListener("pointermove", this.handleCanvasPointerMove, {
        capture: true,
        passive: false,
      });
      main.addEventListener("pointerup", this.handleCanvasPointerEnd, {
        capture: true,
        passive: false,
      });
      main.addEventListener("pointercancel", this.handleCanvasPointerEnd, {
        capture: true,
        passive: false,
      });
      window.addEventListener("blur", this.resetCanvasPointerGesture);
      document.addEventListener("visibilitychange", this.handleVisibilityChange);

      this.quaternion = [
        camera.quaternion.x,
        camera.quaternion.y,
        camera.quaternion.z,
        camera.quaternion.w,
      ];

      cameraControls.addEventListener("update", () => {
        this.quaternion = [
          camera.quaternion.x,
          camera.quaternion.y,
          camera.quaternion.z,
          camera.quaternion.w,
        ];
        this.cameraZoomPercent = Math.round((camera.zoom / 3) * 100);

        let target = new THREE.Vector3();
        target = cameraControls.getTarget(target);
        targetSphere.position.set(target.x, target.y, target.z);

        //hide the contextual transformControls while we adjust the camera is something is selected
        if (select.s && select.s.controls != undefined) {
          this.transformToolbar.display = false;
        }
        if (select.s && select.s.controls != undefined) {
          if (this.tool == "select") {
            select.s.helper.update();
          }
        }
      });

      cameraControls.addEventListener("sleep", () => {
        //reposition the drawingPlane
        // drawingPlane.updatePosition();

        //reposition the contextual transformControls after we adjusted the camera is something is selected
        if (select.s && select.s.controls != undefined) {
          if (this.tool == "select") {
            select.s.helper.update();
            let position = select.s.calculateTransfromToolbarPosition();
            this.transformToolbar.left = position.x;
            this.transformToolbar.top = position.y;
            this.transformToolbar.location = position.location;
            this.transformToolbar.display = true;
          }
        }

        //set if the camera is resettable after we adjusted the camera
        let target = new THREE.Vector3();
        target = cameraControls.getTarget(target);
        var x = target.x;
        var y = target.y;
        var z = target.z;

        if (
          camera.position.z != 10 ||
          x != 0 ||
          y != 0 ||
          z != 0 ||
          camera.zoom != 3
        ) {
          this.cameraResetDisabled = false;
        } else {
          this.cameraResetDisabled = true;
          // cameraOrtho.position.copy(camera.position)
          // cameraOrtho.zoom = camera.zoom*10;
          // renderer.render(scene, cameraOrtho);
        }
      });

      var geometry = new THREE.SphereBufferGeometry(0.025, 32, 32);
      var material = new THREE.MeshBasicMaterial({ color: 0xffc75f });
      var targetSphere = new THREE.Mesh(geometry, material);
      scene.add(targetSphere);

      const light = new THREE.HemisphereLight(0xffffff, 0x222222, 0.8); //0x080820
      light.position.set(0, 50, 150);
      scene.add(light);

      this.$.refs.raycastCanvas.setUp();
      this.$.refs.raycastCanvas.resetTransformation();
      this.loadProjectStart();

      window.addEventListener("resize", this.onWindowResize);
      window.addEventListener("orientationchange", this.onWindowResize);
      window.addEventListener("penzil-project-change", scheduleAutoSave);
      this.onWindowResize();

      renderer.render(scene, camera);
    },
    onWindowResize: function () {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.left = (900 * camera.aspect) / -2;
      camera.right = (900 * camera.aspect) / 2;
      camera.top = 900 / 2;
      camera.bottom = -900 / 2;

      camera.updateProjectionMatrix();

      renderer.setSize(window.innerWidth, window.innerHeight);

      renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
      renderer.render(scene, camera);
    },
    getTwoFingerGesture: function (event) {
      const first = event.touches[0];
      const second = event.touches[1];
      const x = (first.clientX + second.clientX) / 2;
      const y = (first.clientY + second.clientY) / 2;
      const dx = second.clientX - first.clientX;
      const dy = second.clientY - first.clientY;

      return {
        x,
        y,
        distance: Math.sqrt(dx * dx + dy * dy),
      };
    },
    getPointerGesture: function () {
      const points = Array.from(touchPointers.values()).slice(0, 2);
      const first = points[0];
      const second = points[1];
      const x = (first.x + second.x) / 2;
      const y = (first.y + second.y) / 2;
      const dx = second.x - first.x;
      const dy = second.y - first.y;

      return {
        x,
        y,
        distance: Math.sqrt(dx * dx + dy * dy),
      };
    },
    applyCameraGesture: function (gesture) {
      const deltaX = gesture.x - this.touchGesture.x;
      const deltaY = gesture.y - this.touchGesture.y;
      const distanceDelta = gesture.distance - this.touchGesture.distance;
      const rotateScale = (Math.PI * 2) / Math.max(window.innerWidth, 1);
      const zoomScale = 0.012;

      cameraControls.rotate(-deltaX * rotateScale, -deltaY * rotateScale, false);
      cameraControls.zoom(distanceDelta * zoomScale, false);

      this.touchGesture = {
        active: true,
        x: gesture.x,
        y: gesture.y,
        distance: gesture.distance,
      };
      this.quaternion = [
        camera.quaternion.x,
        camera.quaternion.y,
        camera.quaternion.z,
        camera.quaternion.w,
      ];
      this.cameraZoomPercent = Math.round((camera.zoom / 3) * 100);
      renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
      renderer.render(scene, camera);
    },
    handleCanvasTouchStart: function (event) {
      if (event.touches.length !== 2 || !cameraControls?.enabled) return;

      const gesture = this.getTwoFingerGesture(event);
      this.touchGesture = {
        active: true,
        x: gesture.x,
        y: gesture.y,
        distance: gesture.distance,
      };
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    handleCanvasTouchMove: function (event) {
      if (!this.touchGesture.active || event.touches.length !== 2) return;

      const gesture = this.getTwoFingerGesture(event);
      this.applyCameraGesture(gesture);
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    handleCanvasTouchEnd: function (event) {
      if (!this.touchGesture.active) return;

      this.touchGesture.active = false;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    handleCanvasPointerDown: function (event) {
      if (event.pointerType !== "touch" || !cameraControls?.enabled) return;

      touchPointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      if (touchPointers.size < 2) return;

      const gesture = this.getPointerGesture();
      this.touchGesture = {
        active: true,
        x: gesture.x,
        y: gesture.y,
        distance: gesture.distance,
      };
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    handleCanvasPointerMove: function (event) {
      if (event.pointerType !== "touch" || !touchPointers.has(event.pointerId)) {
        return;
      }

      touchPointers.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      });

      if (touchPointers.size < 2) return;

      const gesture = this.getPointerGesture();
      if (this.touchGesture.active) {
        this.applyCameraGesture(gesture);
      } else {
        this.touchGesture = {
          active: true,
          x: gesture.x,
          y: gesture.y,
          distance: gesture.distance,
        };
      }
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    handleCanvasPointerEnd: function (event) {
      if (event.pointerType !== "touch") return;

      const wasCameraGesture = this.touchGesture.active && touchPointers.size >= 2;
      touchPointers.delete(event.pointerId);

      if (touchPointers.size < 2) {
        this.touchGesture.active = false;
      }

      if (wasCameraGesture) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    resetCanvasPointerGesture: function () {
      touchPointers.clear();
      this.touchGesture.active = false;
    },
    handleVisibilityChange: function () {
      if (document.hidden) {
        this.resetCanvasPointerGesture();
      }
    },
    loadProjectStart: function () {
      listRecentProjects().then((projects) => {
        this.recentProjects = projects;
        this.projectStartVisible = true;
      });
    },
    startNewProject: function ({ name, fileHandle }) {
      createNewProject(name, fileHandle).then(() => {
        this.projectStartVisible = false;
      });
    },
    openProject: function (id) {
      openRecentProject(id).then((opened) => {
        if (opened) {
          this.projectStartVisible = false;
        }
      });
    },
    addGridGuide: function () {
      gridGuide = new THREE.Group();
      gridGuide.name = "gridGuide";

      const divisions = 20;
      const step = 1;
      const halfSize = (divisions * step) / 2;
      const pointsPerAxis = divisions + 1;
      const positions = [];
      const indices = [];
      const minorMaterial = new THREE.LineBasicMaterial({
        color: 0x5677ff,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
      });

      const pointIndex = function (x, y, z) {
        return x + y * pointsPerAxis + z * pointsPerAxis * pointsPerAxis;
      };

      for (let z = 0; z < pointsPerAxis; z++) {
        for (let y = 0; y < pointsPerAxis; y++) {
          for (let x = 0; x < pointsPerAxis; x++) {
            positions.push(
              x * step - halfSize,
              y * step - halfSize,
              z * step - halfSize
            );
          }
        }
      }

      for (let z = 0; z < pointsPerAxis; z++) {
        for (let y = 0; y < pointsPerAxis; y++) {
          for (let x = 0; x < pointsPerAxis; x++) {
            const index = pointIndex(x, y, z);

            if (x + 1 < pointsPerAxis) {
              indices.push(index, pointIndex(x + 1, y, z));
            }
            if (y + 1 < pointsPerAxis) {
              indices.push(index, pointIndex(x, y + 1, z));
            }
            if (z + 1 < pointsPerAxis) {
              indices.push(index, pointIndex(x, y, z + 1));
            }
          }
        }
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3)
      );
      geometry.setIndex(indices);

      gridGuide.add(new THREE.LineSegments(geometry, minorMaterial));
      gridGuide.visible = this.gridGuideVisible;
      scene.add(gridGuide);
    },
    toggleGridGuide: function () {
      this.gridGuideVisible = !this.gridGuideVisible;

      if (gridGuide) {
        gridGuide.visible = this.gridGuideVisible;
      }

      renderer.render(scene, camera);
    },
    animate: function () {
      const delta = clock.getDelta();
      let hasCameraControlsUpdated = cameraControls.update(delta);

      requestAnimationFrame(this.animate);

      if (hasCameraControlsUpdated) {
        renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
        renderer.render(scene, camera);
      }
    },
    setSelectedTool: function (val) {
      this.tool = val;

      if (this.tool === "erase") {
        canvas.visible = false;
        controls.visible = false;
        renderer.render(scene, camera);
      } else if (this.tool === "draw") {
        if (this.$.refs.raycastCanvas.visible === true) {
          canvas.visible = true;
        } else {
          canvas.visible = false;
        }
        if (
          this.$.refs.raycastCanvas.transformationEnabled === true &&
          this.$.refs.raycastCanvas.visible === true
        ) {
          controls.visible = true;
        } else {
          controls.visible = false;
        }
        renderer.render(scene, camera);
      }

      this.toolHistory.push(val);
      if (this.toolHistory.length > 2) {
        this.toolHistory.shift();
      }

      let current = val;
      let previous = this.toolHistory[0];

      undoManager.add({
        undo: function () {
          vm.setSelectedTool(previous);
        },
        redo: function () {
          vm.setSelectedTool(current);
        },
      });

      this.$.refs.undoRedo.updateUi();
    },
    setToolEnabled: function (val) {
      this.toolEnabled = val;
    },
    setMouseCoordinates: function (val) {
      this.mouse = val;
    },
    setSelectedCanvasShape: function (val) {
      this.canvasShape = val;
    },
    setSelectedTool_internal: function (val) {
      //this is a version without undo so that it can be called by the setCenter tool
      this.tool = val;
    },
    setSelectedMultitouch: function (val) {
      this.multitouch = val;

      if (val === "camera") {
        cameraControls.enabled = true;
      } else {
        cameraControls.enabled = false;
      }
    },
    setCameraZoom: function (percent) {
      let nextZoom = THREE.MathUtils.clamp((percent / 100) * 3, 1.5, 4000);
      this.cameraZoomPercent = Math.round((nextZoom / 3) * 100);
      cameraControls.zoomTo(nextZoom, true);
    },
    setSelectedObject: function (val) {
      this.selected = val;
    },
    setTransformToolbarPosition: function (val) {
      this.transformToolbar.top = val.top;
      this.transformToolbar.left = val.left;
      this.transformToolbar.location = val.location;
    },
    setTransformToolbarDisplay: function (val) {
      this.transformToolbar.display = val;
    },
    setStroke: function (val) {
      this.stroke = val;
    },
    setFill: function (val) {
      this.fill = val;
    },
    setModal: function (val) {
      this.modalProp = val;
    },
    setPreview: function (val) {
      this.previewing = val;
    },
  },
  mounted() {
    this.init();
    this.animate();

    // this.mirror = "x";

    vm = this;
    this.cameraResetDisabled = false; //this is an override, I'm not quite sure what sets it to true on mount

    //check if we need to display the tutorial
    if (localStorage.getItem("tut02") === null) {
      localStorage.setItem("tut02", 0);
      this.showTutorialButton = true;
    } else {
      let count = parseInt(window.localStorage.tut02);
      localStorage.setItem("tut02", ++count);
      if (count + 1 <= 5) {
        this.showTutorialButton = true;
      } else {
        this.showTutorialButton = false;
      }
    }
  },
};
</script>

<style>
:root {
  --bg-color: rgb(60, 57, 60);
  --accent-color: rgb(255, 176, 0);
  --accent-color-selected: rgb(228, 156, 0);
  --ui-bg-color: rgb(30, 30, 30);
  --line-color-lightest: rgb(255, 242, 213);
  --line-color-light: rgb(255, 231, 178);
  --line-color-medium: rgb(255, 220, 142);
  --line-color-dark: rgb(255, 209, 107);
}

body,
html,
#app {
  width: 100%;
  height: 100%;
  overflow: hidden;
  margin: 0;
  padding: 0;
  border: 0;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  touch-action: manipulation;
  font-weight: 900;
  color: #1c1c1e;
}

button {
  font-weight: 900;
  color: #1c1c1e;
}

#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100%;
  width: 100%;
}

input[type="radio"] {
  opacity: 0;
  position: fixed;
  width: 0;
}

input[type="radio"]:checked + label {
  background-color: #ffe8b3;
}

input[type="radio"]:not(:checked) + label {
  background-color: #ffffff;
}

.disabled {
  pointer-events: none;
  touch-action: none;
  opacity: 0.6;
}

.hidden {
  display: none;
}

a {
  color: #ffb000;
  text-decoration: none;
}

a:hover {
  color: #ff8400;
}

.grid-guide-toggle {
  position: absolute;
  z-index: 2;
  right: 12px;
  top: 200px;
  height: 36px;
  border: none;
  border-radius: 8px;
  background-color: #fff;
  color: #1c1c1e;
  filter: drop-shadow(0px 0px 24px rgba(0, 0, 0, 0.08));
  font-size: 0.8em;
  padding: 0 12px;
}

.grid-guide-toggle.active {
  background-color: #ffe8b3;
}

@media (min-width: 320px) and (max-width: 480px) {
  #viewport {
    display: none;
  }

  .lineSettings {
    display: none;
  }

  .soapbar {
    display: none;
  }

  .grid-guide-toggle {
    top: 12px;
    right: 12px;
  }

  .canvasSettings {
    top: auto;
    bottom: 12px;
  }
}
</style>
