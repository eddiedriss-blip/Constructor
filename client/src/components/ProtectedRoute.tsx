interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  // Permettre l'accès sans authentification
  return <>{children}</>;
}

