import {
  EmailAuthProvider,
  GoogleAuthProvider,
  onAuthStateChanged,
} from 'firebase/auth';
import { useRef, useEffect, useState } from 'react';
import 'firebaseui/dist/firebaseui.css';
import * as firebaseui from 'firebaseui';

export const uiConfig = {
  signInFlow: 'popup',
  signInOptions: [
    GoogleAuthProvider.PROVIDER_ID,
    // FacebookAuthProvider.PROVIDER_ID,
    // TwitterAuthProvider.PROVIDER_ID,
    // GithubAuthProvider.PROVIDER_ID,
    EmailAuthProvider.PROVIDER_ID,
    // PhoneAuthProvider.PROVIDER_ID,
    // AnonymousAuthProvider.PROVIDER_ID,
  ],
  callbacks: {
    // Avoid redirects after sign-in.
    signInSuccessWithAuthResult: () => false,
  },
};

interface Props {
  // The Firebase UI Web UI Config object.
  // See: https://github.com/firebase/firebaseui-web#configuration
  uiConfig: firebaseui.auth.Config;
  // Callback that will be passed the FirebaseUi instance before it is
  // started. This allows access to certain configuration options such as
  // disableAutoSignIn().
  uiCallback?: (ui: firebaseui.auth.AuthUI) => void;
  // The Firebase App auth instance to use.
  firebaseAuth: any; // As firebaseui-web
  className?: string;
}

// Reimplementation of the firebaseui-web-react using firebaseui-web,
// because it does not work with React 18.
// See https://github.com/firebase/firebaseui-web-react/issues/165
export const StyledFirebaseAuth = ({
  uiConfig,
  firebaseAuth,
  className,
  uiCallback,
}: Props): JSX.Element => {
  const [userSignedIn, setUserSignedIn] = useState(false);
  const elementRef = useRef(null);
  const skipStrictEffects = useRef(false);

  useEffect(() => {
    const firebaseUiWidget =
      firebaseui.auth.AuthUI.getInstance() ??
      new firebaseui.auth.AuthUI(firebaseAuth);
    if (uiConfig.signInFlow === 'popup') firebaseUiWidget.reset();

    const unregisterAuthObserver = onAuthStateChanged(firebaseAuth, (user) => {
      if (user !== null && userSignedIn) firebaseUiWidget.reset();
      setUserSignedIn(user !== null);
    });

    if (uiCallback !== undefined && uiCallback !== null) {
      uiCallback(firebaseUiWidget);
    }

    // Work-around for it to work with React strict mode.
    // See https://github.com/firebase/firebaseui-web-react/pull/173#issuecomment-1247355860
    if (!skipStrictEffects.current) {
      skipStrictEffects.current = firebaseUiWidget.isPendingRedirect();
      firebaseUiWidget.start(elementRef.current!, uiConfig);
    }

    return () => {
      if (!skipStrictEffects.current) {
        unregisterAuthObserver();
        firebaseUiWidget.reset();
      }
    };
  }, [firebaseui, uiConfig]);

  return <div className={className} ref={elementRef} />;
};

export default StyledFirebaseAuth;
