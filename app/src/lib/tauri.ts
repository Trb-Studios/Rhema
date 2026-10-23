/**
 * Thin wrappers over the Tauri bridge.
 *
 * Every call here also works when the interface runs in a plain browser
 * (`npm run dev:web`), so the UI can be built and reviewed without a Rust build.
 */

/** True when running inside the desktop app rather than a plain browser tab. */
export function inDesktopApp(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** The app's version, as shown in Settings. Empty string outside the desktop app. */
export async function getAppVersion(): Promise<string> {
  if (!inDesktopApp()) return 'dev';
  const { getVersion } = await import('@tauri-apps/api/app');
  return getVersion();
}

/**
 * Call a command defined in src-tauri/src/lib.rs.
 * Returns null outside the desktop app so callers can fall back to sample data.
 */
export async function invokeCommand<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T | null> {
  if (!inDesktopApp()) return null;
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(command, args);
}
