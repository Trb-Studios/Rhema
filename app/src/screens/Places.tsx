import type { Route } from '../lib/nav';

export function Places({ route }: { route: Route }) {
  void route;
  return <div style={{ padding: 32 }}>Places</div>;
}
