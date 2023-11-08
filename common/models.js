const parts = {
  mine: ["     OO +OO-    ", " +   OO  OO  -  ", "    -OO+ OO     ", "  -  OO  OO   + "],
  conveyor: [
    "    +O-         ",
    " +   O   -      ",
    "    -O+         ",
    " -   O   +      ",
    "    +OO-        ",
    " +   O   O   -  ",
    "    -OO+        ",
    " -   O   O   +  ",
  ],
  combiner: ["+O +O-+O ", "+++OOO - ", " O+-O+ O+", " - OOO+++"],
  factory: "++++++OOO++OOO++OOO++++++",
};
const anchors = {
  deposit: { x: 0, y: 0 },
  obstacle: { x: 0, y: 0 },
  mine: { x: 1, y: 1 },
  conveyor: { x: 1, y: 1 },
  combiner: { x: 1, y: 1 },
  factory: { x: 0, y: 0 },
};

export class World {
  addError(type, message, details) {
    const baseError = { type, message };
    this.errors.push({ ...baseError, ...(details || {}) });
  }

  parse(raw) {
    this.errors = [];
    if (!raw) {
      this.addError("input", "Raw object must not be falsy");
      return;
    }
    this.width = parseInt(raw.width) || 0;
    if (this.width < 1) {
      this.addError("input", "Width must be > 0");
      return;
    }
    if (this.width > 100) {
      this.addError("input", "Width must be <= 100");
      return;
    }
    this.height = parseInt(raw.height) || 0;
    if (this.height < 1) {
      this.addError("input", "Height must be > 0");
      return;
    }
    if (this.height > 100) {
      this.addError("input", "Height must be <= 100");
      return;
    }
    this.objects = [];
    if (!Array.isArray(raw.objects)) {
      this.addError("input", "Objects must be an array");
      return;
    }
    for (const rawObject of raw.objects) {
      try {
        this.objects.push(World.objectFromRaw(rawObject));
      } catch (error) {
        this.addError("input", error.message, { raw });
        return;
      }
    }
    this.products = [];
    if (!Array.isArray(raw.products)) {
      this.addError("input", "Products must be an array");
      return;
    }
    for (const rawProduct of raw.products) {
      try {
        this.products.push(World.productFromRaw(rawProduct));
      } catch (error) {
        this.addError("input", error.message, { raw });
        return;
      }
    }
    this.turns = parseInt(raw.turns);
    this.time = parseInt(raw.time);
    this.log = [];
    this.logEnabled = true;
    this.update();
  }

  parseObject(raw) {
    const object = World.objectFromRaw(raw);
    this.objects.push(object);
    this.resetSimulation();
    return object;
  }

  parseObjects(raw, disallowGiven) {
    const objects = raw.map((r) => World.objectFromRaw(r));
    if (disallowGiven && objects.some((o) => World.isLandscapeObject(o))) {
      return false;
    }
    this.objects.push(...objects);
    this.resetSimulation();
    return objects;
  }

  parseProducts(raw) {
    this.products = raw.map((p) => World.productFromRaw(p));
    this.resetSimulation();
  }

  toRaw(type) {
    let { objects } = this;
    if (type === "task") {
      objects = objects.filter((o) => World.isLandscapeObject(o));
    }
    return {
      width: this.width,
      height: this.height,
      objects: objects.map((o) => World.objectToRaw(o)),
      products: this.products.filter((p) => World.productToRaw(p)),
      turns: this.turns,
      time: this.time,
    };
  }

