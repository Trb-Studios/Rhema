import type { Route } from '../lib/nav';

export function QuizScreen({ route }: { route: Route }) {
  void route;
  return <div style={{ padding: 32 }}>QuizScreen</div>;
}
