<script setup>
import { ref, reactive, watch, onMounted, onUnmounted } from "vue";
import { World } from "../../../common/models.js";

const world = reactive(new World());
world.parse({ width: 40, height: 20, objects: [], products: [], turns: 100 });
const hover = reactive({});
const select = reactive({});
const resize = reactive({});
const move = reactive({});
const log = ref([]);
const form = reactive({
  type: "deposit",
  subtype: 0,
  width: world.width,
  height: world.height,
  turns: 100,
  time: 300,
  product: 0,
  products: Array(World.numSubtypes.product),
});
for (let i = 0; i < World.numSubtypes.product; i++) {
  form.products[i] = {
    type: "product",
    subtype: i,
    resources: Array(World.numSubtypes.deposit).fill(0),
    points: 0,
    enabled: false,
  };
}
form.products[0].enabled = true;
form.products[0].points = 10;
form.products[0].resources[0] = 10;

function coordinatesFromDataset(element) {
  const { x, y } = element.dataset;
  return [parseInt(x), parseInt(y)];
}

function nextFormType() {
  switch (form.type) {
    case "deposit":
      return "obstacle";
    case "obstacle":
      return "mine";
    case "mine":
      return "conveyor";
    case "conveyor":
      return "combiner";
    case "combiner":
      return "factory";
    case "factory":
      return "deposit";
    default:
      throw new Error();
  }
}

function isMoveHandle(object, x, y) {
  return object.x === x && object.y === y;
}

function isResizeHandle(object, x, y) {
  return (
    ["deposit", "obstacle"].includes(object.type) &&
    object.x - object.anchor.x + object.width - 1 === x &&
    object.y - object.anchor.y + object.height - 1 === y
  );
}

function isLeftBorder(object, x, y) {
  return x === 0 || !object.partsAt[[x - 1, y]];
}

function isTopBorder(object, x, y) {
  return y === 0 || !object.partsAt[[x, y - 1]];
}

function isRightBorder(object, x, y) {
  return x === world.width - 1 || !object.partsAt[[x + 1, y]];
}

function isBottomBorder(object, x, y) {
  return y === world.height - 1 || !object.partsAt[[x, y + 1]];
}

function isConnectedSink(object, x, y) {
  return (
    object.partsAt[[x, y]] === "-" &&
    object.sinks.length > 0 &&
    object.sinks.find((s) => s.coordinates.x === x && s.coordinates.y === y)
  );
}

function isConnectedSource(object, x, y) {
  return (
    object.partsAt[[x, y]] === "+" &&
    object.sources.length > 0 &&
    object.sources.find((s) => s.coordinates.x === x && s.coordinates.y === y)
  );
}

function gridClasses() {
  return [move.object && "move", resize.object && "resize"];
}

function partClasses(x, y) {
  const [object] = world.objectsAt[[x, y]];
  if (!object) {
    return ["empty"];
  }
  const classes = [
    "object",
    `${object.type}`,
    (move.object || isMoveHandle(object, x, y)) && "move",
    (resize.object || isResizeHandle(object, x, y)) && "resize",
    isLeftBorder(object, x, y) && "border-left",
    isTopBorder(object, x, y) && "border-top",
    isRightBorder(object, x, y) && "border-right",
    isBottomBorder(object, x, y) && "border-bottom",
  ];
  for (const error of world.errors) {
    if (error.coordinates && x === error.coordinates.x && y === error.coordinates.y) {
      classes.push("error");
      return classes;
    }
  }
  if (object === select.object) {
    classes.push("selected");
  }
  if (isConnectedSource(object, x, y) || isConnectedSink(object, x, y)) {
    classes.push("connected");
  }
  return classes;
}

function partText(x, y) {
  const [object] = world.objectsAt[[x, y]];
  if (!object) {
    return undefined;
  }
  if (isResizeHandle(object, x, y)) {
    return "⤡";
  }
  if (isMoveHandle(object, x, y)) {
    return "✥";
  }
  const part = object.partsAt[[x, y]];
  switch (part) {
    case "+":
    case "-":
      return part;
    default:
      switch (object.type) {
        case "obstacle":
          return "×";
        case "deposit":
          return `${object.subtype}`;
        case "mine":
          return "⛏";
        case "conveyor":
          return ">";
        case "combiner":
          return "⪢";
        case "factory":
          return [1, 3].includes(x - object.x) || [1, 3].includes(y - object.y) ? "⛮" : `${object.subtype}`;
        default:
          throw new Error();
      }
  }
}

