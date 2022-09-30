import { EmailAuthProvider, User, onAuthStateChanged } from 'firebase/auth';
import React, {
  ReactNode,
  useRef,
  useContext,
  useEffect,
  useState,
} from 'react';
import * as firebaseui from 'firebaseui';
import 'firebaseui/dist/firebaseui.css';
import { auth } from '../firebase-app';

export const uiConfig = {
  signInFlow: 'popup',
  signInOptions: [
    // Leave the lines as is for the providers you want to offer your users.
    // GoogleAuthProvider.PROVIDER_ID,
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

export const AuthContext = React.createContext<User | null>(null);

export function useAuth(): User | null {
  return useContext<User | null>(AuthContext);
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps): JSX.Element => {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <p>Loading...</p>;
  }
  return (
    <AuthContext.Provider value={currentUser}>{children}</AuthContext.Provider>
  );
};

export default AuthProvider;
