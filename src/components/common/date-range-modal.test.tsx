import * as React from 'react';

import { DateRangeModal } from '@/components/common/date-range-modal';
import { cleanup, screen, setup } from '@/lib/test-utils';

afterEach(() => {
  cleanup();
  jest.useRealTimers();
});

describe('date range modal', () => {
  it('applies an inclusive range', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2099-05-01T09:00:00'));
    const onApply = jest.fn();
    const { user } = setup(
      <DateRangeModal
        from={null}
        onApply={onApply}
        onClose={jest.fn()}
        to={null}
        visible
      />,
    );

    await user.press(screen.getByTestId('day-2099-05-15'));
    await user.press(screen.getByTestId('day-2099-05-17'));
    expect(screen.getByTestId('day-2099-05-15')).toBeSelected();
    expect(screen.getByTestId('day-2099-05-17')).toBeSelected();

    await user.press(screen.getByTestId('date-range-apply'));
    expect(onApply).toHaveBeenCalledWith('2099-05-15', '2099-05-17');
  });
});