function rawObject(x, y) {
  switch (form.type) {
    case "deposit":
      return { type: "deposit", subtype: form.subtype, x, y, width: 3, height: 3 };
    case "obstacle":
      return { type: "obstacle", x, y, width: 3, height: 3 };
    case "mine":
      return { type: "mine", subtype: form.subtype, x, y };
    case "conveyor":
      return { type: "conveyor", subtype: form.subtype, x, y };
    case "combiner":
      return { type: "combiner", subtype: form.subtype, x, y };
    case "factory":
      return { type: "factory", subtype: form.subtype, x, y };
    default:
      throw new Error();
  }
}

function deleteSelectedObject() {
  if (!select.object) {
    return;
  }
  world.deleteObject(select.object);
  delete select.object;
}

function resizeWorld() {
  world.resize(form.width, form.height);
}

function runSimulation() {
  world.simulate();
  log.value = [...world.log];
}

function resetSimulation() {
  world.resetSimulation();
  log.value = [];
}

function importWorld() {
  const input = document.createElement("input");
  input.addEventListener("change", () => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result && input.files && input.files.length > 0) {
        const raw = JSON.parse(reader.result);
        world.parse(raw);
        form.width = world.width;
        form.height = world.height;
        form.turns = world.turns;
        form.time = world.time;
        form.products = [];
        for (let i = 0; i < World.numSubtypes.product; i++) {
          const product = world.products.find((p) => p.subtype === i);
          form.products[i] = {
            type: "product",
            subtype: i,
            resources: product ? product.resources : Array(World.numSubtypes.deposit).fill(0),
            points: product ? product.points : 0,
            enabled: Boolean(product),
          };
        }
        resetSimulation();
      }
    };
    if (input.files && input.files.length > 0) {
      reader.readAsText(input.files[0]);
    }
  });
  input.type = "file";
  input.click();
}