  update() {
    this.errors = [];
    this.partsAt = {};
    this.objectsAt = {};
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        this.partsAt[[x, y]] = " ";
        this.objectsAt[[x, y]] = [];
      }
    }
    for (const object of this.objects) {
      switch (object.type) {
        case "deposit":
          object.parts = [];
          for (let y = 0; y < object.height; y++) {
            for (let x = 0; x < object.width; x++) {
              object.parts.push(x === 0 || x === object.width - 1 || y === 0 || y === object.height - 1 ? "-" : "O");
            }
          }
          object.available = object.height * object.width * 5;
          break;
        case "obstacle":
          object.parts = "O".repeat(object.width * object.height);
          break;
        default:
          // Not handled
          break;
      }
      object.partsAt = {};
      object.sources = [];
      object.sinks = [];
      for (let y = object.y - object.anchor.y; y < object.y + object.height - object.anchor.y; y++) {
        for (let x = object.x - object.anchor.x; x < object.x + object.width - object.anchor.x; x++) {
          const part = object.parts[(y - object.y + object.anchor.y) * object.width + (x - object.x + object.anchor.x)];
          if (part === " ") {
            continue;
          }
          if (x < 0 || y < 0 || x > this.width - 1 || y > this.height - 1) {
            this.addError("state", "Object is out of bounds", { coordinates: { x, y } });
            continue;
          }
          if (this.partsAt[[x, y]] !== " ") {
            const intersectable =
              part === "O" && this.objectsAt[[x, y]].every((o) => o.type === "conveyor" && o.partsAt[[x, y]] === "O");
            if (!intersectable) {
              this.addError("state", "Objects intersect", { coordinates: { x, y } });
            }
          }
          this.partsAt[[x, y]] = part;
          this.objectsAt[[x, y]].push(object);
          object.partsAt[[x, y]] = part;
        }
      }
    }
    if (this.errors.length > 0) {
      return;
    }
    for (const object of this.objects) {
      for (const [coordinates, part] of Object.entries(object.partsAt)) {
        const [x, y] = World.splitCoordinates(coordinates);
        if (part !== "+") {
          continue;
        }
        for (const [ax, ay] of this.adjacentCoordinates(x, y)) {
          for (const adjacentObject of this.objectsAt[[ax, ay]]) {
            if (adjacentObject === object) {
              continue;
            }
            if (this.partsAt[[ax, ay]] === "-") {
              if (adjacentObject.type === "deposit" && object.type !== "mine") {
                const message = "Only ingresses of mines may be connected to egresses of deposits";
                this.addError("state", message, { coordinates: { x, y } });
                continue;
              }
              if (adjacentObject.type === "mine" && !["conveyor", "combiner", "factory"].includes(object.type)) {
                const message = "Egresses of mines may only be connected to conveyors, combiners and factories";
                this.addError("state", message, { coordinates: { x: ax, y: ay } });
                continue;
              }
              object.sources.push({ object: adjacentObject, coordinates: { x, y } });
              const connectedSink = adjacentObject.sinks.find((s) => s.coordinates.x === ax && s.coordinates.y === ay);
              if (connectedSink) {
                const message = "Egresses may only be connected to a single ingress";
                this.addError("state", message, { coordinates: connectedSink.coordinates });
                continue;
              }
              adjacentObject.sinks.push({ object, coordinates: { x: ax, y: ay } });
            }
          }
        }
      }
    }
    if (this.turns < 1) {
      this.addError("state", "Number of turns is < 1");
      return;
    }
    if (this.products.length === 0) {
      this.addError("state", "List of products is empty");
      return;
    }
    const productWithInvalidResourceRequirements = this.products.find(
      (p) => World.countResources(p.resources) < 1 || p.resources.some((p2) => p2 < 0)
    );
    if (productWithInvalidResourceRequirements) {
      this.addError(
        "state",
        `Resource requirements of product ${productWithInvalidResourceRequirements.subtype} are invalid`
      );
    }
    this.factories = this.objects.filter((o) => o.type === "factory");
  }

  adjacentCoordinates(x, y) {
    return [
      [x - 1, y],
      [x, y - 1],
      [x + 1, y],
      [x, y + 1],
    ].filter(([ax, ay]) => ax > -1 && ay > -1 && ax < this.width && ay < this.height);
  }

  resize(width, height) {
    this.width = width;
    this.height = height;
    const outOfBoundsObjects = [];
    for (const object of this.objects) {
      for (const coordinates of Object.keys(object.partsAt)) {
        const [x, y] = World.splitCoordinates(coordinates);
        if (x > this.width - 1 || y > this.height - 1) {
          outOfBoundsObjects.push(object);
          break;
        }
      }
    }
    for (const object of outOfBoundsObjects) {
      this.deleteObject(object);
    }
    this.resetSimulation();
  }

  moveObject(object, x, y) {
    object.x = x;
    object.y = y;
    this.resetSimulation();
  }

  resizeObject(object, width, height) {
    object.width = width;
    object.height = height;
    this.resetSimulation();
  }

  deleteObject(object) {
    const index = this.objects.indexOf(object);
    if (index !== -1) {
      this.objects.splice(index, 1);
      this.resetSimulation();
    }
  }

  clearObjects() {
    this.objects = [];
    this.resetSimulation();
  }

  setTurns(turns) {
    this.turns = turns;
    this.resetSimulation();
  }

  setTime(time) {
    this.time = time;
    this.resetSimulation();
  }

  addLog(message, omitTurn) {
    const turn = omitTurn ? "" : `${this.turn} (${this.startOfTurn ? "start" : "end"}): `;
    this.log.push(`${turn}${message}`);
  }

  formatYield() {
    return `[${this.yield
      .filter((q) => q > 0)
      .map((q, i) => `${i}:${q}`)
      .join(", ")}]`;
  }

  acceptResources(object) {
    if (object.totals.incoming === 0) {
      return;
    }
    World.mergeResources(object.incoming, object.storage);
    if (this.logEnabled) {
      const accepts = World.formatResources(object.incoming);
      const holds = World.formatResources(object.storage);
      this.addLog(`${World.formatCoordinates(object)} accepts ${accepts}, holds ${holds}`);
    }
    object.totals.incoming = World.clearResources(object.incoming);
  }

  retrieveResourcesFromDeposit(object) {
    for (const sink of object.sinks) {
      if (object.available > 0) {
        const quantity = Math.min(3, object.available);
        object.available -= quantity;
        sink.object.incoming[object.subtype] += quantity;
        sink.object.totals.incoming += quantity;
        if (this.logEnabled) {
          const takes = World.formatResource(object.subtype, quantity);
          const available = World.formatResource(object.subtype, object.available);
          this.addLog(`${World.formatCoordinates(object)} takes ${takes}, ${available} available`);
        }
      }
    }
  }

  producePossibleProducts(object) {
    let produced = true;
    while (produced) {
      produced = false;
      for (const product of this.products) {
        if (object.subtype !== product.subtype) {
          continue;
        }
        if (object.storage.some((q, i) => q < product.resources[i])) {
          continue;
        }
        for (let i = 0; i < World.numSubtypes.deposit; i++) {
          object.storage[i] -= product.resources[i];
        }
        this.yield[product.subtype]++;
        this.score += product.points;
        this.scoreAtTurn = this.turn;
        produced = true;
        if (this.logEnabled) {
          this.addLog(`${World.formatCoordinates(object)} produces ${product.subtype} (${product.points} points)`);
        }
      }
    }
  }

  resetSimulation() {
    this.update();
    this.log = [];
    this.turn = 1;
    this.scoreAtTurn = 1;
    this.score = 0;
    this.yield = Array(World.numSubtypes.product).fill(0);
    for (const object of this.objects) {
      object.incoming = Array(World.numSubtypes.deposit).fill(0);
      object.storage = Array(World.numSubtypes.deposit).fill(0);
      object.totals = { incoming: 0 };
    }
  }

  simulateStartOfTurn() {
    this.startOfTurn = true;
    for (const object of this.objects) {
      switch (object.type) {
        case "mine":
          this.acceptResources(object);
          break;
        case "conveyor":
          this.acceptResources(object);
          break;
        case "combiner":
          this.acceptResources(object);
          break;
        case "factory":
          this.acceptResources(object);
          break;
        default:
          // Not handled
          break;
      }
    }
  }

  simulateEndOfTurn() {
    this.startOfTurn = false;
    for (const object of this.objects) {
      switch (object.type) {
        case "deposit":
          this.retrieveResourcesFromDeposit(object);
          break;
        case "mine":
          World.transferResourcesToSink(object);
          break;
        case "conveyor":
          World.transferResourcesToSink(object);
          break;
        case "combiner":
          World.transferResourcesToSink(object);
          break;
        default:
          // Not handled
          break;
      }
    }
    for (const factory of this.factories) {
      this.producePossibleProducts(factory);
    }
  }

  simulate() {
    const then = Date.now();
    this.resetSimulation();
    for (; this.turn <= this.turns; this.turn++) {
      this.simulateStartOfTurn();
      this.simulateEndOfTurn();
    }
    this.duration = Date.now() - then;
    if (this.logEnabled) {
      this.addLog(`Yield: ${this.formatYield()}`, true);
      this.addLog(`Score: ${this.score} at turn ${this.scoreAtTurn}`, true);
      this.addLog(`Duration: ${this.duration} ms`, true);
    }
  }

  static objectFromRaw(raw) {
    const object = {
      type: raw.type,
      subtype: parseInt(raw.subtype) || 0,
      x: parseInt(raw.x) || 0,
      y: parseInt(raw.y) || 0,
    };
    const numSubtypes = World.numSubtypes[object.type];
    switch (raw.type) {
      case "deposit":
        object.width = parseInt(raw.width) || 0;
        if (object.width < 1) {
          throw new Error("Width must be > 0");
        }
        object.height = parseInt(raw.height) || 0;
        if (object.height < 1) {
          throw new Error("Height must be > 0");
        }
        object.anchor = anchors.deposit;
        break;
      case "obstacle":
        object.width = parseInt(raw.width) || 0;
        if (object.width < 1) {
          throw new Error("Width must be > 0");
        }
        object.height = parseInt(raw.height) || 0;
        if (object.height < 1) {
          throw new Error("Height must be > 0");
        }
        object.anchor = anchors.obstacle;
        break;
      case "mine":
        object.width = 4;
        object.height = 4;
        if (object.subtype < 0 || object.subtype >= numSubtypes) {
          throw new Error(`Subtype must be between 0 and ${numSubtypes - 1}`);
        }
        object.parts = parts.mine[object.subtype];
        object.anchor = anchors.mine;
        break;
      case "conveyor":
        object.width = 4;
        object.height = 4;
        if (object.subtype < 0 || object.subtype >= numSubtypes) {
          throw new Error(`Subtype must be between 0 and ${numSubtypes - 1}`);
        }
        object.parts = parts.conveyor[object.subtype];
        object.anchor = anchors.conveyor;
        break;
      case "combiner":
        object.width = 3;
        object.height = 3;
        if (object.subtype < 0 || object.subtype >= numSubtypes) {
          throw new Error(`Subtype must be between 0 and ${numSubtypes - 1}`);
        }
        object.parts = parts.combiner[object.subtype];
        object.anchor = anchors.combiner;
        break;
      case "factory":
        object.width = 5;
        object.height = 5;
        if (object.subtype < 0 || object.subtype >= numSubtypes) {
          throw new Error(`Subtype must be between 0 and ${numSubtypes - 1}`);
        }
        object.parts = parts.factory;
        object.anchor = anchors.factory;
        break;
      default:
        throw new Error(`Unknown object type: ${raw.type}`);
    }
    return object;
  }

  static objectToRaw(object) {
    const raw = { type: object.type, x: object.x, y: object.y };
    if (object.type !== "obstacle") {
      raw.subtype = object.subtype;
    }
    if (["deposit", "obstacle"].includes(object.type)) {
      raw.width = object.width;
      raw.height = object.height;
    }
    return raw;
  }

  static productFromRaw(raw) {
    const product = {
      type: "product",
      subtype: raw.subtype,
      resources: raw.resources.map((q) => parseInt(q) || 0),
      points: parseInt(raw.points) || 0,
    };
    if (product.subtype < 0 || product.subtype >= World.numSubtypes.product) {
      throw new Error(`Subtype must be between 0 and ${World.numSubtypes.product - 1}`);
    }
    return product;
  }

  static productToRaw(product) {
    return { type: product.type, subtype: product.subtype, resources: product.resources, points: product.points };
  }

  static isLandscapeObject(object) {
    return ["deposit", "obstacle"].includes(object.type);
  }

  static numSubtypes = {
    deposit: 8,
    obstacle: 0,
    mine: 4,
    combiner: 4,
    conveyor: 8,
    factory: 8,
    product: 8,
  };

  static splitCoordinates(coordinates) {
    return coordinates.split(",").map((c) => parseInt(c) || 0);
  }

  static formatResource(subtype, quantity) {
    return `[${quantity}x${subtype}]`;
  }

  static formatResources(resources) {
    const elements = [];
    for (let i = 0; i < World.numSubtypes.deposit; i++) {
      if (resources[i] > 0) {
        elements.push(`${resources[i]}x${i}`);
      }
    }
    return `[${elements.join(", ")}]`;
  }

  static formatCoordinates(object) {
    return `(${object.x}, ${object.y})`;
  }

  static countResources(resources) {
    return resources.reduce((a, q) => a + q, 0);
  }

  static clearResources(resources) {
    for (let i = 0; i < resources.length; i++) {
      resources[i] = 0;
    }
    return 0;
  }

  static mergeResources(source, target) {
    let delta = 0;
    for (let i = 0; i < source.length; i++) {
      target[i] += source[i];
      delta += source[i];
    }
    return delta;
  }

  static transferResourcesToSink(object) {
    if (object.sinks[0]) {
      object.sinks[0].object.totals.incoming += World.mergeResources(object.storage, object.sinks[0].object.incoming);
      World.clearResources(object.storage);
    }
  }
}
