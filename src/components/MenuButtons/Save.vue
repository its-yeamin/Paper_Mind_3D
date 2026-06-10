<template>
  <button @click="exportToJson">Export Backup</button>
</template>

<script>
import {
  exportProjectWithPicker,
  serializeProject,
} from "../projectStorage.js";

export default {
  name: "Save",
  props: {},
  data() {
    return {};
  },
  methods: {
    exportToJson: async function () {
      const project = serializeProject();
      const filename = prompt("Enter a name for your file", project.name || "Untitled");

      if (filename == null) return;

      await exportProjectWithPicker(project, filename);
    },
  },
  watch: {},
  mounted() {},
};
</script>

<style scoped>
</style>
