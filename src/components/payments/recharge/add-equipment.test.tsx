import { fireEvent, render, screen } from '@testing-library/react-native';
import * as React from 'react';
import { act } from 'react-test-renderer';
import { useRechargeStore } from '@/lib/hooks/stores/use-recharge-store';
import { AddEquipmentScreen } from './add-equipment';

const mockBack = jest.fn();
const mockUseAvailableUnits = jest.fn<{ data: unknown; isPending: boolean; error: Error | null; refetch: () => void }, [unknown]>();

jest.mock('expo-router', () => ({ useRouter: () => ({ back: mockBack }) }));
jest.mock('@/lib/hooks/common/use-debounced', () => ({ useDebounced: <T,>(value: T) => value }));
jest.mock('@/lib/hooks/api/use-inventory', () => ({
  useAvailableUnits: (args: unknown) => mockUseAvailableUnits(args),
}));

const UNITS = [
  { id: 'eq-1', catalogId: 'cat-stb', itemName: 'HD Set-top Box', itemCode: null, typeName: 'Set-top box', serialNumber: 'STB-001', vcNumber: null, macAddress: null, locationName: 'Main store', defaultSalePrice: '1500.00' },
  { id: 'eq-2', catalogId: 'cat-stb', itemName: 'HD Set-top Box', itemCode: null, typeName: 'Set-top box', serialNumber: 'STB-002', vcNumber: null, macAddress: null, locationName: 'Main store', defaultSalePrice: '1500.00' },
  { id: 'eq-3', catalogId: 'cat-rc', itemName: 'Remote Control', itemCode: null, typeName: 'Accessory', serialNumber: null, vcNumber: null, macAddress: null, locationName: null, defaultSalePrice: '150.00' },
];

beforeEach(() => {
  jest.clearAllMocks();
  act(() => useRechargeStore.getState().reset());
  mockUseAvailableUnits.mockReturnValue({ data: UNITS, isPending: false, error: null, refetch: jest.fn() });
});

describe('add equipment', () => {
  it('searches the server by what is typed', () => {
    render(<AddEquipmentScreen />);
    fireEvent.changeText(screen.getByTestId('add-equipment-search'), 'STB-002');

    expect(mockUseAvailableUnits).toHaveBeenLastCalledWith({ variables: { q: 'STB-002' } });
  });

  it('narrows the list by type', () => {
    render(<AddEquipmentScreen />);
    fireEvent.press(screen.getByText('Accessory'));

    expect(screen.getByText('Remote Control')).toBeTruthy();
    expect(screen.queryByTestId('add-equipment-unit-eq-1')).toBeNull();
  });

  it('picks several units and hands them back to the payment flow', () => {
    render(<AddEquipmentScreen />);
    fireEvent.press(screen.getByTestId('add-equipment-unit-eq-1'));
    fireEvent.press(screen.getByTestId('add-equipment-unit-eq-3'));
    expect(screen.getByTestId('add-equipment-done')).toHaveTextContent('Add 2 items • ₹1,650.00');

    fireEvent.press(screen.getByTestId('add-equipment-done'));

    const target = useRechargeStore.getState().target;
    expect(target).toMatchObject({ kind: 'issue', units: [{ equipmentId: 'eq-1', serialNumber: 'STB-001' }, { equipmentId: 'eq-3' }] });
    expect(mockBack).toHaveBeenCalled();
  });

  it('unpicks a unit tapped twice', () => {
    render(<AddEquipmentScreen />);
    fireEvent.press(screen.getByTestId('add-equipment-unit-eq-2'));
    fireEvent.press(screen.getByTestId('add-equipment-unit-eq-2'));
    fireEvent.press(screen.getByTestId('add-equipment-done'));

    expect(useRechargeStore.getState().target).toBeNull();
  });
});
