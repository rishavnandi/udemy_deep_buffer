import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("./content.js", import.meta.url), "utf8");
let configuredWith;

const player = {
  configure(config) {
    configuredWith = config;
  },
  getConfiguration() {
    return { streaming: { bufferingGoal: configuredWith?.streaming.bufferingGoal ?? 18 } };
  },
};
const video = {
  currentSrc: "blob:test",
  addEventListener() {},
  __reactFiber$test: { child: { decoy: {}, memoizedState: { player } } },
};
const documentElement = { dataset: {} };

vm.runInNewContext(source, {
  console: { info() {}, warn() {} },
  document: { documentElement, querySelector: () => video },
  MutationObserver: class {
    observe() {}
  },
  setInterval() {},
  window: { addEventListener() {} },
});

assert.equal(configuredWith.streaming.bufferingGoal, 120);
assert.equal(Object.hasOwn(configuredWith.streaming, "bufferBehind"), false);
assert.equal(documentElement.dataset.udemyDeepBuffer, "120");
console.log("Udemy Deep Buffer self-check passed.");
