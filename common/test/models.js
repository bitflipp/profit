import expect from "expect.js";
import { World } from "../models.js";

describe("World.parse", () => {
  it("should handle raw object", () => {
    for (const input of [undefined, null, false]) {
      const world = new World();
      world.parse(input);
      const [error] = world.errors;
      expect(error.message).to.equal("Raw object must not be falsy");
    }
  });
  it("should handle invalid width", () => {
    for (const width of [undefined, -1, "-1"]) {
      const world = new World();
      world.parse({ width });
      const [error] = world.errors;
      expect(error.message).to.equal("Width must be > 0");
    }
    for (const width of [101, 1001]) {
      const world = new World();
      world.parse({ width });
      const [error] = world.errors;
      expect(error.message).to.equal("Width must be <= 100");
    }
  });
  it("should handle invalid height", () => {
    for (const height of [undefined, -1, "-1"]) {
      const world = new World();
      world.parse({ width: 1, height });
      const [error] = world.errors;
      expect(error.message).to.equal("Height must be > 0");
    }
    for (const height of [101, 1001]) {
      const world = new World();
      world.parse({ width: 1, height });
      const [error] = world.errors;
      expect(error.message).to.equal("Height must be <= 100");
    }
  });
  it("should handle invalid objects", () => {
    for (const objects of [undefined, {}]) {
      const world = new World();
      world.parse({ width: 1, height: 1, objects });
      const [error] = world.errors;
      expect(error.message).to.equal("Objects must be an array");
    }
  });
  it("should handle invalid products", () => {
    for (const products of [undefined, {}]) {
      const world = new World();
      world.parse({ width: 1, height: 1, objects: [], products });
      const [error] = world.errors;
      expect(error.message).to.equal("Products must be an array");
    }
  });
});

function worldWithObjects(objects) {
  const world = new World();
  const products = [{ type: "product", subtype: 0, resources: Array(8).fill(1), points: 0 }];
  world.parse({ width: 10, height: 10, objects, products, turns: 10, time: 10 });
  return world;
}

describe("World.objectFromRaw", () => {
  it("should handle invalid deposit width", () => {
    for (const width of [undefined, -1, "-1"]) {
      const world = worldWithObjects([{ type: "deposit", width }]);
      const [error] = world.errors;
      expect(error.message).to.equal("Width must be > 0");
    }
  });
  it("should handle invalid deposit height", () => {
    for (const height of [undefined, -1, "-1"]) {
      const world = worldWithObjects([{ type: "deposit", width: 1, height }]);
      const [error] = world.errors;
      expect(error.message).to.equal("Height must be > 0");
    }
  });
  it("should handle valid deposit", () => {
    const world = worldWithObjects([{ type: "deposit", width: 3, height: 3 }]);
    expect(world.errors).to.be.empty();
  });
  it("should handle invalid obstacle width", () => {
    for (const width of [undefined, -1, "-1"]) {
      const world = worldWithObjects([{ type: "obstacle", width }]);
      const [error] = world.errors;
      expect(error.message).to.equal("Width must be > 0");
    }
  });
  it("should handle invalid obstacle height", () => {
    for (const height of [undefined, -1, "-1"]) {
      const world = worldWithObjects([{ type: "obstacle", width: 1, height }]);
      const [error] = world.errors;
      expect(error.message).to.equal("Height must be > 0");
    }
  });
  it("should handle valid obstacle", () => {
    const world = worldWithObjects([{ type: "obstacle", width: 3, height: 3 }]);
    expect(world.errors).to.be.empty();
  });
  it("should handle invalid mine subtype", () => {
    for (const subtype of [-1, 4]) {
      const world = worldWithObjects([{ type: "mine", x: 3, y: 3, subtype }]);
      const [error] = world.errors;
      expect(error.message).to.equal("Subtype must be between 0 and 3");
    }
  });
  it("should handle valid mine", () => {
    const world = worldWithObjects([{ type: "mine", x: 3, y: 3, subtype: 0 }]);
    expect(world.errors).to.be.empty();
  });
  it("should handle invalid conveyor subtype", () => {
    for (const subtype of [-1, 8]) {
      const world = worldWithObjects([{ type: "conveyor", x: 3, y: 3, subtype }]);
      const [error] = world.errors;
      expect(error.message).to.equal("Subtype must be between 0 and 7");
    }
  });
  it("should handle valid conveyor", () => {
    const world = worldWithObjects([{ type: "conveyor", x: 3, y: 3, subtype: 0 }]);
    expect(world.errors).to.be.empty();
  });
  it("should handle invalid combiner subtype", () => {
    for (const subtype of [-1, 4]) {
      const world = worldWithObjects([{ type: "combiner", x: 3, y: 3, subtype }]);
      const [error] = world.errors;
      expect(error.message).to.equal("Subtype must be between 0 and 3");
    }
  });
  it("should handle valid combiner", () => {
    const world = worldWithObjects([{ type: "combiner", x: 3, y: 3, subtype: 0 }]);
    expect(world.errors).to.be.empty();
  });
  it("should handle invalid factory subtype", () => {
    for (const subtype of [-1, 8]) {
      const world = worldWithObjects([{ type: "factory", x: 3, y: 3, subtype }]);
      const [error] = world.errors;
      expect(error.message).to.equal("Subtype must be between 0 and 7");
    }
  });
  it("should handle valid factory", () => {
    const world = worldWithObjects([{ type: "factory", x: 3, y: 3, subtype: 0 }]);
    expect(world.errors).to.be.empty();
  });
  it("should handle unknown object type", () => {
    const world = worldWithObjects([{ type: "unknown" }]);
    const [error] = world.errors;
    expect(error.message).to.equal("Unknown object type: unknown");
  });
});

