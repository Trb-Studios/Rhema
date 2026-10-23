/**
 * Update manager.
 *
 * On launch the app asks GitHub Releases whether a newer version exists. If one does,
 * it downloads in the background and the person is told, never interrupted. They choose
 * when to restart. Updates are signed; an update that fails its signature check is
 * refused by Tauri before it is ever written to disk.
 */

import { inDesktopApp } from './tauri';

export type UpdateState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'none' }
  | { status: 'available'; version: string; notes: string }
  | { status: 'downloading'; percent: number }
  | { status: 'ready'; version: string }
  | { status: 'error'; message: string };

/** How long after launch to check, so startup is never held up by the network. */
export const CHECK_DELAY_MS = 4000;

/**
 * Look for a newer version. Resolves to `none` when the app is current, and never
 * throws: a failed check is reported as an error state and the app carries on.
 */
export async function checkForUpdate(onState: (state: UpdateState) => void): Promise<void> {
  if (!inDesktopApp()) {
    onState({ status: 'none' });
    return;
  }

  onState({ status: 'checking' });

  try {
    const { check } = await import('@tauri-apps/plugin-updater');
    const update = await check();

    if (!update) {
      onState({ status: 'none' });
      return;
    }

    onState({
      status: 'available',
      version: update.version,
      notes: update.body ?? '',
    });

    let downloaded = 0;
    let total = 0;

    await update.downloadAndInstall((event) => {
      if (event.event === 'Started') {
        total = event.data.contentLength ?? 0;
        onState({ status: 'downloading', percent: 0 });
      } else if (event.event === 'Progress') {
        downloaded += event.data.chunkLength;
        const percent = total > 0 ? Math.round((downloaded / total) * 100) : 0;
        onState({ status: 'downloading', percent });
      } else if (event.event === 'Finished') {
        onState({ status: 'ready', version: update.version });
      }
    });
  } catch (error) {
    onState({
      status: 'error',
      message: error instanceof Error ? error.message : 'Could not check for updates',
    });
  }
}

/** Restart into the downloaded version. Only call this when the person asks. */
export async function restartIntoUpdate(): Promise<void> {
  if (!inDesktopApp()) return;
  const { relaunch } = await import('@tauri-apps/plugin-process');
  await relaunch();
}
