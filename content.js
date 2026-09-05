(() => {
  const BUFFER_AHEAD_SECONDS = 120;
  const MAX_DEPTH = 12;
  const MAX_OBJECTS = 15_000;

  let activeVideo = null;
  let activeSource = "";
  let activePlayer = null;
  let checks = 0;
  const watchedVideos = new WeakSet();

  function findShakaPlayer(video) {
    const fiberKey = Object.keys(video).find(
      (key) =>
        key.startsWith("__reactFiber$") ||
        key.startsWith("__reactInternalInstance$"),
    );
    if (!fiberKey) return null;

    const queue = [{ value: video[fiberKey], depth: 0 }];
    const seen = new WeakSet();

    for (let head = 0; head < queue.length && head < MAX_OBJECTS; head += 1) {
      const { value, depth } = queue[head];
      if (!value || (typeof value !== "object" && typeof value !== "function")) continue;
      if (seen.has(value)) continue;
      seen.add(value);

      try {
        if (
          typeof value.configure === "function" &&
          typeof value.getConfiguration === "function" &&
          typeof value.getConfiguration()?.streaming?.bufferingGoal === "number"
        ) {
          return value;
        }
      } catch {
        // Keep searching; React's graph can contain objects with throwing getters.
      }

      if (depth >= MAX_DEPTH || value.nodeType || value === window || value === document) continue;

      let descriptors;
      try {
        descriptors = Object.getOwnPropertyDescriptors(value);
      } catch {
        continue;
      }

      for (const descriptor of Object.values(descriptors)) {
        if ("value" in descriptor && descriptor.value) {
          queue.push({ value: descriptor.value, depth: depth + 1 });
        }
      }
    }

    return null;
  }

  function applyBuffer(force = false) {
    const video = document.querySelector("video");
    if (!video) return;

    const source = video.currentSrc;
    if (!force && video === activeVideo && source === activeSource && activePlayer) return;

    const player = findShakaPlayer(video);
    if (!player) return;

    try {
      player.configure({
        streaming: {
          bufferingGoal: BUFFER_AHEAD_SECONDS,
        },
      });

      const applied = player.getConfiguration().streaming.bufferingGoal;
      activeVideo = video;
      activeSource = source;
      activePlayer = player;
      document.documentElement.dataset.udemyDeepBuffer = String(applied);
      console.info(`[Udemy Deep Buffer] Forward buffer set to ${applied} seconds.`);

      if (!watchedVideos.has(video)) {
        watchedVideos.add(video);
        video.addEventListener("emptied", () => {
          if (activeVideo === video) activePlayer = null;
        });
      }
    } catch (error) {
      console.warn("[Udemy Deep Buffer] Could not configure the player.", error);
    }
  }

  new MutationObserver(() => applyBuffer()).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  window.addEventListener("load", () => applyBuffer(), { once: true });
  setInterval(() => applyBuffer((checks += 1) % 30 === 0), 1_000);
  applyBuffer();
})();
