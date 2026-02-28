import * as zarr from "zarrita";
import type { Readable } from "zarrita";
import { InstrumentedStore } from "./InstrumentedStore";
import type { FetchStats } from "./InstrumentedStore";

export class ZarrStore {
  store: InstrumentedStore;
  root: zarr.Group<Readable>;
  attrs: Record<string, unknown>;

  constructor(store: InstrumentedStore, root: zarr.Group<Readable>) {
    this.store = store;
    this.root = root;
    this.attrs = root.attrs;
  }

  static async open(url: string): Promise<ZarrStore> {
    const fetchStore = new zarr.FetchStore(url);
    const instrumented = new InstrumentedStore(fetchStore);
    const root = await zarr.open(instrumented, { kind: "group" });
    return new ZarrStore(instrumented, root);
  }

  async openArray(path: string): Promise<zarr.Array<zarr.DataType, Readable>> {
    return zarr.open(this.root.resolve(path), { kind: "array" });
  }

  async openGroup(path: string): Promise<zarr.Group<Readable>> {
    return zarr.open(this.root.resolve(path), { kind: "group" });
  }

  snapshotFetchStats(): FetchStats {
    return this.store.snapshot();
  }
}
