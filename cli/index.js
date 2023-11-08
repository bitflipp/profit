#!/usr/bin/env node

import { readFileSync } from "fs";
import { World } from "../common/models.js";

function handleErrors(errors) {
  console.error(JSON.stringify({ errors }));
  process.exit(1);
}

function handleError(type, message, details) {
  const baseError = { type, message };
  const error = { ...baseError, ...(details || {}) };
  handleErrors([error]);
}

let stdin = "";
try {
  stdin = readFileSync(process.stdin.fd, "utf-8");
} catch {
  handleError("io", "Failed to read synchronously from standard input");
}

let worldJSON = "";
try {
  worldJSON = JSON.parse(stdin);
} catch {
  handleError("io", "Failed to parse JSON");
}

const world = new World();
world.parse(worldJSON);
if (world.errors.length > 0) {
  handleErrors(world.errors);
}
world.simulate();
console.log(
  JSON.stringify({
    yield: world.yield,
    score: world.score,
    scoreAtTurn: world.scoreAtTurn,
    duration: world.duration,
    log: world.log,
  })
);