function worldWithProducts(products) {
  const world = new World();
  world.parse({ width: 10, height: 10, objects: [], products });
  return world;
}

describe("World.productFromRaw", () => {
  it("should handle invalid product subtype", () => {
    for (const subtype of [-1, 8]) {
      const world = worldWithProducts([{ type: "product", subtype, resources: Array(8).fill(1), points: 0 }]);
      const [error] = world.errors;
      expect(error.message).to.equal("Subtype must be between 0 and 7");
    }
  });
  it("should handle valid product", () => {
    const world = worldWithProducts([{ type: "product", subtype: 0, resources: Array(8).fill(1), points: 0 }]);
    expect(world.errors).to.be.empty();
  });
});

describe("World.update", () => {
  it("should handle objects out of bounds", () => {
    for (const [x, y] of [
      [-1, -1],
      [0, 8],
      [8, 0],
      [8, 8],
    ]) {
      const world = worldWithObjects([{ type: "deposit", width: 3, height: 3, x, y }]);
      const [error] = world.errors;
      expect(error.message).to.equal("Object is out of bounds");
    }
  });
  it("should handle invalid intersections", () => {
    const world = worldWithObjects([
      { type: "conveyor", subtype: 0, width: 3, height: 3, x: 2, y: 1 },
      { type: "conveyor", subtype: 1, width: 3, height: 3, x: 2, y: 2 },
    ]);
    const [error] = world.errors;
    expect(error.message).to.equal("Objects intersect");
  });
  it("should handle valid intersections", () => {
    const world = worldWithObjects([
      { type: "conveyor", subtype: 0, x: 2, y: 2 },
      { type: "conveyor", subtype: 1, x: 2, y: 2 },
    ]);
    expect(world.errors).to.be.empty();
  });
  it("should handle invalid deposit sinks", () => {
    const world = worldWithObjects([
      { type: "deposit", subtype: 0, x: 0, y: 0, width: 3, height: 3 },
      { type: "conveyor", subtype: 0, x: 4, y: 1 },
    ]);
    const [error] = world.errors;
    expect(error.message).to.equal("Only ingresses of mines may be connected to egresses of deposits");
  });
  it("should handle invalid mine sinks", () => {
    const world = worldWithObjects([
      { type: "mine", subtype: 0, x: 1, y: 0 },
      { type: "mine", subtype: 0, x: 5, y: 0 },
    ]);
    const [error] = world.errors;
    expect(error.message).to.equal("Egresses of mines may only be connected to conveyors, combiners and factories");
  });
  it("should handle ingresses connected to multiple egresses", () => {
    const world = worldWithObjects([
      { type: "conveyor", x: 1, y: 3, subtype: 0 },
      { type: "conveyor", x: 2, y: 1, subtype: 3 },
      { type: "conveyor", x: 2, y: 5, subtype: 1 },
    ]);
    const [error] = world.errors;
    expect(error.message).to.equal("Egresses may only be connected to a single ingress");
  });
  it("should handle invalid turns", () => {
    for (const turns of [-1, 0]) {
      const world = new World();
      world.parse({ width: 10, height: 10, objects: [], products: [], turns });
      const [error] = world.errors;
      expect(error.message).to.equal("Number of turns is < 1");
    }
  });
  it("should handle empty product list", () => {
    const world = new World();
    world.parse({ width: 10, height: 10, objects: [], products: [], turns: 1 });
    const [error] = world.errors;
    expect(error.message).to.equal("List of products is empty");
  });
  it("should handle products with invalid resource requirements", () => {
    for (const cost of [undefined, "-1", "0", -1, 0]) {
      const world = worldWithProducts([{ type: "product", subtype: 0, resources: Array(8).fill(cost), points: 1 }]);
      const [error] = world.errors;
      expect(error.message).to.equal("Resource requirements of product 0 are invalid");
    }
  });
});

