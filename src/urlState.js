const DEFAULTS = {
  seed: 42,
  forceMultiplier: 0.05,
  edgeLengthThresh: 30,
  growSteps: 20,
  relaxSteps: 20,
  showDebug: false,
  drawHamiltonian: false,
  growBatches: 0,
};

const PARAM_KEYS = [
  "seed",
  "forceMultiplier",
  "edgeLengthThresh",
  "growSteps",
  "relaxSteps",
  "showDebug",
  "drawHamiltonian",
  "growBatches",
];

export function getDefaultParams() {
  return { ...DEFAULTS };
}

export function readParamsFromUrl() {
  const params = getDefaultParams();
  const search = new URLSearchParams(window.location.search);

  for (const key of PARAM_KEYS) {
    if (!search.has(key)) continue;
    const raw = search.get(key);
    if (key === "showDebug" || key === "drawHamiltonian") {
      params[key] = raw === "true" || raw === "1";
    } else {
      const num = Number(raw);
      if (!Number.isNaN(num)) {
        params[key] = num;
      }
    }
  }

  return params;
}

export function writeParamsToUrl(params) {
  const search = new URLSearchParams();

  for (const key of PARAM_KEYS) {
    const value = params[key];
    const defaultValue = DEFAULTS[key];

    if (value === defaultValue) continue;

    if (key === "showDebug" || key === "drawHamiltonian") {
      if (value) search.set(key, "true");
    } else {
      search.set(key, String(value));
    }
  }

  const query = search.toString();
  const url = query
    ? `${window.location.pathname}?${query}`
    : window.location.pathname;

  window.history.replaceState(null, "", url);
}
