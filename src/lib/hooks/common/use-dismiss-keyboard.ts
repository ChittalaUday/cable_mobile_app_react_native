import * as React from 'react';
import { Keyboard } from 'react-native';

export function useDismissKeyboardOnExit(open: boolean = true): void {
  React.useEffect(() => {
    if (!open)
      Keyboard.dismiss();
  }, [open]);

  React.useEffect(() => () => Keyboard.dismiss(), []);
}
