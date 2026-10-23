import { useEffect, useState } from 'react';
import { AppShell } from './components/AppShell';
import { UpdateBanner } from './components/UpdateBanner';
import { useIconSprite } from './components/Icon';
import { getAppVersion } from './lib/tauri';

/**
 * The app shell. Screens are added one at a time, in the order set out in
 * docs/roadmap.md, starting with the reader.
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
      <div style={{ padding: '56px 40px', maxWidth: 720 }}>
        <div
          style={{
            font: '600 11px var(--font-ui)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
          }}
        >
          Foundation
        </div>
        <h1 style={{ fontSize: 34, lineHeight: '40px', marginTop: 6 }}>The shell is running.</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 12, maxWidth: '62ch' }}>
          Design tokens, the icon set, the update manager, and the build pipeline are wired in. The
          reader is the next screen to land.
        </p>
      </div>
    </AppShell>
  );
}
