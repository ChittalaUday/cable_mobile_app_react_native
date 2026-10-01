import { registryFor } from './app-registry';

describe('registryFor', () => {
  it('keeps staff search inside the staff layout', () => {
    const staff = registryFor('staff');
    expect(staff.length).toBeGreaterThan(0);
    expect(staff.every(item => item.route.startsWith('/staff/'))).toBe(true);
    expect(staff.map(item => item.key)).not.toContain('packages');
  });

  it('gives admins the package actions and nothing to customers', () => {
    expect(registryFor('admin').map(item => item.title)).toEqual(expect.arrayContaining(['Packages & Plans', 'Add Package', 'Edit Packages', 'Delete Packages']));
    expect(registryFor('customer')).toEqual([]);
  });

  it('has unique keys per role', () => {
    for (const role of ['admin', 'staff']) {
      const keys = registryFor(role).map(item => item.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('offers staff only the actions their layout has', () => {
    expect(registryFor('staff').filter(item => item.type === 'action').map(item => item.key)).toEqual(
      ['add-customer', 'collect-payment', 'issue-equipment', 'send-notification'],
    );
  });
});
