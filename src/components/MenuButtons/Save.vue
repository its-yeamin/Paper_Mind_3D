<template>
  <button @click="exportToJson">Export Backup</button>
</template>

<script>
import { serializeProject } from "../projectStorage.js";

export default {
  name: "Save",
  props: {},
  data() {
    return {};
  },
  methods: {
    exportToJson: function () {
      const project = serializeProject();
      var dataStr =
        "data:text/json;charset=utf-8," +
        encodeURIComponent(JSON.stringify(project));

      var filename = prompt("Enter a name for your file", "sketch");

      if (filename != null) {
        var el = document.createElement("a");
        el.setAttribute("href", dataStr);
        el.setAttribute("download", filename + ".penzil");
        el.click();
      }
    },
  },
  watch: {},
  mounted() {},
};
</script>

<style scoped>
</style>
