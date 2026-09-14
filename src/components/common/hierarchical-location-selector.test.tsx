import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';

import {
  HierarchicalLocationFilter,
  HierarchicalLocationSelector,
} from './hierarchical-location-selector';

jest.mock('@/lib/hooks/api/use-locations', () => ({
  useLocations: () => ({
    data: {
      items: [
        { id: 'loc-1', name: 'Mandapeta', path: 'Mandapeta', code: 'MAN', depth: 0, childCount: 2, categoryId: 'cat-area', parentId: null },
        { id: 'loc-2', name: 'Alamuru', path: 'Alamuru', code: 'ALA', depth: 0, childCount: 0, categoryId: 'cat-area', parentId: null },
        { id: 'loc-3', name: 'TIDCO Apartments', path: 'Mandapeta / TIDCO Apartments', code: 'TID', depth: 1, childCount: 1, categoryId: 'cat-bldg', parentId: 'loc-1' },
        { id: 'loc-4', name: 'Main Road', path: 'Mandapeta / Main Road', code: 'MR', depth: 1, childCount: 0, categoryId: 'cat-street', parentId: 'loc-1' },
      ],
    },
    isPending: false,
  }),
  useLocationCategories: () => ({
    data: [
      { id: 'cat-area', name: 'Area', slug: 'area' },
      { id: 'cat-bldg', name: 'Building', slug: 'building' },
      { id: 'cat-street', name: 'Street', slug: 'street' },
    ],
    isPending: false,
  }),
  useLocationLevel: ({ variables }: { variables: { parentId: string | null } }) => {
    if (variables.parentId === 'loc-1') {
      return {
        data: {
          pages: [
            {
              items: [
                { id: 'loc-3', name: 'TIDCO Apartments', path: 'Mandapeta / TIDCO Apartments', code: 'TID', depth: 1, childCount: 1, categoryId: 'cat-bldg', parentId: 'loc-1' },
                { id: 'loc-4', name: 'Main Road', path: 'Mandapeta / Main Road', code: 'MR', depth: 1, childCount: 0, categoryId: 'cat-street', parentId: 'loc-1' },
              ],
            },
          ],
        },
        isLoading: false,
      };
    }
    return {
      data: {
        pages: [
          {
            items: [
              { id: 'loc-1', name: 'Mandapeta', code: 'MAN', depth: 0, childCount: 2, categoryId: 'cat-area', parentId: null },
              { id: 'loc-2', name: 'Alamuru', code: 'ALA', depth: 0, childCount: 0, categoryId: 'cat-area', parentId: null },
            ],
          },
        ],
      },
      isLoading: false,
    };
  },
}));

describe('hierarchicalLocationSelector - navigation and selection', () => {
  it('renders "All Locations" when no location is selected and expands on press', () => {
    const onSelect = jest.fn();
    render(<HierarchicalLocationSelector selectedLocationId={undefined} onSelectLocation={onSelect} />);

    expect(screen.getByText('All Locations')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Select Location'));

    expect(screen.getByLabelText('Top level')).toBeTruthy();
    expect(screen.getByText('Mandapeta')).toBeTruthy();
    expect(screen.getByText('Alamuru')).toBeTruthy();
  });

  it('selects a leaf location directly and invokes callback', () => {
    const onSelect = jest.fn();
    render(<HierarchicalLocationSelector selectedLocationId={undefined} onSelectLocation={onSelect} />);

    fireEvent.press(screen.getByLabelText('Select Location'));
    fireEvent.press(screen.getByLabelText('Location Option: Alamuru'));

    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'loc-2', name: 'Alamuru' }));
  });

  it('drills down into sub-locations when a parent node is opened', () => {
    const onSelect = jest.fn();
    render(<HierarchicalLocationSelector selectedLocationId={undefined} onSelectLocation={onSelect} />);

    fireEvent.press(screen.getByLabelText('Select Location'));

    // Open Mandapeta to view its children
    fireEvent.press(screen.getByLabelText('Open Mandapeta'));

    // Breadcrumbs should show Mandapeta
    expect(screen.getByLabelText('Mandapeta')).toBeTruthy();

    // Children of Mandapeta should be rendered
    expect(screen.getByText('TIDCO Apartments')).toBeTruthy();
    expect(screen.getByText('Main Road')).toBeTruthy();

    // Select entire Mandapeta banner is present
    expect(screen.getByText('Select all in Mandapeta')).toBeTruthy();
    fireEvent.press(screen.getByLabelText('Location Option: Mandapeta'));
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 'loc-1', name: 'Mandapeta' }));
  });

  it('jumps back to Top level when breadcrumb is pressed', () => {
    const onSelect = jest.fn();
    render(<HierarchicalLocationSelector selectedLocationId={undefined} onSelectLocation={onSelect} />);

    fireEvent.press(screen.getByLabelText('Select Location'));
    fireEvent.press(screen.getByLabelText('Open Mandapeta'));

    expect(screen.getByText('TIDCO Apartments')).toBeTruthy();

    // Jump back to Top level
    fireEvent.press(screen.getByLabelText('Top level'));

    expect(screen.getByText('Mandapeta')).toBeTruthy();
    expect(screen.getByText('Alamuru')).toBeTruthy();
  });

  it('clears selection when clear button is pressed', () => {
    const onSelect = jest.fn();
    render(<HierarchicalLocationSelector selectedLocationId="loc-1" onSelectLocation={onSelect} />);

    expect(screen.getAllByText('Mandapeta').length).toBeGreaterThanOrEqual(1);

    fireEvent.press(screen.getByLabelText('Clear Location Filter'));
    expect(onSelect).toHaveBeenCalledWith(null);
  });
});

describe('hierarchicalLocationSelector - display and options', () => {
  it('displays full location path when a deep location is selected', () => {
    render(<HierarchicalLocationSelector selectedLocationId="loc-3" onSelectLocation={jest.fn()} />);

    expect(screen.getByText('TIDCO Apartments')).toBeTruthy();
    // Path should be rendered in UI
    expect(screen.getByText('Mandapeta / TIDCO Apartments')).toBeTruthy();
  });

  it('supports custom label, placeholder and hiding All option', () => {
    const onSelect = jest.fn();
    render(
      <HierarchicalLocationSelector
        selectedLocationId={undefined}
        onSelectLocation={onSelect}
        label="Service Area"
        placeholder="Pick an area"
        showAllOption={false}
      />,
    );

    expect(screen.getByText('Service Area')).toBeTruthy();
    expect(screen.getByText('Pick an area')).toBeTruthy();

    fireEvent.press(screen.getByLabelText('Select Location'));
    expect(screen.queryByLabelText('Location Option: All Locations')).toBeNull();
  });

  it('respects leafOnly mode by hiding parent selection banner and select button', () => {
    const onSelect = jest.fn();
    render(
      <HierarchicalLocationSelector
        selectedLocationId={undefined}
        onSelectLocation={onSelect}
        leafOnly
      />,
    );

    fireEvent.press(screen.getByLabelText('Select Location'));
    // Open Mandapeta
    fireEvent.press(screen.getByLabelText('Open Mandapeta'));

    // Select entire Mandapeta banner should NOT be present in leafOnly mode
    expect(screen.queryByText('Select all in Mandapeta')).toBeNull();
  });

  it('works when imported as HierarchicalLocationFilter alias', () => {
    const onSelect = jest.fn();
    render(<HierarchicalLocationFilter selectedLocationId={undefined} onSelectLocation={onSelect} />);
    expect(screen.getByText('All Locations')).toBeTruthy();
  });
});
