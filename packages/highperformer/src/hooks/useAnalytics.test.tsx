import { cleanup, render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAnalytics } from "./useAnalytics";

function Harness() {
  useAnalytics();
  return null;
}

/** Mounts the hook inside a router at `path`, as App does. */
function mountAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Harness />
      <Routes>
        <Route path="*" element={null} />
      </Routes>
    </MemoryRouter>,
  );
}

const gtagScripts = () =>
  Array.from(document.querySelectorAll('script[src*="googletagmanager"]'));

let backendInfo: { google_analytics_id?: string | null } | null = null;

vi.mock("../store/useAppStore", () => ({
  default: (selector: (s: unknown) => unknown) => selector({ backendInfo }),
}));

beforeEach(() => {
  backendInfo = null;
  document.head.innerHTML = "";
  delete window.dataLayer;
  delete window.gtag;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useAnalytics", () => {
  it("loads nothing when the backend supplies no measurement id", () => {
    backendInfo = { google_analytics_id: null };
    mountAt("/");
    expect(gtagScripts()).toHaveLength(0);
    expect(window.gtag).toBeUndefined();
  });

  it("loads nothing before the backend has answered", () => {
    // A null backendInfo is the pre-boot state, not a decision to skip tracking.
    backendInfo = null;
    mountAt("/");
    expect(gtagScripts()).toHaveLength(0);
  });

  it("injects the tag once when an id is configured", () => {
    backendInfo = { google_analytics_id: "G-ABC1234567" };
    mountAt("/");
    const scripts = gtagScripts();
    expect(scripts).toHaveLength(1);
    expect(scripts[0].getAttribute("src")).toContain("G-ABC1234567");
  });

  it("does not inject a second tag when the route changes", () => {
    // The hook re-runs on every navigation; loading gtag.js repeatedly would
    // register duplicate handlers and double-count.
    backendInfo = { google_analytics_id: "G-ABC1234567" };
    const { rerender } = render(
      <MemoryRouter initialEntries={["/"]}>
        <Harness />
      </MemoryRouter>,
    );
    rerender(
      <MemoryRouter initialEntries={["/collections/nbl"]}>
        <Harness />
      </MemoryRouter>,
    );
    expect(gtagScripts()).toHaveLength(1);
  });

  it("sends a page_view carrying the full path, including query", () => {
    backendInfo = { google_analytics_id: "G-ABC1234567" };
    mountAt("/view?slug=spectrum&tab=explore");
    const calls = (window.dataLayer ?? []) as unknown[][];
    const pageViews = calls.filter((c) => c[0] === "event" && c[1] === "page_view");
    expect(pageViews).toHaveLength(1);
    expect((pageViews[0][2] as { page_path: string }).page_path).toBe(
      "/view?slug=spectrum&tab=explore",
    );
  });
});
