import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source = fs.readFileSync(new URL("./content.js", import.meta.url), "utf8");
let configured_with;

const player = {
  configure(config) {
    configured_with = config;
  },
  getConfiguration() {
    return { streaming: { bufferingGoal: configured_with?.streaming.bufferingGoal ?? 18 } };
  },
};
const video = {
  currentSrc: "blob:test",
  addEventListener() {},
  __reactFiber$test: { child: { decoy: {}, memoizedState: { player } } },
};
const document_element = { dataset: {} };

vm.runInNewContext(source, {
  console: { info() {}, warn() {} },
  document: { documentElement: document_element, querySelector: () => video },
  MutationObserver: class {
    observe() {}
  },
  setInterval() {},
  window: { addEventListener() {} },
});

assert.equal(configured_with.streaming.bufferingGoal, 120);
assert.equal(Object.hasOwn(configured_with.streaming, "bufferBehind"), false);
assert.equal(document_element.dataset.udemyDeepBuffer, "120");
console.log("Udemy Deep Buffer self-check passed.");
