export type MediaKind = "photo" | "video";
export type SourceKind = "sample" | "local" | "drive";
export type ItemStatus = "pending" | "kept" | "skipped";

export type MediaItem = {
  id: string;
  name: string;
  mime: string;
  status: ItemStatus;
  sortIndex: number;
  blobId?: string;
  publicSrc?: string;
  driveFileId?: string;
};

export type SwipeEvent = {
  itemId: string;
  from: ItemStatus;
  to: ItemStatus;
  at: number;
};

export type KeepRound = {
  id: string;
  number: number;
  isComplete: boolean;
  events: SwipeEvent[];
  items: MediaItem[];
};

export type SortSession = {
  id: string;
  name: string;
  kind: MediaKind;
  source: SourceKind;
  sourceLabel: string;
  createdAt: number;
  updatedAt: number;
  rounds: KeepRound[];
};

export const SAMPLE_PHOTOS = [
  { file: "forest.jpg", name: "Forest path" },
  { file: "coast.jpg", name: "Coast at dusk" },
  { file: "street.jpg", name: "Wet street" },
  { file: "lake.jpg", name: "Mountain lake" },
  { file: "coffee.jpg", name: "Morning cup" },
  { file: "stairs.jpg", name: "Staircase" },
  { file: "market.jpg", name: "Fruit stall" },
  { file: "porch.jpg", name: "Porch dog" },
] as const;
