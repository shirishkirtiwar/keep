import { createFileRoute } from "@tanstack/react-router";
import { DriveView } from "@/components/drive-view";
import type { MediaKind } from "@/lib/keep-types";

export const Route = createFileRoute("/drive")({
  validateSearch: (search: Record<string, unknown>): { kind: MediaKind } => ({
    kind: search.kind === "video" ? "video" : "photo",
  }),
  component: DrivePage,
});

function DrivePage() {
  const { kind } = Route.useSearch();
  return <DriveView kind={kind} />;
}
