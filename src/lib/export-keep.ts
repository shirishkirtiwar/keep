import JSZip from "jszip";
import { getBlob } from "@/lib/keep-db";
import { readDriveFile } from "@/lib/drive-fns";
import type { KeepRound, MediaItem } from "@/lib/keep-types";

async function blobFor(item: MediaItem): Promise<Blob | null> {
  if (item.publicSrc) {
    const res = await fetch(item.publicSrc);
    if (!res.ok) return null;
    return res.blob();
  }
  if (item.blobId) {
    return (await getBlob(item.blobId)) ?? null;
  }
  if (item.driveFileId) {
    const result = await readDriveFile({ data: { fileId: item.driveFileId } });
    if (!result.ok || !result.data?.bytes) return null;
    return decodePayload(result.data.bytes, result.data.mime);
  }
  return null;
}

function decodePayload(bytes: string, mime: string): Blob {
  try {
    const bin = atob(bytes);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  } catch {
    return new Blob([bytes], { type: mime });
  }
}

export async function exportRoundZip(round: KeepRound, filename: string) {
  const kept = round.items.filter((i) => i.status === "kept");
  const zip = new JSZip();
  let index = 0;
  for (const item of kept) {
    const blob = await blobFor(item);
    if (!blob) continue;
    const safe = item.name.replace(/[^\w.\- ]+/g, "_") || `keep-${index + 1}`;
    zip.file(safe, blob);
    index += 1;
  }
  if (index === 0) throw new Error("Nothing to export yet.");
  const out = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(out);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
