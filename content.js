(() => {
  const BUFFER_AHEAD_SECONDS = 120;
  const MAX_DEPTH = 12;
  const MAX_OBJECTS = 15_000;

  let active_video = null;
  let active_source = "";
  let active_player = null;
  let checks = 0;
  const watched_videos = new WeakSet();

  function find_shaka_player(video) {
    const fiber_key = Object.keys(video).find(
      (key) =>
        key.startsWith("__reactFiber$") ||
        key.startsWith("__reactInternalInstance$"),
    );
    if (!fiber_key) return null;

    const queue = [{ value: video[fiber_key], depth: 0 }];
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

  function apply_buffer(force = false) {
    const video = document.querySelector("video");
    if (!video) return;

    const source = video.currentSrc;
    if (!force && video === active_video && source === active_source && active_player) return;

    const player = find_shaka_player(video);
    if (!player) return;

    try {
      player.configure({
        streaming: {
          bufferingGoal: BUFFER_AHEAD_SECONDS,
        },
      });

      const applied = player.getConfiguration().streaming.bufferingGoal;
      active_video = video;
      active_source = source;
      active_player = player;
      document.documentElement.dataset.udemyDeepBuffer = String(applied);
      console.info(`[Udemy Deep Buffer] Forward buffer set to ${applied} seconds.`);

      if (!watched_videos.has(video)) {
        watched_videos.add(video);
        video.addEventListener("emptied", () => {
          if (active_video === video) active_player = null;
        });
      }
    } catch (error) {
      console.warn("[Udemy Deep Buffer] Could not configure the player.", error);
    }
  }

  new MutationObserver(() => apply_buffer()).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  window.addEventListener("load", () => apply_buffer(), { once: true });
  setInterval(() => apply_buffer((checks += 1) % 30 === 0), 1_000);
  apply_buffer();
})();
