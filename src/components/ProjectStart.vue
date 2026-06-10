<template>
  <div class="project-start">
    <div class="project-start-panel">
      <h1>Paper Mind 3D</h1>
      <div class="project-start-actions">
        <button type="button" @click="mode = 'new'">New Canvas</button>
      </div>

      <section v-if="mode === 'new'" class="new-project-form">
        <input
          v-model="projectName"
          placeholder="Untitled"
          @keydown.enter="startNewProject"
        />
        <button type="button" @click="chooseLocation">
          {{ fileHandle ? "Location Selected" : "Choose Location" }}
        </button>
        <button type="button" @click="startNewProject">Create</button>
      </section>

      <section class="recent-projects">
        <h2>Recent Canvas</h2>
        <button
          v-for="project in recentProjects"
          :key="project.id"
          type="button"
          class="recent-project"
          @click="$emit('open-project', project.id)"
        >
          <span>{{ project.name }}</span>
          <small>{{ formatDate(project.updatedAt) }}</small>
        </button>
        <p v-if="recentProjects.length === 0">No recent canvas</p>
      </section>
    </div>
  </div>
</template>

<script>
import { pickProjectFile } from "./projectStorage.js";

export default {
  name: "ProjectStart",
  props: {
    recentProjects: Array,
  },
  emits: ["new-project", "open-project"],
  data() {
    return {
      mode: "",
      projectName: "",
      fileHandle: undefined,
    };
  },
  methods: {
    formatDate(value) {
      if (!value) return "";

      return new Date(value).toLocaleString();
    },
    async chooseLocation() {
      this.fileHandle = await pickProjectFile(this.projectName || "Untitled");
    },
    startNewProject() {
      this.$emit("new-project", {
        name: this.projectName || "Untitled",
        fileHandle: this.fileHandle,
      });
    },
  },
};
</script>

<style scoped>
.project-start {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(230, 237, 245, 0.94);
}

.project-start-panel {
  width: min(420px, calc(100vw - 32px));
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 20px;
  border: 1px solid rgba(28, 28, 30, 0.12);
  border-radius: 8px;
  background: #ffffff;
  color: #1c1c1e;
}

h1,
h2,
p {
  margin: 0;
}

h1 {
  font-size: 1.2rem;
}

h2 {
  font-size: 0.9rem;
}

button,
input {
  min-height: 36px;
  border: 1px solid rgba(28, 28, 30, 0.16);
  border-radius: 6px;
  background: #fff;
  color: #1c1c1e;
  font: inherit;
}

button {
  cursor: pointer;
  font-weight: 700;
}

input {
  padding: 0 10px;
}

.project-start-actions,
.new-project-form,
.recent-projects {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recent-project {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 0 10px;
  text-align: left;
}

small {
  opacity: 0.68;
}
</style>
