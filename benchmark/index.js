#!/usr/bin/env node

import { readFileSync } from "fs";
import { hrtime } from "node:process";
import { World } from "../common/models.js";

function measure(action) {
  const timeThen = hrtime.bigint();
  action();
  return {
    duration: Number(hrtime.bigint() - timeThen) / 1000000,
  };
}

function computeResults(measurements) {
  const results = { benchmark: measurements.benchmark };
  for (const stage of ["parse", "simulate"]) {
    const durationsSorted = new Float32Array(measurements[stage].map((m) => m.duration)).sort();
    const durationAverage = measurements[stage].reduce((a, ms) => a + ms.duration, 0) / measurements[stage].length;
    results[stage] = {
      duration: {
        average: durationAverage,
        median: durationsSorted[durationsSorted.length / 2],
        minimum: durationsSorted[0],
        maximum: durationsSorted[durationsSorted.length - 1],
        standardDeviation:
          measurements[stage].map((m) => (m.duration - durationAverage) ** 2).reduce((a, d) => a + d) /
          measurements[stage].length,
      },
    };
  }
  return results;
}

const benchmarks = [
  { filePath: "../tasks/001.json", iterations: 100 },
  { filePath: "../tasks/002.json", iterations: 100 },
  { filePath: "../tasks/003.json", iterations: 100 },
  { filePath: "../tasks/004.json", iterations: 100 },
];
const allResults = [];
for (const benchmark of benchmarks) {
  const measurements = {
    benchmark,
    parse: [],
    simulate: [],
  };
  const raw = JSON.parse(readFileSync(benchmark.filePath, "utf-8"));
  for (let i = 0; i < benchmark.iterations; i++) {
    const world = new World();
    measurements.parse.push(measure(() => world.parse(raw)));
    world.logEnabled = false;
    measurements.simulate.push(measure(() => world.simulate()));
  }
  const results = computeResults(measurements);
  allResults.push(results);
}
console.dir(allResults, { depth: null });
