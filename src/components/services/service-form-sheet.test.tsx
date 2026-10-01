import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { Service } from '@/lib/api/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as React from 'react';
import { ServiceFormSheet } from '@/components/services/service-form-sheet';

type CreateCall = { payload: { name: string; icon: string; description?: string } };
type UpdateCall = { id: string; patch: { name?: string; icon?: string; description?: string | null } };

const mockCreate = jest.fn<Promise<{ id: string }>, [CreateCall]>(async () => ({ id: 'svc_new' }));
const mockUpdate = jest.fn<Promise<{ id: string }>, [UpdateCall]>(async () => ({ id: 'svc_cable' }));

jest.mock('@/lib/hooks/api/use-services', () => ({
  useCreateService: () => ({ mutateAsync: mockCreate, isPending: false }),
  useUpdateService: () => ({ mutateAsync: mockUpdate, isPending: false }),
}));

const CABLE = {
  id: 'svc_cable',
  name: 'Cabel TV',
  icon: 'tv',
  description: 'The old blurb',
} as unknown as Service;

function Harness({ service }: { service?: Service | null }) {
  const ref = React.useRef<BottomSheetModal>(null);

  return <ServiceFormSheet ref={ref} service={service} />;
}

function renderSheet(service?: Service | null) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={client}>
      <Harness service={service} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('the service sheet', () => {
  it('creates when it was opened on nothing', async () => {
    renderSheet(null);

    fireEvent.changeText(screen.getByTestId('service-name'), 'Broadband');
    fireEvent.press(screen.getByTestId('service-save'));

    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockCreate.mock.calls[0]![0]).toMatchObject({
      payload: { name: 'Broadband', icon: 'tv' },
    });
  });

  it('fills itself from the service it was opened on and patches that one', async () => {
    renderSheet(CABLE);

    expect(screen.getByTestId('service-name').props.value).toBe('Cabel TV');
    expect(screen.getByTestId('service-description').props.value).toBe('The old blurb');

    fireEvent.changeText(screen.getByTestId('service-name'), 'Cable TV');
    fireEvent.press(screen.getByTestId('service-save'));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    expect(mockCreate).not.toHaveBeenCalled();
    expect(mockUpdate.mock.calls[0]![0]).toMatchObject({
      id: 'svc_cable',
      patch: { name: 'Cable TV' },
    });
  });

  it('clears a description with null, so emptying the box actually removes it', async () => {
    renderSheet(CABLE);

    fireEvent.changeText(screen.getByTestId('service-description'), '');
    fireEvent.press(screen.getByTestId('service-save'));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalled());
    // undefined here would leave "The old blurb" standing on the server.
    expect(mockUpdate.mock.calls[0]![0].patch.description).toBeNull();
  });

  it('refuses to save a service with no name', () => {
    renderSheet(null);

    fireEvent.press(screen.getByTestId('service-save'));

    expect(mockCreate).not.toHaveBeenCalled();
    expect(screen.getByText('Give the service a name')).toBeTruthy();
  });
});
