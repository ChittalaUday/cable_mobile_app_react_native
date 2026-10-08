import { act } from '@testing-library/react-native';
import * as React from 'react';

import { DatePickerModal } from '@/components/common/date-picker-modal';
import i18n from '@/lib/i18n';
import { cleanup, screen, setup } from '@/lib/test-utils';

beforeEach(async () => i18n.changeLanguage('en'));
afterEach(cleanup);

describe('date picker modal', () => {
  it('disables every date before the minimum date', () => {
    setup(
      <DatePickerModal
        minimumDate="2099-05-15"
        onApply={jest.fn()}
        onClose={jest.fn()}
        value={null}
        visible
      />,
    );

    expect(screen.getByTestId('date-picker-day-2099-05-14')).toBeDisabled();
    expect(screen.getByTestId('date-picker-day-2099-05-15')).toBeEnabled();
  });

  it('applies the selected date', async () => {
    const onApply = jest.fn();
    const { user } = setup(
      <DatePickerModal
        minimumDate="2099-05-15"
        onApply={onApply}
        onClose={jest.fn()}
        value={null}
        visible
      />,
    );

    expect(screen.getByTestId('date-picker-apply')).toBeDisabled();
    await user.press(screen.getByTestId('date-picker-day-2099-05-16'));
    expect(screen.getByTestId('date-picker-day-2099-05-16')).toBeSelected();
    expect(screen.getByTestId('date-picker-apply')).toBeEnabled();

    await user.press(screen.getByTestId('date-picker-apply'));
    expect(onApply).toHaveBeenCalledWith('2099-05-16');
  });

  it('navigates months without going before the minimum month', async () => {
    const { user } = setup(
      <DatePickerModal
        minimumDate="2099-05-15"
        onApply={jest.fn()}
        onClose={jest.fn()}
        value={null}
        visible
      />,
    );

    expect(screen.getByText('May 2099')).toBeOnTheScreen();
    expect(screen.getByTestId('date-picker-previous-month')).toBeDisabled();

    await user.press(screen.getByTestId('date-picker-next-month'));

    expect(screen.getByText('June 2099')).toBeOnTheScreen();
    expect(screen.getByTestId('date-picker-previous-month')).toBeEnabled();
  });

  it('starts each opening from the applied value', async () => {
    const props = {
      minimumDate: '2099-05-15',
      onApply: jest.fn(),
      onClose: jest.fn(),
    };
    const { rerender, user } = setup(
      <DatePickerModal {...props} value="2099-05-16" visible />,
    );

    await user.press(screen.getByTestId('date-picker-day-2099-05-17'));
    expect(screen.getByTestId('date-picker-day-2099-05-17')).toBeSelected();

    rerender(<DatePickerModal {...props} value="2099-06-20" visible={false} />);
    rerender(<DatePickerModal {...props} value="2099-06-20" visible />);

    expect(screen.getByText('June 2099')).toBeOnTheScreen();
    expect(screen.getByTestId('date-picker-day-2099-06-20')).toBeSelected();
  });

  it('localizes its controls in English and Telugu', async () => {
    const props = {
      minimumDate: '2099-05-15',
      onApply: jest.fn(),
      onClose: jest.fn(),
      value: null,
      visible: true,
    };
    const view = setup(<DatePickerModal {...props} />);

    expect(screen.getByText('Pick a future date')).toBeOnTheScreen();
    expect(screen.getByText('Choose tomorrow or a later date.')).toBeOnTheScreen();
    expect(screen.getByLabelText('Previous month')).toBeOnTheScreen();
    expect(screen.getByLabelText('Next month')).toBeOnTheScreen();
    expect(screen.getByTestId('date-picker-cancel-label')).toHaveTextContent('Cancel');
    expect(screen.getByTestId('date-picker-apply-label')).toHaveTextContent('Apply');

    await act(() => i18n.changeLanguage('te'));
    view.rerender(<DatePickerModal {...props} />);

    expect(screen.getByText('భవిష్యత్ తేదీని ఎంచుకోండి')).toBeOnTheScreen();
    expect(screen.getByText('రేపు లేదా తర్వాతి తేదీని ఎంచుకోండి.')).toBeOnTheScreen();
    expect(screen.getByLabelText('మునుపటి నెల')).toBeOnTheScreen();
    expect(screen.getByLabelText('తదుపరి నెల')).toBeOnTheScreen();
    expect(screen.getByTestId('date-picker-cancel-label')).toHaveTextContent('రద్దు చేయండి');
    expect(screen.getByTestId('date-picker-apply-label')).toHaveTextContent('వర్తింపజేయి');
  });
});
