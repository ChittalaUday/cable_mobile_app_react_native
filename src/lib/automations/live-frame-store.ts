import type { LiveFrame } from '@/lib/automations/live-protocol';
import { Directory, File, Paths } from 'expo-file-system';
import { storage } from '@/lib/storage';

/**
 * Every browser picture of a run, kept on this device so they are all still
 * there after navigating away, after a reconnect, once the run has ended, and
 * after the app restarts. One JPEG per frame in the app's private cache, in a
 * folder per run; the capture time, sequence and size are in the file name, so
 * listing a run needs no other bookkeeping. Only the most recent runs are kept,
 * within a total size budget, and everything goes on sign-out: a picture can
 * show customer details. Failing to save never affects the live view.
 */
const ROOT = 'automation-frames';
const INDEX_KEY = 'live-frame:index';
const DATA_URI_PREFIX = 'data:image/jpeg;base64,';
const NAME = /^(\d+)-(\d+)-(\d+)x(\d+)\.jpg$/;
export const KEPT_RUNS = 10;
/** Oldest runs go first once the saved pictures pass this; the run being watched never does. */
export const BUDGET_BYTES = 300 * 1024 * 1024;

const root = () => new Directory(Paths.cache, ROOT);
const folderOf = (runId: string) => new Directory(Paths.cache, ROOT, runId);

function readIndex(): string[] {
  try {
    const parsed = JSON.parse(storage.getString(INDEX_KEY) ?? '[]') as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  }
  catch {
    return [];
  }
}

function forget(runId: string) {
  try {
    const folder = folderOf(runId);
    if (folder.exists)
      folder.delete();
  }
  catch {
    // A folder that cannot be removed is swept with the cache.
  }
}

/** Marks the run as the newest and makes room: the most recent runs only, within the size budget. */
function touch(runId: string) {
  const known = readIndex();
  if (known.at(-1) === runId)
    return;
  const index = [...known.filter(id => id !== runId), runId];
  for (const stale of index.splice(0, Math.max(0, index.length - KEPT_RUNS)))
    forget(stale);
  try {
    while (index.length > 1 && (root().size ?? 0) > BUDGET_BYTES)
      forget(index.shift()!);
  }
  catch {
    // The size is only a budget; without it the run limit above still applies.
  }
  storage.set(INDEX_KEY, JSON.stringify(index));
}

const nameOf = (frame: LiveFrame) => `${Date.parse(frame.capturedAt)}-${frame.sequence}-${frame.width}x${frame.height}.jpg`;

/** Saves one frame under its run. A frame that is not a JPEG data address, or whose time is unreadable, is ignored. */
export function saveLiveFrame(runId: string, frame: LiveFrame) {
  if (!frame.uri.startsWith(DATA_URI_PREFIX) || Number.isNaN(Date.parse(frame.capturedAt)))
    return;
  let file: File | null = null;
  try {
    touch(runId);
    folderOf(runId).create({ intermediates: true, idempotent: true });
    file = new File(folderOf(runId), nameOf(frame));
    if (!file.exists)
      file.create();
    file.write(frame.uri.slice(DATA_URI_PREFIX.length), { encoding: 'base64' });
  }
  catch {
    // Disk full or no permission: the picture stays on screen from memory, just not afterwards.
    // A half-made file would list as a broken picture, so it goes.
    try {
      if (file?.exists === true)
        file.delete();
    }
    catch {
      // Nothing more to do; an empty file is skipped when listing.
    }
  }
}

/** Every saved picture of the run, oldest first; empty when there is none. */
export function listLiveFrames(runId: string): LiveFrame[] {
  try {
    const folder = folderOf(runId);
    if (!folder.exists)
      return [];
    const frames: { at: number; frame: LiveFrame }[] = [];
    for (const entry of folder.list()) {
      const match = NAME.exec(entry.uri.split('/').pop() ?? '');
      // A file with nothing in it is the leftover of a failed save.
      if (match === null || ('size' in entry && entry.size === 0))
        continue;
      const at = Number(match[1]);
      frames.push({ at, frame: { uri: entry.uri, sequence: Number(match[2]), width: Number(match[3]), height: Number(match[4]), capturedAt: new Date(at).toISOString() } });
    }
    return frames.sort((a, b) => a.at - b.at || a.frame.sequence - b.frame.sequence).map(item => item.frame);
  }
  catch {
    return [];
  }
}

/** The newest saved picture of the run, or null. */
export function loadLiveFrame(runId: string): LiveFrame | null {
  return listLiveFrames(runId).at(-1) ?? null;
}

/** Every saved picture, for sign-out and tenant switches. */
export function clearLiveFrames() {
  try {
    const dir = root();
    if (dir.exists)
      dir.delete();
  }
  catch {
    // The cache folder is swept by the system if it cannot be removed here.
  }
  storage.remove(INDEX_KEY);
}
