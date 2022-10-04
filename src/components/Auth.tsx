import * as firebaseAuth from 'firebase/auth';
import React, { ReactNode, useContext, useEffect, useState } from 'react';
import 'firebaseui/dist/firebaseui.css';
import { auth, getOrCreateUserProfile, UserProfile } from '../firebase-app';

// Combine the Firebase auth data with the user's profile data.
class User {
  userProfile: UserProfile;
  firebaseUser: firebaseAuth.User;

  constructor(userProfile: UserProfile, firebaseUser: firebaseAuth.User) {
    this.userProfile = userProfile;
    this.firebaseUser = firebaseUser;
  }

  uid(): string {
    return this.firebaseUser.uid;
  }

  email(): string | null {
    return this.firebaseUser.email;
  }

  role(): string | null {
    return this.userProfile.role;
  }
}

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
    auth.onAuthStateChanged((firebaseUser) => {
      console.log('onAuthStateChanged');
      if (firebaseUser !== null) {
        void (async function () {
          const userProfile = await getOrCreateUserProfile(firebaseUser.uid);
          setCurrentUser(new User(userProfile, firebaseUser));
        })();
      } else {
        setCurrentUser(null);
      }
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
