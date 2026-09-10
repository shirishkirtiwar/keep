import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  classifyCallToolError,
  ConnectorType,
  GoogleDriveTools,
  type CallToolResult,
} from "@/lib/app-data";

export type DriveEntry = {
  id: string;
  name: string;
  mimeType: string;
  isFolder: boolean;
};

export type DriveResult<T> = {
  ok: boolean;
  data: T | null;
  loginRequired?: boolean;
  loginUrl?: string;
  pending?: boolean;
  message?: string;
};

function wrap<T>(result: CallToolResult, map: (raw: unknown) => T): DriveResult<T> {
  if (!result.ok) {
    const classified = classifyCallToolError(result);
    return {
      ok: false,
      data: null,
      loginRequired: result.loginRequired,
      loginUrl: result.loginUrl,
      pending: result.pending,
      message: classified?.message ?? result.errorMessage ?? "Drive request failed.",
    };
  }
  return { ok: true, data: map(result.data) };
}

function asList(raw: unknown): DriveEntry[] {
  const root = raw as Record<string, unknown> | unknown[] | null;
  const files = Array.isArray(root)
    ? root
    : Array.isArray((root as { files?: unknown })?.files)
      ? (root as { files: unknown[] }).files
      : Array.isArray((root as { items?: unknown })?.items)
        ? (root as { items: unknown[] }).items
        : [];
  return files
    .map((entry) => {
      const f = entry as Record<string, unknown>;
      const mime = String(f.mimeType ?? f.mime_type ?? "application/octet-stream");
      return {
        id: String(f.id ?? f.fileId ?? ""),
        name: String(f.name ?? f.title ?? "Untitled"),
        mimeType: mime,
        isFolder: mime === "application/vnd.google-apps.folder",
      };
    })
    .filter((f) => f.id);
}

export const listDriveFolder = createServerFn({ method: "POST" })
  .validator(z.object({ folderId: z.string() }))
  .handler(async ({ data }): Promise<DriveResult<DriveEntry[]>> => {
    const { callTool } = await import("@/lib/app-data/client.server");
    const result = await callTool(
      GoogleDriveTools.listFolder,
      { folderId: data.folderId, folder_id: data.folderId },
      { connectorType: ConnectorType.GoogleDrive },
    );
    return wrap(result, asList);
  });

export const readDriveFile = createServerFn({ method: "POST" })
  .validator(z.object({ fileId: z.string() }))
  .handler(async ({ data }): Promise<DriveResult<{ mime: string; bytes: string }>> => {
    const { callTool } = await import("@/lib/app-data/client.server");
    const result = await callTool(
      GoogleDriveTools.readFile,
      { fileId: data.fileId, file_id: data.fileId },
      { connectorType: ConnectorType.GoogleDrive },
    );
    return wrap(result, (raw) => {
      if (typeof raw === "string") return { mime: "application/octet-stream", bytes: raw };
      const obj = (raw ?? {}) as Record<string, unknown>;
      const bytes = String(obj.content ?? obj.data ?? obj.bytes ?? obj.text ?? "");
      const mime = String(obj.mimeType ?? obj.mime_type ?? "application/octet-stream");
      return { mime, bytes };
    });
  });
