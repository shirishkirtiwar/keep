import { createFileRoute } from "@tanstack/react-router";
import { DeckView } from "@/components/deck-view";

export const Route = createFileRoute("/s/$sessionId_/r/$roundId")({
  component: DeckPage,
});

function DeckPage() {
  const { sessionId, roundId } = Route.useParams();
  return <DeckView sessionId={sessionId} roundId={roundId} />;
}
