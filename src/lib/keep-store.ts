import { create } from "zustand";
import { deleteBlobs, getBlob, putBlob } from "@/lib/keep-db";
import type {
  ItemStatus,
  KeepRound,
  MediaItem,
  MediaKind,
  SortSession,
  SourceKind,
} from "@/lib/keep-types";
import { SAMPLE_PHOTOS } from "@/lib/keep-types";
import { formatDay, uid } from "@/lib/utils";

const META_KEY = "keep.sessions.v1";

type KeepState = {
  ready: boolean;
  sessions: SortSession[];
  hydrate: () => void;
  createFromFiles: (files: File[], kind: MediaKind, label?: string) => Promise<string>;
  createSample: () => string;
  createFromDrive: (
    files: { id: string; name: string; mimeType: string }[],
    folderName: string,
    kind: MediaKind,
  ) => string;
  swipe: (sessionId: string, roundId: string, to: ItemStatus) => void;
  undo: (sessionId: string, roundId: string) => void;
  startNextRound: (sessionId: string, fromRoundId: string) => string | null;
  deleteSession: (sessionId: string) => Promise<void>;
  loadItemUrl: (item: MediaItem) => Promise<string | null>;
};

function persist(sessions: SortSession[]) {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(sessions));
  } catch {
    // Quota — metadata is small; ignore rare failures.
  }
}

function latestRound(session: SortSession) {
  return session.rounds.reduce((a, b) => (a.number > b.number ? a : b));
}

function pendingOf(round: KeepRound) {
  return round.items
    .filter((i) => i.status === "pending")
    .sort((a, b) => a.sortIndex - b.sortIndex);
}

function fileKind(file: File, wanted: MediaKind) {
  if (wanted === "photo") return file.type.startsWith("image/");
  return file.type.startsWith("video/");
}

