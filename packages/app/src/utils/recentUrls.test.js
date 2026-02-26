import { describe, it, expect, beforeEach } from "vitest";
import { getRecentUrls, saveRecentUrl, removeRecentUrl, clearRecentUrls } from "./recentUrls";

describe("recentUrls", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("getRecentUrls", () => {
    it("returns empty array when nothing stored", () => {
      expect(getRecentUrls()).toEqual([]);
    });

    it("returns empty array for invalid JSON", () => {
      localStorage.setItem("czl:recentUrls", "not-json");
      expect(getRecentUrls()).toEqual([]);
    });

    it("returns empty array for non-array JSON", () => {
      localStorage.setItem("czl:recentUrls", '{"url":"x"}');
      expect(getRecentUrls()).toEqual([]);
    });

    it("filters out malformed entries", () => {
      localStorage.setItem(
        "czl:recentUrls",
        JSON.stringify([
          { url: "https://a.zarr", lastLoaded: 1 },
          { url: 123, lastLoaded: 2 },
          { url: "https://b.zarr" },
        ])
      );
      expect(getRecentUrls()).toEqual([{ url: "https://a.zarr", lastLoaded: 1 }]);
    });
  });

  describe("saveRecentUrl", () => {
    it("saves a new URL", () => {
      saveRecentUrl("https://a.zarr");
      const entries = getRecentUrls();
      expect(entries).toHaveLength(1);
      expect(entries[0].url).toBe("https://a.zarr");
    });

    it("moves duplicate URL to the top", () => {
      saveRecentUrl("https://a.zarr");
      saveRecentUrl("https://b.zarr");
      saveRecentUrl("https://a.zarr");
      const entries = getRecentUrls();
      expect(entries).toHaveLength(2);
      expect(entries[0].url).toBe("https://a.zarr");
      expect(entries[1].url).toBe("https://b.zarr");
    });

    it("caps at 10 entries", () => {
      for (let i = 0; i < 12; i++) {
        saveRecentUrl(`https://${i}.zarr`);
      }
      const entries = getRecentUrls();
      expect(entries).toHaveLength(10);
      expect(entries[0].url).toBe("https://11.zarr");
      expect(entries[9].url).toBe("https://2.zarr");
    });
  });

  describe("removeRecentUrl", () => {
    it("removes a specific URL", () => {
      saveRecentUrl("https://a.zarr");
      saveRecentUrl("https://b.zarr");
      removeRecentUrl("https://a.zarr");
      const entries = getRecentUrls();
      expect(entries).toHaveLength(1);
      expect(entries[0].url).toBe("https://b.zarr");
    });

    it("no-ops when URL not found", () => {
      saveRecentUrl("https://a.zarr");
      removeRecentUrl("https://nope.zarr");
      expect(getRecentUrls()).toHaveLength(1);
    });
  });

  describe("clearRecentUrls", () => {
    it("removes all entries", () => {
      saveRecentUrl("https://a.zarr");
      saveRecentUrl("https://b.zarr");
      clearRecentUrls();
      expect(getRecentUrls()).toEqual([]);
    });
  });
});
