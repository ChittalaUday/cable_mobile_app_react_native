import { sameChannels, usePackageFormStore } from './use-package-form-store';

const initial = usePackageFormStore.getState();

beforeEach(() => usePackageFormStore.setState(initial, true));

describe('sameChannels', () => {
  it('ignores order', () => {
    expect(sameChannels(['a', 'b'], ['b', 'a'])).toBe(true);
  });

  it('sees an addition, a removal, and a clear', () => {
    expect(sameChannels(['a', 'b'], ['a'])).toBe(false);
    expect(sameChannels(['a'], ['a', 'b'])).toBe(false);
    expect(sameChannels([], ['a'])).toBe(false);
  });
});

describe('packageFormStore', () => {
  it('fills the lineup once the saved package arrives, then leaves edits alone', () => {
    const { initEditPackage } = usePackageFormStore.getState();
    initEditPackage({
      id: 'pkg-1',
      name: 'Basic Pack',
      price: '199.00',
      providerId: 'prov-1',
      providerName: 'Tata Play',
    });

    usePackageFormStore.getState().hydrateChannels('pkg-1', ['ch-1', 'ch-2']);
    expect(usePackageFormStore.getState().selectedChannelIds).toEqual(['ch-1', 'ch-2']);

    // Deselecting everything must survive a re-render that hydrates again,
    // otherwise a cleared bouquet silently comes back.
    usePackageFormStore.getState().toggleChannel('ch-1');
    usePackageFormStore.getState().toggleChannel('ch-2');
    usePackageFormStore.getState().hydrateChannels('pkg-1', ['ch-1', 'ch-2']);

    const state = usePackageFormStore.getState();
    expect(state.selectedChannelIds).toEqual([]);
    expect(sameChannels(state.selectedChannelIds, state.initialChannelIds)).toBe(false);
  });

  it('drops the lineup when the provider changes, since channels are per provider', () => {
    const { initNewPackage } = usePackageFormStore.getState();
    initNewPackage({ id: 'prov-1', name: 'Tata Play' });
    usePackageFormStore.getState().toggleChannel('ch-1');

    usePackageFormStore.getState().setProvider({ id: 'prov-2', name: 'ACT' });

    expect(usePackageFormStore.getState().selectedChannelIds).toEqual([]);
    expect(usePackageFormStore.getState().providerName).toBe('ACT');
  });

  it('keeps the lineup when the same provider is re-selected', () => {
    const { initNewPackage } = usePackageFormStore.getState();
    initNewPackage({ id: 'prov-1', name: 'Tata Play' });
    usePackageFormStore.getState().toggleChannel('ch-1');

    usePackageFormStore.getState().setProvider({ id: 'prov-1', name: 'Tata Play' });

    expect(usePackageFormStore.getState().selectedChannelIds).toEqual(['ch-1']);
  });
});
