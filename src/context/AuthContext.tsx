import React, { createContext, useContext, useState, useEffect } from 'react';
import { User as AuthUser, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string, bureau: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: string, bureau: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updated: Partial<User>) => void;
  fetchProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userToken = await firebaseUser.getIdToken();
        localStorage.setItem('token', userToken);
        setToken(userToken);
        await fetchProfileData(firebaseUser.uid, firebaseUser.email || '');
      } else {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const fetchProfileData = async (uid: string, email: string) => {
    try {
      // Security check: ensure user still exists in the backend database
      // If deleted by an admin, the backend will return 404
      const currentToken = localStorage.getItem('token');
      if (currentToken) {
        try {
          const backendRes = await fetch('/api/users/me', {
            headers: { 'Authorization': `Bearer ${currentToken}` }
          });
          
          if (backendRes.status === 404 || backendRes.status === 403) {
            // User was deleted by an admin
            if (auth.currentUser) {
              await auth.currentUser.delete().catch(() => {});
            }
            await signOut(auth);
            localStorage.removeItem('token');
            setToken(null);
            setUser(null);
            setLoading(false);
            alert('Your account has been deleted by an administrator and you can no longer log in.');
            return; // Stop further profile fetching
          }
        } catch (fetchErr) {
          console.warn("Backend validation check failed:", fetchErr);
        }
      }

      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Force admin for specific email if they somehow got downgraded or registered before the fix
        if (email.toLowerCase() === 'rashmeet1309@gmail.com' || email.toLowerCase() === 'admin@example.com') {
          userData.role = 'Admin';
        }
        
        setUser({ id: uid, ...userData } as User);
      } else {
        // Fallback user object if not yet in Firestore
        const fallbackRole = (email.toLowerCase() === 'rashmeet1309@gmail.com' || email.toLowerCase() === 'admin@example.com') ? 'Admin' : 'Team Member';
        const fallbackUser = {
          id: uid,
          email: email,
          name: email.split('@')[0],
          role: fallbackRole,
          bureau: 'Kanpur Bureau / Print',
          active: true,
          avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
        };
        try {
          await setDoc(doc(db, 'users', uid), fallbackUser);
        } catch (setErr) {
          console.warn('Firestore setDoc failed during profile creation:', setErr);
        }
        setUser(fallbackUser as User);
      }
    } catch (err) {
      console.warn('Error fetching profile from Firestore, using fallback profile state:', err);
      const fallbackRole = (email.toLowerCase() === 'rashmeet1309@gmail.com' || email.toLowerCase() === 'admin@example.com') ? 'Admin' : 'Team Member';
      const fallbackUser = {
        id: uid,
        email: email,
        name: email.split('@')[0],
        role: fallbackRole,
        bureau: 'Kanpur Bureau / Print',
        active: true,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
      };
      setUser(fallbackUser as User);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfile = async () => {
    const currentUser = auth.currentUser;
    if (currentUser) {
      await fetchProfileData(currentUser.uid, currentUser.email || '');
    }
  };

  const login = async (email: string, password: string, bureau: string) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userToken = await userCredential.user.getIdToken();
    localStorage.setItem('token', userToken);
    setToken(userToken);
    await fetchProfileData(userCredential.user.uid, userCredential.user.email || '');
  };

  const register = async (email: string, password: string, name: string, role: string, bureau: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const uid = userCredential.user.uid;
    
    // Automatically make the first predefined user or this specific email an Admin
    const assignedRole = email.toLowerCase() === 'admin@example.com' || email.toLowerCase() === 'rashmeet1309@gmail.com' 
      ? 'Admin' 
      : 'Team Member';

    // Create the user profile in Firestore
    try {
      await setDoc(doc(db, 'users', uid), {
        name,
        email,
        role: assignedRole,
        bureau,
        active: true,
        department: '',
        phone: '',
        taskCount: '0/0',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
      });
    } catch (setErr) {
      console.warn('Firestore setDoc failed during registration:', setErr);
    }

    const userToken = await userCredential.user.getIdToken();
    localStorage.setItem('token', userToken);
    setToken(userToken);
    await fetchProfileData(uid, email);
  };

  const logout = async () => {
    await signOut(auth);
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const updateProfile = (updated: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updated } as User);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, updateProfile, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