function download(name, mimeType, raw) {
  const a = document.createElement("a");
  a.setAttribute("download", name);
  a.href = `data:${mimeType};base64,${btoa(JSON.stringify(raw))}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function exportWorld() {
  const raw = world.toRaw("complete");
  download(`profit.${Date.now()}.json`, "application/json", raw);
}

function exportWorldTask() {
  const raw = world.toRaw("task");
  download(`profit.task.${Date.now()}.json`, "application/json", raw);
}

function onPartMouseEnter(event) {
  const [x, y] = coordinatesFromDataset(event.target);
  hover.coordinates = [x, y];
  if (hover.object) {
    world.deleteObject(hover.object);
    delete hover.object;
  }
  if (move.object) {
    if (event.button === 0) {
      world.moveObject(move.object, x, y);
    } else {
      delete move.object;
    }
    return;
  }
  if (resize.object) {
    if (event.button === 0) {
      if (x >= resize.object.x && y >= resize.object.y) {
        world.resizeObject(resize.object, x - resize.object.x + 1, y - resize.object.y + 1);
      }
    } else {
      delete resize.object;
    }
  }
  const [object] = world.objectsAt[[x, y]];
  if (!object) {
    hover.object = world.parseObject(rawObject(x, y));
  }
}

function onGridMouseDown() {
  const [x, y] = hover.coordinates;
  if (hover.object) {
    world.deleteObject(hover.object);
    delete hover.object;
    select.object = world.parseObject(rawObject(x, y));
    return;
  }
  const [object] = world.objectsAt[[x, y]];
  if (!object) {
    delete select.object;
    return;
  }
  select.object = object;
  if (isMoveHandle(object, x, y)) {
    move.object = object;
    return;
  }
  if (isResizeHandle(object, x, y)) {
    resize.object = object;
  }
}

function onGridMouseUp() {
  delete move.object;
  delete resize.object;
}

function onGridMouseLeave() {
  if (hover.object) {
    world.deleteObject(hover.object);
    delete hover.object;
  }
  delete move.object;
  delete resize.object;
}

function onDocumentKeyDown(event) {
  switch (event.code) {
    case "Delete":
      deleteSelectedObject();
      break;
    case "Space":
      if (event.ctrlKey) {
        form.type = nextFormType();
      } else {
        form.subtype++;
        if (form.subtype === World.numSubtypes[form.type]) {
          form.subtype = 0;
        }
      }
      {
        world.deleteObject(hover.object);
        const [x, y] = hover.coordinates;
        hover.object = world.parseObject(rawObject(x, y));
      }
      break;
    default:
      // Not handled
      break;
  }
}

watch(
  () => form.type,
  () => (form.subtype = 0)
);
watch(
  () => form.turns,
  (t) => world.setTurns(t),
  { immediate: true }
);
watch(
  () => form.time,
  (t) => world.setTime(t),
  { immediate: true }
);
watch(
  () => form.products,
  () => world.parseProducts(form.products.filter((p) => p.enabled)),
  { deep: true, immediate: true }
);
onMounted(() => document.addEventListener("keydown", onDocumentKeyDown));
onUnmounted(() => document.removeEventListener("keydown", onDocumentKeyDown));
</script>

<template>
  <div class="world">
    <table :class="gridClasses()" @mousedown="onGridMouseDown" @mouseup="onGridMouseUp" @mouseleave="onGridMouseLeave">
      <tr>
        <td><div></div></td>
        <td v-for="(_, x) in world.width" :key="x">
          <div>{{ x }}</div>
        </td>
      </tr>
      <tr v-for="(_, y) in world.height" :key="y">
        <td>
          <div>{{ y }}</div>
        </td>
        <td v-for="(_, x) in world.width" :key="x" :class="partClasses(x, y)">
          <div :data-x="x" :data-y="y" @mouseenter="onPartMouseEnter">
            {{ partText(x, y) }}
          </div>
        </td>
      </tr>
    </table>
    <div class="bottom left">
      <div v-if="world.errors.length > 0" class="errors">
        <h1>Errors</h1>
        <div>
          <ul>
            <li v-for="(error, i) in world.errors" :key="i" :class="i % 2 && 'even'">
              <span v-if="error.coordinates">({{ error.coordinates.x }}, {{ error.coordinates.y }}): </span>
              {{ error.message }}
            </li>
          </ul>
        </div>
      </div>
      <div v-if="log.length > 0" class="log">
        <h1>Log</h1>
        <div>
          <ul>
            <li v-for="(entry, i) in log" :key="i" :class="i % 2 && 'even'">
              {{ entry }}
            </li>
          </ul>
        </div>
      </div>
    </div>
    <div class="bottom right">
      <div class="controls">
        <h1>Dimensions</h1>
        <p>
          <span>Width:</span>
          <input v-model="form.width" type="number" style="width: 50px" />
          <span>Height:</span>
          <input v-model="form.height" type="number" style="width: 50px" />
          <button @click="resizeWorld">Resize</button>
        </p>
        <h1>Objects</h1>
        <p class="hint">[Left]: insert, [Space]: next subtype, [Ctrl]+[Space]: next type, [Delete]: delete selected.</p>
        <p>
          <select v-model="form.type">
            <option value="deposit">Deposit</option>
            <option value="obstacle">Obstacle</option>
            <option value="mine">Mine</option>
            <option value="conveyor">Conveyor</option>
            <option value="combiner">Combiner</option>
            <option value="factory">Factory</option>
          </select>
          <select v-if="World.numSubtypes[form.type] > 0" v-model="form.subtype">
            <option v-for="(_, i) in World.numSubtypes[form.type]" :key="i" :value="i">Subtype {{ i }}</option>
          </select>
          <button :disabled="!select.object" @click="deleteSelectedObject">Delete selected</button>
        </p>
        <h1>Products</h1>
        <p>
          <select v-model="form.product">
            <option v-for="(_, i) in World.numSubtypes.product" :key="i" :value="i">
              Product {{ i }}{{ form.products[i].enabled ? " *" : "" }}
            </option>
          </select>
        </p>
        <p>
          <label><span>Enabled:</span><input v-model="form.products[form.product].enabled" type="checkbox" /></label>
          <span>Points:</span><input v-model="form.products[form.product].points" type="number" style="width: 50px" />
        </p>
        <p>Resource requirements:</p>
        <div>
          <table>
            <tr>
              <th v-for="(_, i) in World.numSubtypes.deposit" :key="i">{{ i }}</th>
            </tr>
            <tr>
              <td v-for="(_, i) in World.numSubtypes.deposit" :key="i">
                <input v-model="form.products[form.product].resources[i]" style="width: 100%" />
              </td>
            </tr>
          </table>
        </div>
        <h1>Simulation</h1>
        <p>
          <span>Turns:</span>
          <input v-model="form.turns" type="number" style="width: 50px" />
          <span>Time:</span>
          <input v-model="form.time" type="number" style="width: 50px" />
          <button :disabled="world.errors.length > 0" @click="runSimulation">Run</button>
          <button @click="resetSimulation">Reset</button>
        </p>
        <h1>Persistence</h1>
        <p>
          <button @click="importWorld">Import</button>
          <button @click="exportWorld">Export</button>
          <button @click="exportWorldTask">Export (task)</button>
        </p>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
table {
  border-collapse: collapse;

  &.move {
    cursor: move;
  }

  &.resize {
    cursor: nwse-resize;
  }
}

td,
th {
  padding: 0;
  width: 20px;
  height: 20px;
  border: 1px solid lightgray;
  user-select: none;

  &.empty {
    cursor: default;
  }

  &.object {
    cursor: pointer;
    background-color: lightsteelblue;

    &.move {
      cursor: move;
    }

    &.resize {
      cursor: nwse-resize;
    }

    &.selected {
      background-color: lightskyblue;
    }

    &.connected {
      background-color: lightgreen;
    }

    &.error {
      background-color: lightcoral;
    }

    &.border-left {
      div {
        border-left: 1px solid black;
      }
    }

    &.border-top {
      div {
        border-top: 1px solid black;
      }
    }

    &.border-right {
      div {
        border-right: 1px solid black;
      }
    }

    &.border-bottom {
      div {
        border-bottom: 1px solid black;
      }
    }
  }

  div {
    width: 20px;
    height: 20px;
    line-height: 20px;
    text-align: center;
    user-select: none;
  }
}

th {
  background: lightgray;
  font-weight: normal;
}

div {
  &.world {
    display: flex;
    flex: 1;
    padding: 10px;
  }

  &.controls {
    width: 400px;
    border: 1px solid lightgray;
    box-shadow: 2px 2px 5px 0px lightgray;
    background: white;

    h1 {
      background: lightgray;
    }

    p {
      margin-top: 0;
      margin-bottom: 10px;
      padding: 0 10px;

      &.hint {
        font-style: italic;
      }
    }

    label {
      display: inline-flex;
      flex-direction: row;
      align-items: center;
    }

    span,
    input,
    select,
    button,
    label {
      margin-right: 10px;

      &:last-child {
        margin-right: 0;
      }
    }

    div {
      padding: 10px;
      padding-top: 0;
    }

    table {
      width: 100%;
    }
  }

  &.bottom {
    position: fixed;
    bottom: 10px;

    div {
      margin-bottom: 10px;

      &:last-child {
        margin-bottom: 0;
      }
    }

    &.left {
      left: 10px;
    }

    &.right {
      right: 10px;
    }
  }

  &.errors {
    display: flex;
    flex-direction: column;
    width: 400px;
    max-height: 250px;
    border: 1px solid lightcoral;
    box-shadow: 2px 2px 5px 0px lightcoral;
    background: white;

    h1 {
      margin-bottom: 0;
      background: lightcoral;
    }

    ul {
      margin: 0;
      padding: 0;
      list-style-type: none;
    }

    li {
      padding: 5px;

      &.even {
        background: lighten(lightcoral, 20%);
      }
    }

    div {
      overflow-y: auto;
    }
  }

  &.log {
    display: flex;
    flex-direction: column;
    width: 400px;
    max-height: 250px;
    border: 1px solid lightgreen;
    box-shadow: 2px 2px 5px 0px lightgreen;
    background: white;

    h1 {
      margin-bottom: 0;
      background: lightgreen;
    }

    ul {
      margin: 0;
      padding: 0;
      list-style-type: none;
    }

    li {
      padding: 5px;

      &.even {
        background: lighten(lightgreen, 20%);
      }
    }

    div {
      overflow-y: auto;
    }
  }
}

h1 {
  margin-top: 0;
  margin-bottom: 10px;
  padding: 5px;
  font-size: 100%;
  font-weight: normal;
  text-align: center;
}
</style>
