// Browser stand-in for `node:perf_hooks` (the GitHub Pages build maps the specifier here in its import map).
// The farm's server modules run in the page there (js/local/host.js): only `performance` and a no-op
// `monitorEventLoopDelay` are needed.
export const performance = globalThis.performance;

export function monitorEventLoopDelay() {
  return {
    enable() {}, disable() {}, reset() {},
    percentile: () => 0, min: 0, max: 0, mean: 0, stddev: 0, count: 0,
  };
}

export default { performance, monitorEventLoopDelay };
