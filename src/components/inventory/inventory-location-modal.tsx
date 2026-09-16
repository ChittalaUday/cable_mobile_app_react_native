import type { Location } from '@/lib/api/types';
import * as React from 'react';
import { LocationPickerSheet } from '@/components/locations/location-picker-sheet';
import { useModal } from '@/components/ui';

export function InventoryLocationModal({
  visible,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selectedLocationId?: string;
  onSelect: (location?: Location | null) => void;
  onClose?: () => void;
}) {
  const sheet = useModal();

  React.useEffect(() => {
    if (visible) {
      sheet.present();
    }
    else {
      sheet.dismiss();
    }
  }, [visible, sheet]);

  return (
    <LocationPickerSheet
      ref={sheet.ref}
      title="Select Stock Location"
      confirmLabel={current => (current ? `Filter by ${current.name}` : 'All Locations')}
      onSelect={(loc) => {
        sheet.dismiss();
        onSelect(loc ?? undefined);
        onClose?.();
      }}
    />
  );
}