export const useKeep = create<KeepState>((set, get) => ({
  ready: false,
  sessions: [],

  hydrate: () => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(META_KEY);
      const stored: SortSession[] = raw ? JSON.parse(raw) : [];
      const current = get().sessions;
      if (current.length > 0) {
        const currentStamp = Math.max(0, ...current.map((s) => s.updatedAt));
        const storedStamp = Math.max(0, ...stored.map((s) => s.updatedAt));
        if (currentStamp >= storedStamp) {
          set({ ready: true });
          return;
        }
      }
      set({ sessions: stored, ready: true });
    } catch {
      set({ ready: true });
    }
  },

  createFromFiles: async (files, kind, label) => {
    const picked = files.filter((f) => fileKind(f, kind));
    if (picked.length === 0) throw new Error(`No ${kind}s in that selection.`);

    const items: MediaItem[] = [];
    for (const [index, file] of picked.entries()) {
      const blobId = uid();
      await putBlob(blobId, file);
      items.push({
        id: uid(),
        name: file.name,
        mime: file.type || (kind === "photo" ? "image/jpeg" : "video/mp4"),
        status: "pending",
        sortIndex: index,
        blobId,
      });
    }

    const session = makeSession({
      kind,
      source: "local",
      sourceLabel: label ?? (picked.length === 1 ? picked[0].name : `${picked.length} files`),
      name: `${kind === "photo" ? "Photos" : "Videos"} · ${formatDay()}`,
      items,
    });
    const sessions = [session, ...get().sessions];
    persist(sessions);
    set({ sessions });
    return session.id;
  },

  createSample: () => {
    const items: MediaItem[] = SAMPLE_PHOTOS.map((photo, index) => ({
      id: uid(),
      name: photo.name,
      mime: "image/jpeg",
      status: "pending",
      sortIndex: index,
      publicSrc: `/samples/${photo.file}`,
    }));
    const session = makeSession({
      kind: "photo",
      source: "sample",
      sourceLabel: "Sample walk",
      name: `Sample · ${formatDay()}`,
      items,
    });
    const sessions = [session, ...get().sessions];
    persist(sessions);
    set({ sessions });
    return session.id;
  },

  createFromDrive: (files, folderName, kind) => {
    const items: MediaItem[] = files.map((file, index) => ({
      id: uid(),
      name: file.name,
      mime: file.mimeType,
      status: "pending",
      sortIndex: index,
      driveFileId: file.id,
    }));
    const session = makeSession({
      kind,
      source: "drive",
      sourceLabel: folderName,
      name: `Drive · ${folderName}`,
      items,
    });
    const sessions = [session, ...get().sessions];
    persist(sessions);
    set({ sessions });
    return session.id;
  },

  swipe: (sessionId, roundId, to) => {
    const sessions = get().sessions.map((session) => {
      if (session.id !== sessionId) return session;
      const rounds = session.rounds.map((round) => {
        if (round.id !== roundId) return round;
        const current = pendingOf(round)[0];
        if (!current) return { ...round, isComplete: true };
        const items = round.items.map((item) =>
          item.id === current.id ? { ...item, status: to } : item,
        );
        const events = [
          ...round.events,
          { itemId: current.id, from: current.status, to, at: Date.now() },
        ];
        const still = items.some((i) => i.status === "pending");
        return { ...round, items, events, isComplete: !still };
      });
      return { ...session, rounds, updatedAt: Date.now() };
    });
    persist(sessions);
    set({ sessions });
  },

  undo: (sessionId, roundId) => {
    const sessions = get().sessions.map((session) => {
      if (session.id !== sessionId) return session;
      const rounds = session.rounds.map((round) => {
        if (round.id !== roundId || round.events.length === 0) return round;
        const events = round.events.slice(0, -1);
        const last = round.events[round.events.length - 1];
        const items = round.items.map((item) =>
          item.id === last.itemId ? { ...item, status: "pending" as const } : item,
        );
        return { ...round, items, events, isComplete: false };
      });
      return { ...session, rounds, updatedAt: Date.now() };
    });
    persist(sessions);
    set({ sessions });
  },

  startNextRound: (sessionId, fromRoundId) => {
    let nextId: string | null = null;
    const sessions = get().sessions.map((session) => {
      if (session.id !== sessionId) return session;
      const from = session.rounds.find((r) => r.id === fromRoundId);
      if (!from) return session;
      const existing = session.rounds.find((r) => r.number === from.number + 1);
      if (existing) {
        nextId = existing.id;
        return session;
      }
      const kept = from.items
        .filter((i) => i.status === "kept")
        .sort((a, b) => a.sortIndex - b.sortIndex);
      if (kept.length === 0) return session;
      const next: KeepRound = {
        id: uid(),
        number: from.number + 1,
        isComplete: false,
        events: [],
        items: kept.map((item, index) => ({
          ...item,
          id: uid(),
          status: "pending",
          sortIndex: index,
        })),
      };
      nextId = next.id;
      return {
        ...session,
        rounds: [...session.rounds, next],
        updatedAt: Date.now(),
      };
    });
    persist(sessions);
    set({ sessions });
    return nextId;
  },

  deleteSession: async (sessionId) => {
    const session = get().sessions.find((s) => s.id === sessionId);
    const blobIds = new Set<string>();
    session?.rounds.forEach((round) =>
      round.items.forEach((item) => {
        if (item.blobId) blobIds.add(item.blobId);
      }),
    );
    await deleteBlobs([...blobIds]);
    const sessions = get().sessions.filter((s) => s.id !== sessionId);
    persist(sessions);
    set({ sessions });
  },

  loadItemUrl: async (item) => {
    if (item.publicSrc) return item.publicSrc;
    if (item.blobId) {
      const blob = await getBlob(item.blobId);
      if (!blob) return null;
      return URL.createObjectURL(blob);
    }
    return null;
  },
}));

function makeSession(opts: {
  kind: MediaKind;
  source: SourceKind;
  sourceLabel: string;
  name: string;
  items: MediaItem[];
}): SortSession {
  const now = Date.now();
  return {
    id: uid(),
    name: opts.name,
    kind: opts.kind,
    source: opts.source,
    sourceLabel: opts.sourceLabel,
    createdAt: now,
    updatedAt: now,
    rounds: [
      {
        id: uid(),
        number: 1,
        isComplete: false,
        events: [],
        items: opts.items,
      },
    ],
  };
}

export function getSession(sessions: SortSession[], id: string) {
  return sessions.find((s) => s.id === id);
}

export function getRound(session: SortSession, roundId: string) {
  return session.rounds.find((r) => r.id === roundId);
}

export function roundStats(round: KeepRound) {
  const kept = round.items.filter((i) => i.status === "kept").length;
  const skipped = round.items.filter((i) => i.status === "skipped").length;
  const remaining = round.items.filter((i) => i.status === "pending").length;
  return { kept, skipped, remaining, total: round.items.length };
}

export { latestRound, pendingOf };
