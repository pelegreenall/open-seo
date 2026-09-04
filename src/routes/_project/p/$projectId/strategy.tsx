import { createFileRoute } from "@tanstack/react-router";
import { StrategyPage } from "@/client/features/keyword-strategy/page/StrategyPage";

export const Route = createFileRoute("/_project/p/$projectId/strategy")({
  component: StrategyPageRoute,
});

function StrategyPageRoute() {
  const { projectId } = Route.useParams();
  return <StrategyPage projectId={projectId} />;
}
