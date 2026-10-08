import type { ImmediateAction } from "@/types/analysis";

export function SafeActions({ actions }: { actions: ImmediateAction[] }) {
  if (actions.length === 0) {
    return <p>No specific action was triggered by the supported evidence.</p>;
  }

  return (
    <ul className="action-list">
      {actions.map((action) => (
        <li key={action.id}>{action.text}</li>
      ))}
    </ul>
  );
}
