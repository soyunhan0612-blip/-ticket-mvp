import { createShowStoreMemory } from "./show-store-memory";
import type { ShowStore } from "./show-store";

export type { ShowStore } from "./show-store";

let instance: ShowStore | null = null;

export function getShowStore(): ShowStore {
  if (!instance) instance = createShowStoreMemory();
  return instance;
}
