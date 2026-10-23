import { useEffect, useState } from 'react';
import { AppShell } from './components/AppShell';
import { UpdateBanner } from './components/UpdateBanner';
import { useIconSprite } from './components/Icon';
import { Reader } from './screens/Reader';
import { getAppVersion } from './lib/tauri';

/**
 * Rhema. Screens are added one at a time, in the order set out in docs/roadmap.md.
 * The reader came first because every other screen opens from the text.
 */
export default function App() {
  const [version, setVersion] = useState('');
  useIconSprite();

  useEffect(() => {
    getAppVersion().then(setVersion);
  }, []);

  return (
    <AppShell version={version}>
      <UpdateBanner />
      <Reader />
    </AppShell>
  );
}
