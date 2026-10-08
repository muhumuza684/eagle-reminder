// Lets Settings ask the Today screen to run a short preview of the chosen motion.
let pending = false;
const listeners = new Set<() => void>();

export function requestPreview(): void {
  pending = true;
  listeners.forEach((run) => run());
}

export function onPreview(handler: () => void): () => void {
  const run = () => {
    if (!pending) return;
    pending = false;
    handler();
  };
  listeners.add(run);
  run();
  return () => {
    listeners.delete(run);
  };
}