describe("Public API", () => {
  it("World.resize should work", () => {
    const world = worldWithObjects([
      { type: "deposit", x: 3, y: 3, width: 3, height: 3 },
      { type: "deposit", x: 0, y: 0, width: 1, height: 1 },
    ]);
    expect(world.objects.length).to.equal(2);
    world.resize(1, 2);
    expect(world.width).to.equal(1);
    expect(world.height).to.equal(2);
    expect(world.objects.length).to.equal(1);
  });
  it("World.moveObject should work", () => {
    const world = worldWithObjects([{ type: "deposit", x: 0, y: 0, width: 3, height: 3 }]);
    const [object] = world.objects;
    expect(object.x).to.equal(0);
    expect(object.y).to.equal(0);
    world.moveObject(object, 1, 2);
    const [object2] = world.objects;
    expect(object2.x).to.equal(1);
    expect(object2.y).to.equal(2);
  });
  it("World.resizeObject should work", () => {
    const world = worldWithObjects([{ type: "deposit", x: 0, y: 0, width: 3, height: 3 }]);
    const [object] = world.objects;
    expect(object.width).to.equal(3);
    expect(object.height).to.equal(3);
    world.resizeObject(object, 1, 2);
    const [object2] = world.objects;
    expect(object2.width).to.equal(1);
    expect(object2.height).to.equal(2);
  });
  it("World.clearObjects should work", () => {
    const world = worldWithObjects([{ type: "deposit", x: 0, y: 0, width: 3, height: 3 }]);
    expect(world.objects).not.to.be.empty();
    world.clearObjects();
    expect(world.objects).to.be.empty();
  });
  it("World.setTurns should work", () => {
    const world = worldWithObjects([]);
    expect(world.turns).to.equal(10);
    world.setTurns(5);
    expect(world.turns).to.equal(5);
  });
  it("World.setTime should work", () => {
    const world = worldWithObjects([]);
    expect(world.time).to.equal(10);
    world.setTime(5);
    expect(world.time).to.equal(5);
  });
  it("World.parseObject should work", () => {
    const world = worldWithObjects([]);
    expect(world.objects).to.be.empty();
    world.parseObject({ type: "deposit", x: 0, y: 0, width: 3, height: 3 });
    expect(world.objects.length).to.equal(1);
  });
  it("World.parseObjects should work", () => {
    const world = worldWithObjects([]);
    expect(world.objects).to.be.empty();
    world.parseObjects([
      { type: "deposit", x: 0, y: 0, width: 3, height: 3 },
      { type: "deposit", x: 3, y: 3, width: 3, height: 3 },
    ]);
    expect(world.objects.length).to.equal(2);
    expect(world.parseObjects([{ type: "obstacle", x: 0, y: 0, width: 1, height: 1 }], true)).to.equal(false);
  });
  it("World.parseProducts should work", () => {
    const world = worldWithObjects([]);
    expect(world.products).not.to.be.empty();
    world.parseProducts([
      { type: "product", subtype: 0, resources: Array(8).fill(1), points: 1 },
      { type: "product", subtype: 1, resources: Array(8).fill(1), points: 1 },
    ]);
    expect(world.products.length).to.equal(2);
  });
  it("World.toRaw should work", () => {
    const world = worldWithObjects([
      { type: "deposit", subtype: 0, x: 0, y: 0, width: 3, height: 3 },
      { type: "obstacle", x: 3, y: 3, width: 3, height: 3 },
      { type: "conveyor", subtype: 0, x: 6, y: 6 },
    ]);
    expect(world.toRaw("complete")).to.eql({
      width: 10,
      height: 10,
      objects: [
        { type: "deposit", x: 0, y: 0, subtype: 0, width: 3, height: 3 },
        { type: "obstacle", x: 3, y: 3, width: 3, height: 3 },
        { type: "conveyor", x: 6, y: 6, subtype: 0 },
      ],
      products: [{ type: "product", subtype: 0, resources: Array(8).fill(1), points: 0 }],
      turns: 10,
      time: 10,
    });
    expect(world.toRaw("task")).to.eql({
      width: 10,
      height: 10,
      objects: [
        { type: "deposit", x: 0, y: 0, subtype: 0, width: 3, height: 3 },
        { type: "obstacle", x: 3, y: 3, width: 3, height: 3 },
      ],
      products: [{ type: "product", subtype: 0, resources: Array(8).fill(1), points: 0 }],
      turns: 10,
      time: 10,
    });
  });
  it("World.simulate should work", () => {
    const world = new World();
    world.parse({
      width: 29,
      height: 23,
      objects: [
        { type: "obstacle", x: 8, y: 0, width: 4, height: 11 },
        { type: "obstacle", x: 8, y: 12, width: 4, height: 11 },
        { type: "deposit", x: 0, y: 0, subtype: 0, width: 8, height: 9 },
        { type: "deposit", x: 0, y: 14, subtype: 1, width: 8, height: 9 },
        { type: "deposit", x: 21, y: 0, subtype: 2, width: 8, height: 9 },
        { type: "deposit", x: 21, y: 14, subtype: 3, width: 8, height: 9 },
        { type: "obstacle", x: 17, y: 0, width: 4, height: 11 },
        { type: "obstacle", x: 17, y: 12, width: 4, height: 11 },
        { type: "obstacle", x: 14, y: 10, width: 1, height: 3 },
        { type: "obstacle", x: 12, y: 0, width: 5, height: 1 },
        { type: "obstacle", x: 12, y: 22, width: 5, height: 1 },
        { type: "combiner", x: 7, y: 11, subtype: 0 },
        { type: "combiner", x: 21, y: 11, subtype: 2 },
        { type: "combiner", x: 14, y: 15, subtype: 1 },
        { type: "combiner", x: 14, y: 7, subtype: 3 },
        { type: "conveyor", x: 10, y: 11, subtype: 4 },
        { type: "conveyor", x: 17, y: 11, subtype: 6 },
        { type: "conveyor", x: 16, y: 13, subtype: 1 },
        { type: "conveyor", x: 12, y: 9, subtype: 3 },
        { type: "mine", x: 4, y: 12, subtype: 0 },
        { type: "mine", x: 4, y: 9, subtype: 2 },
        { type: "factory", x: 12, y: 1, subtype: 0 },
        { type: "factory", x: 12, y: 17, subtype: 1 },
        { type: "conveyor", x: 3, y: 11, subtype: 1 },
        { type: "mine", x: 23, y: 9, subtype: 2 },
        { type: "mine", x: 23, y: 12, subtype: 0 },
        { type: "conveyor", x: 25, y: 11, subtype: 3 },
      ],
      products: [
        { type: "product", subtype: 0, resources: [10, 10, 0, 0, 0, 0, 0, 0], points: 10 },
        { type: "product", subtype: 1, resources: [0, 0, 10, 10, 0, 0, 0, 0], points: 10 },
      ],
      turns: 20,
    });
    world.simulate();
    expect(world.turn).to.equal(21);
    expect(world.scoreAtTurn).to.equal(18);
    expect(world.score).to.equal(60);
    expect(world.yield).to.eql([3, 3, 0, 0, 0, 0, 0, 0]);
    expect(world.log.length).to.equal(361);
  });
});
