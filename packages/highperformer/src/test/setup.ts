import "@testing-library/jest-dom/vitest";

// Stub ResizeObserver for antd components that use @rc-component/resize-observer
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Stub matchMedia for antd components (e.g. List) that use responsive breakpoint hooks
globalThis.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as typeof window.matchMedia;
