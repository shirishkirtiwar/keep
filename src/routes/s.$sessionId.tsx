import { createFileRoute } from "@tanstack/react-router";
import { SessionHub } from "@/components/session-hub";

export const Route = createFileRoute("/s/$sessionId")({
  component: SessionPage,
});

function SessionPage() {
  const { sessionId } = Route.useParams();
  return <SessionHub sessionId={sessionId} />;
}
