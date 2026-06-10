<template>
  <button @click="importFromJson">{{ text }}</button>
</template>

<script>
import {
  createProjectFromBackup,
} from "../projectStorage.js";

export default {
  name: "Load",
  props: {},
  data() {
    return {
      text: "Import Backup",
    };
  },
  methods: {
    importFromJson: function () {
      var file;
      var input = document.createElement("input");
      input.style.display = "none";
      input.type = "file";
      input.accept = ".penzil,.json,application/json";
      document.body.appendChild(input);
      input.onchange = (event) => {
        file = event.target.files[0];
        function onReaderLoad(event) {
          var project = JSON.parse(event.target.result);
          createProjectFromBackup(project, file.name.replace(/\.(penzil|json)$/i, ""));
        }
        if (
          file.type == "application/json" ||
          file.name.endsWith(".json") ||
          file.name.endsWith(".penzil")
        ) {
          var reader = new FileReader();
          reader.onload = onReaderLoad;
          reader.readAsText(file);
        } else {
          //   app.toast.show = true;
          //   app.toast.text = "Error. File type not correct";
          //   setTimeout(function () {
          //     app.toast.show = false;
          //   }, 2000);
        }
      };
      input.click();
    },
    // updateText: function (index, length) {
    //   this.text = "Loading " + index + "/" + length;
    // },
  },
  watch: {},
  mounted() {},
};
</script>

<style scoped>
</style>
