import { toggleArea } from '@/components/locations/toggle-area';

const town = { id: 't', name: 'Mandapeta', path: 'Mandapeta', pathIds: ['t'] };
const ward = { id: 'w', name: 'Sai Nagar', path: 'Mandapeta / Sai Nagar', pathIds: ['t', 'w'] };
const street = { id: 's', name: '1st Lane', path: 'Mandapeta / Sai Nagar / 1st Lane', pathIds: ['t', 'w', 's'] };
const other = { id: 'o', name: 'Rajahmundry', path: 'Rajahmundry', pathIds: ['o'] };

describe('toggleArea', () => {
  it('drops the parent when a child is picked', () => {
    expect(toggleArea([town, other], ward)).toEqual([other, ward]);
  });

  it('drops covered children when a parent is picked', () => {
    expect(toggleArea([ward, street, other], town)).toEqual([other, town]);
  });

  it('removes an already selected area', () => {
    expect(toggleArea([ward, other], ward)).toEqual([other]);
  });
});
