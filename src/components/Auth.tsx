import { User } from 'firebase/auth';
import React, { ReactNode, useContext, useEffect, useState } from 'react';
import 'firebaseui/dist/firebaseui.css';
import { auth } from '../firebase-app';

export const AuthContext = React.createContext<User | null>(null);

export function useAuth(): User | null {
  return useContext<User | null>(AuthContext);
}

interface Props {
  children: ReactNode;
}

const AuthProvider = ({ children }: Props): JSX.Element => {
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
