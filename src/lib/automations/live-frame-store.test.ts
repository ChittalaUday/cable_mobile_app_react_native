import type { LiveFrame } from '@/lib/automations/live-protocol';
import { BUDGET_BYTES, clearLiveFrames, KEPT_RUNS, listLiveFrames, loadLiveFrame, saveLiveFrame } from './live-frame-store';

const mockFiles = new Map<string, { content: string; encoding: string | undefined }>();
const mockDirs = new Set<string>();
const mockPrefs = new Map<string, string>();
const mockFault = { failWrites: false, rootSize: null as number | null };

jest.mock('expo-file-system', () => {
  class Directory {
    uri: string;
    constructor(...parts: (string | Directory)[]) {
      this.uri = `${parts.map(part => (typeof part === 'string' ? part : part.uri)).join('/').replace(/\/+/g, '/').replace('file:/', 'file:///').replace(/\/$/, '')}/`;
    }

    get exists() { return mockDirs.has(this.uri); }
    get size() {
      if (mockFault.rootSize !== null && this.uri.endsWith('/automation-frames/'))
        return mockFault.rootSize;
      return [...mockFiles.entries()].filter(([key]) => key.startsWith(this.uri)).reduce((sum, [, file]) => sum + file.content.length, 0);
    }

    create() {
      // Like the real call with `intermediates`: every folder up to this one.
      const parts = this.uri.replace('file:///', '').split('/').filter(Boolean);
      for (let depth = 1; depth <= parts.length; depth++)
        mockDirs.add(`file:///${parts.slice(0, depth).join('/')}/`);
    }

    delete() {
      for (const dir of [...mockDirs]) {
        if (dir.startsWith(this.uri))
          mockDirs.delete(dir);
      }
      for (const key of [...mockFiles.keys()]) {
        if (key.startsWith(this.uri))
          mockFiles.delete(key);
      }
    }

    list() {
      return [...mockFiles.keys()].filter(key => key.startsWith(this.uri) && !key.slice(this.uri.length).includes('/')).map(uri => ({ uri }));
    }
  }
  class File {
    uri: string;
    constructor(dir: Directory, name: string) {
      this.uri = `${dir.uri}${name}`;
    }

    get exists() { return mockFiles.has(this.uri); }
    create() { mockFiles.set(this.uri, { content: '', encoding: undefined }); }
    delete() { mockFiles.delete(this.uri); }
    write(content: string, options?: { encoding?: string }) {
      if (mockFault.failWrites)
        throw new Error('disk full');
      mockFiles.set(this.uri, { content, encoding: options?.encoding });
    }
  }
  return { Directory, File, Paths: { cache: 'file:///cache' } };
});
jest.mock('@/lib/storage', () => ({
  storage: {
    getString: (key: string) => mockPrefs.get(key),
    set: (key: string, value: string) => { mockPrefs.set(key, value); },
    remove: (key: string) => { mockPrefs.delete(key); },
  },
}));

const at = (second: number) => `2026-10-10T10:00:${String(second).padStart(2, '0')}.000Z`;
const frame = (sequence: number, second = sequence, data = 'QUJD'): LiveFrame => ({ uri: `data:image/jpeg;base64,${data}`, sequence, width: 800, height: 600, capturedAt: at(second) });

beforeEach(() => {
  mockFiles.clear();
  mockDirs.clear();
  mockPrefs.clear();
  mockFault.failWrites = false;
  mockFault.rootSize = null;
});

describe('live frame store', () => {
  it('saves every frame as its own JPEG and lists them oldest first with their numbers', () => {
    saveLiveFrame('run-1', frame(2, 2, 'BBBB'));
    saveLiveFrame('run-1', frame(1, 1, 'AAAA'));
    saveLiveFrame('run-1', frame(3, 3, 'CCCC'));

    const listed = listLiveFrames('run-1');

    expect(listed.map(item => item.sequence)).toEqual([1, 2, 3]);
    expect(listed[0]).toEqual({ uri: `file:///cache/automation-frames/run-1/${Date.parse(at(1))}-1-800x600.jpg`, sequence: 1, width: 800, height: 600, capturedAt: at(1) });
    expect(mockFiles.get(listed[1]!.uri)).toEqual({ content: 'BBBB', encoding: 'base64' });
  });

  it('keeps all of them: a newer frame never replaces an older one', () => {
    for (let sequence = 1; sequence <= 50; sequence++)
      saveLiveFrame('run-1', frame(sequence, sequence % 60));

    expect(listLiveFrames('run-1')).toHaveLength(50);
  });

  it('keeps a retried attempt\'s frames beside the first attempt\'s, though their numbering starts over', () => {
    saveLiveFrame('run-1', frame(1, 1));
    saveLiveFrame('run-1', frame(2, 2));
    saveLiveFrame('run-1', frame(1, 30));

    expect(listLiveFrames('run-1').map(item => item.sequence)).toEqual([1, 2, 1]);
  });

  it('gives back the newest frame of a run, and keeps runs apart', () => {
    saveLiveFrame('run-1', frame(1));
    saveLiveFrame('run-1', frame(2));
    saveLiveFrame('run-2', frame(9, 9));

    expect(loadLiveFrame('run-1')?.sequence).toBe(2);
    expect(loadLiveFrame('run-2')?.sequence).toBe(9);
    expect(listLiveFrames('run-1')).toHaveLength(2);
  });

  it('has nothing for a run it never saw', () => {
    expect(listLiveFrames('unknown')).toEqual([]);
    expect(loadLiveFrame('unknown')).toBeNull();
  });

  it('keeps only the most recent runs, all frames of each', () => {
    for (let run = 0; run <= KEPT_RUNS; run++) {
      saveLiveFrame(`run-${run}`, frame(1));
      saveLiveFrame(`run-${run}`, frame(2));
    }

    expect(listLiveFrames('run-0')).toEqual([]);
    expect(listLiveFrames('run-1')).toHaveLength(2);
    expect(listLiveFrames(`run-${KEPT_RUNS}`)).toHaveLength(2);
  });

  it('drops the oldest runs over the size budget, never the run being saved', () => {
    saveLiveFrame('run-a', frame(1));
    saveLiveFrame('run-b', frame(1));
    mockFault.rootSize = BUDGET_BYTES + 1;

    saveLiveFrame('run-c', frame(1));
    saveLiveFrame('run-c', frame(2));

    expect(listLiveFrames('run-a')).toEqual([]);
    expect(listLiveFrames('run-b')).toEqual([]);
    expect(listLiveFrames('run-c')).toHaveLength(2);
  });

  it('ignores a frame that is not a JPEG data address, or whose time cannot be read', () => {
    saveLiveFrame('run-1', { ...frame(1), uri: 'https://example.invalid/x.jpg' });
    saveLiveFrame('run-1', { ...frame(2), capturedAt: 'not a time' });

    expect(mockFiles.size).toBe(0);
  });

  it('never throws when the disk refuses the write, and leaves no half-made picture behind', () => {
    mockFault.failWrites = true;

    expect(() => saveLiveFrame('run-1', frame(1))).not.toThrow();
    expect(listLiveFrames('run-1')).toEqual([]);
  });

  it('removes every picture and the run list', () => {
    saveLiveFrame('run-1', frame(1));
    saveLiveFrame('run-2', frame(1));

    clearLiveFrames();

    expect(listLiveFrames('run-1')).toEqual([]);
    expect(listLiveFrames('run-2')).toEqual([]);
    expect(mockFiles.size).toBe(0);
    expect(mockPrefs.size).toBe(0);
  });
});
