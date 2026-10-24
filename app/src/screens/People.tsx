import type { Route } from '../lib/nav';

export function People({ route }: { route: Route }) {
  void route;
  return <div style={{ padding: 32 }}>People</div>;
}
