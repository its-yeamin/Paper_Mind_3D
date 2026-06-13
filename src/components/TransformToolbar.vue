<template>
  <div
    class="transform-toolbar"
    v-bind:style="[
      location == 'above'
        ? {
            top: 'calc(' + posTop + 'px - 88px',
            left: 'calc(' + posLeft + 'px - 76px)',
          }
        : {
            top: 'calc(' + posTop + 'px + 88px',
            left: 'calc(' + posLeft + 'px - 76px)',
          },
    ]"
    v-bind:class="{ hide: !display }"
  >
    <span>
      <span>
        <input
          type="radio"
          id="translate"
          name="transformations"
          value="translate"
          v-model="selectedTransformation"
          checked
        /><label for="translate" title="Move"
          ><img src="@/assets/icons/translate.svg" alt="Move"
        /></label>
        <div></div>
      </span>
      <span>
        <input
          type="radio"
          id="rotate"
          name="transformations"
          value="rotate"
          v-model="selectedTransformation"
        /><label for="rotate" title="Rotate">R</label>
        <div></div>
      </span>
      <span>
        <input
          type="radio"
          id="scale"
          name="transformations"
          value="scale"
          v-model="selectedTransformation"
        /><label for="scale" title="Scale"
          ><img src="@/assets/icons/scale.svg" alt="Scale"
        /></label>
        <div></div>
      </span>
    </span>

    <button
      v-bind:class="{ hide: selectedTool == 'model' }"
      @click="duplicate"
      title="Duplicate"
    >
      D
    </button>
  </div>
</template>

<script>
import { select } from "./select.js";
import { scene, renderer, camera } from "../App.vue";

export default {
  name: "TransformToolbar",
  props: {
    top: Number,
    left: Number,
    location: String,
    display: Boolean,
    selectedTool: String,
  },
  data() {
    return {
      selectedTransformation: "translate",
      posTop: 0,
      posLeft: 0,
    };
  },
  methods: {
    duplicate: function () {
      select.s.duplicate();
    },
  },
  watch: {
    selectedTransformation: function (val) {
      if (this.selectedTool == "select") {
        select.s.controls.mode = val;
        //this maintains the selection from the last used transformation
        this.selectedTransformation = val;
        select.transformMode = val;
        select.s.helper.update();
      }
      if (this.selectedTool == "model") {
        let controls = scene.getObjectByName("canvasTransformControls");
        this.selectedTransformation = val;
        controls.mode = this.selectedTransformation;
      }
      renderer.render(scene, camera);
    },
    display: function (val) {
      if (val) {
        //this maintains the selection from the last used transformation
        if (this.selectedTool == "select") {
          select.s.controls.mode = this.selectedTransformation;
        }
        if (this.selectedTool == "model") {
          let controls = scene.getObjectByName("canvasTransformControls");
          controls.mode = this.selectedTransformation;
        }
      }
    },
    top: function (val) {
      //this needs to be improved further

      if (val >= window.innerHeight) {
        this.posTop = window.innerHeight - 60;
      } else {
        this.posTop = val;
      }
    },
    left: function (val) {
      if (val >= window.innerWidth) {
        this.posLeft = window.innerWidth;
      } else {
        this.posLeft = val;
      }
    },
  },
  mounted() {},
};
</script>

<style scoped>
.transform-toolbar {
  padding: 5px;
  position: absolute;
  z-index: 999;
  background-color: rgba(255, 255, 255, 0.96);
  color: #1c1c1e;
  width: 152px;
  border-radius: 18px;
  align-content: center;
  display: flex;
  flex-direction: row;
  gap: 4px;
  filter: drop-shadow(0px 4px 14px rgba(0, 0, 0, 0.12));
}

.transform-toolbar > span {
  display: flex;
  gap: 4px;
}

button {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 16px;
  background-color: transparent;
  color: #1c1c1e;
  font-weight: 900;
  padding: 0;
}

label {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 16px;
  color: #1c1c1e;
  font-size: 0.85em;
  font-weight: 900;
}

label img {
  width: 18px;
  height: 18px;
}

input[type="radio"]:checked + label,
button:hover,
button:focus {
  background-color: #ffe8b3;
}

.hide {
  display: none;
}
</style>
