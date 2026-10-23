import { useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AppShell } from './components/AppShell';
import { UpdateBanner } from './components/UpdateBanner';
import { useIconSprite } from './components/Icon';
import { Reader } from './screens/Reader';
import { Portal } from './screens/Portal';
import { Plan } from './screens/Plan';
import { Coming } from './screens/Coming';
import { BUILT } from './lib/screens';
import type { ScreenId } from './lib/screens';
import { getAppVersion } from './lib/tauri';
import { useSettings } from './lib/settings';

/**
 * Rhema. Screens are added one at a time, in the order set out in docs/roadmap.md.
 * The reader came first because every other screen opens from the text.
 */
export default function App() {
  const [version, setVersion] = useState('');
  const [screen, setScreen] = useState<ScreenId>('home');

  useIconSprite();
  // Reading settings are applied to the whole document, so they are set up once here.
  useSettings();

  useEffect(() => {
    getAppVersion().then(setVersion);
  }, []);

  return (
    <AppShell version={version} current={screen} onNavigate={setScreen}>
      <UpdateBanner />
      <AnimatePresence mode="wait">
        {screen === 'home' && <Portal key="home" go={setScreen} />}
        {screen === 'read' && <Reader key="read" />}
        {screen === 'plan' && <Plan key="plan" />}
        {!BUILT.includes(screen) && <Coming key={screen} screen={screen} />}
      </AnimatePresence>
    </AppShell>
  );
}
