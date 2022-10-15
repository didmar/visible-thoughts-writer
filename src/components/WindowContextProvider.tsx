// Adapted from https://stackoverflow.com/a/56406823/2320087
import React, { ReactNode, useContext, useEffect, useState } from 'react';

export const WindowContext = React.createContext<boolean>(true);

export function useWindowActivity(): boolean {
  return useContext<boolean>(WindowContext);
}

interface Props {
  children?: ReactNode;
}

export const WindowContextProvider = ({ children }: Props): JSX.Element => {
  const [windowIsActive, setWindowIsActive] = useState<boolean>(true);

  function handleActivity(forcedFlag: boolean): void {
    forcedFlag ? setWindowIsActive(true) : setWindowIsActive(false);
  }

  function handleVisibilityChange(): void {
    document.hidden ? setWindowIsActive(false) : setWindowIsActive(true);
  }

  useEffect(() => {
    const handleActivityFalse = (): void => handleActivity(false);
    const handleActivityTrue = (): void => handleActivity(true);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('blur', handleActivityFalse);
    window.addEventListener('blur', handleActivityFalse);
    window.addEventListener('focus', handleActivityTrue);
    document.addEventListener('focus', handleActivityTrue);

    return () => {
      window.removeEventListener('blur', handleVisibilityChange);
      document.removeEventListener('blur', handleActivityFalse);
      window.removeEventListener('focus', handleActivityFalse);
      document.removeEventListener('focus', handleActivityTrue);
      document.removeEventListener('visibilitychange', handleActivityTrue);
    };
  }, []);

  return (
    <WindowContext.Provider value={windowIsActive}>
      {children}
    </WindowContext.Provider>
  );
};
