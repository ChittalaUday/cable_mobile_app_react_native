import type { Mark } from './coverage-marks';
import { boundsFor, effectiveMark, inheritedMark, nextMarks } from './coverage-marks';

/** `pathIds` runs root-first and ends with the node itself. */
function node(id: string, ancestors: string[] = []) {
  return { id, pathIds: [...ancestors, id] } as never;
}

const area = node('area');
const block = node('block', ['area']);
const door = node('door', ['area', 'block']);

const marks = (entries: [string, Mark][]) => new Map<string, Mark>(entries);

describe('inheritance', () => {
  it('takes the nearest ancestor that says anything', () => {
    expect(inheritedMark(door, marks([['area', 'served'], ['block', 'excluded']]))).toBe('excluded');
    expect(inheritedMark(door, marks([['area', 'served']]))).toBe('served');
    expect(inheritedMark(door, marks([]))).toBeUndefined();
  });

  it('never reads the node’s own mark as inherited', () => {
    expect(inheritedMark(door, marks([['door', 'served']]))).toBeUndefined();
  });

  it('marking a parent served covers every child', () => {
    const served = marks([['area', 'served']]);

    expect(effectiveMark(block, served)).toEqual({ mark: 'served', inherited: true });
    expect(effectiveMark(door, served)).toEqual({ mark: 'served', inherited: true });
    // The parent's own mark is not inherited — it is the source.
    expect(effectiveMark(area, served)).toEqual({ mark: 'served', inherited: false });
  });
});

describe('tapping', () => {
  it('drops one child out of a served parent, leaving its siblings alone', () => {
    const after = nextMarks(block, marks([['area', 'served']]));

    expect(after.get('block')).toBe('excluded');
    expect(after.get('area')).toBe('served');
    // A sibling with no mark of its own still inherits "served".
    expect(effectiveMark(node('other', ['area']), after)).toEqual({ mark: 'served', inherited: true });
  });

  it('hands a dropped child back to its parent on the next tap', () => {
    const after = nextMarks(block, marks([['area', 'served'], ['block', 'excluded']]));

    expect(after.has('block')).toBe(false);
    expect(effectiveMark(block, after)).toEqual({ mark: 'served', inherited: true });
  });

  it('re-includes a child under an excluded parent', () => {
    const after = nextMarks(block, marks([['area', 'excluded']]));
    expect(after.get('block')).toBe('served');
  });

  it('cycles served → not served → unset when nothing sits above it', () => {
    const first = nextMarks(area, marks([]));
    expect(first.get('area')).toBe('served');

    const second = nextMarks(area, first);
    expect(second.get('area')).toBe('excluded');

    const third = nextMarks(area, second);
    expect(third.has('area')).toBe(false);
  });

  it('leaves the original map untouched', () => {
    const before = marks([['area', 'served']]);
    nextMarks(block, before);
    expect([...before.keys()]).toEqual(['area']);
  });
});

/**
 * The picker must not offer a place the level above has switched off — the API
 * rejects that write, and a 400 on save is no way to learn the rule.
 */
describe('boundsFor', () => {
  const ids = { serviceId: 'svc', providerId: 'prov' };

  it('bounds a service by nothing', () => {
    expect(boundsFor('service', ids)).toEqual({});
  });

  it('bounds a provider by its service', () => {
    expect(boundsFor('provider', ids)).toEqual({ serviceId: 'svc' });
  });

  it('bounds a package by its provider, which carries the service’s limit', () => {
    expect(boundsFor('package', ids)).toEqual({ serviceId: 'svc', providerId: 'prov' });
  });

  it('asks for no narrowing when the ids are not known yet', () => {
    expect(boundsFor('provider', {})).toEqual({ serviceId: undefined });
  });
});
