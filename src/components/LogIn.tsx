import { useLocation, Navigate } from 'react-router-dom';
import { uiConfig, useAuth, StyledFirebaseAuth } from './Auth';
import { auth } from '../firebase-app';

const LogIn = (): JSX.Element => {
  const location = useLocation();
  const from: string = location.state ?? '/';

  const uiConfigWithRedirect = { ...uiConfig, signInSuccessUrl: from };

  const currentUser = useAuth();

  if (currentUser === null) {
    return (
      <div>
        <StyledFirebaseAuth
          uiConfig={uiConfigWithRedirect}
          firebaseAuth={auth}
        />
      </div>
    );
  }
  return <Navigate replace to={from} />;
};

export default LogIn;
