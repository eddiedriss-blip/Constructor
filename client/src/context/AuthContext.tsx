import { createContext, useContext, useState, ReactNode } from 'react';

// Interface utilisateur simplifiée
interface SimpleUser {
  id: string;
  email?: string;
  full_name?: string;
}

interface AuthContextType {
  user: SimpleUser | null;
  session: any | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Toujours considérer l'utilisateur comme connecté
  const [user] = useState<SimpleUser | null>({
    id: 'default-user',
    email: 'user@example.com',
    full_name: 'Utilisateur'
  });
  const [session] = useState<any | null>({ user });
  const [loading] = useState(false);

  const signUp = async (email: string, password: string, fullName?: string) => {
    // No-op : toujours considéré comme réussi
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    // No-op : toujours considéré comme réussi
    return { error: null };
  };

  const signOut = async () => {
    // No-op : l'utilisateur reste "connecté"
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
