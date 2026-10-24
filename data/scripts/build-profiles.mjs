#!/usr/bin/env node
/**
 * Rebuilds only the people and place profiles, against a database already built.
 *
 *   npm run data:profiles
 *
 * The full `npm run data:build` does this as its last step; this is for working on the
 * profiles without reloading the whole Bible each time.
 */

import { createWriteStream } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { buildProfiles } from './profiles.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DATA = join(HERE, '..');
const RAW = join(DATA, 'raw');
const WEB = join(DATA, '..', 'app', 'public', 'bible');

const say = (message) => process.stdout.write(`${message}\n`);

async function fetchOnce(url, destination) {
  try {
    await stat(destination);
    return destination;
  } catch {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url} returned ${response.status}`);
    await pipeline(Readable.fromWeb(response.body), createWriteStream(destination));
    return destination;
  }
}

await mkdir(WEB, { recursive: true });
buildProfiles({ dbPath: join(DATA, 'bible.db'), raw: RAW, web: WEB, data: DATA, fetchOnce, say }).catch(
  (error) => {
    process.stderr.write(`\nProfiles failed: ${error.message}\n`);
    process.exit(1);
  },
);
