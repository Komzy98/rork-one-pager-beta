import type { LocalEvent, OnePagerEvent, SavedEventSnapshot } from '@/types/events';
import { localEventToOnePager, savedSnapshotToOnePager } from '@/utils/eventMappers';

const catalog = new Map<string, OnePagerEvent>();

export function registerDiscoveryEvents(events: LocalEvent[]): void {
  for (const event of events) {
    catalog.set(event.id, localEventToOnePager(event));
  }
}

export function registerSavedEvents(events: SavedEventSnapshot[]): void {
  for (const event of events) {
    catalog.set(event.id, savedSnapshotToOnePager(event));
  }
}

export function getCatalogEvent(id: string): OnePagerEvent | undefined {
  return catalog.get(id);
}

export function listCatalogEvents(): OnePagerEvent[] {
  return [...catalog.values()];
}

export function clearEventCatalog(): void {
  catalog.clear();
}
