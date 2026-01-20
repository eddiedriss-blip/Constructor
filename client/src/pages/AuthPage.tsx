import { useState } from "react"
import { useLocation } from "wouter"
import { useAuth } from "@/context/AuthContext"
import { SignInPage } from "@/components/SignInPage"

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { signUp, signIn } = useAuth()
  const [, setLocation] = useLocation()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    e.stopPropagation()
    setError(null)
    
    // S'assurer que userType est défini AVANT la redirection
    localStorage.setItem('userType', 'admin')
    
    // Rediriger directement vers le dashboard sans vérification
    // Les champs peuvent être vides
    try {
      if (isSignUp) {
        // Appeler signUp mais ignorer le résultat
        await signUp('', '', '')
      } else {
        // Appeler signIn mais ignorer le résultat
        await signIn('', '')
      }
    } catch (err: any) {
      // En cas d'erreur, continuer quand même
    }
    
    // Redirection après un court délai pour s'assurer que tout est prêt
    setTimeout(() => {
      setLocation("/dashboard")
    }, 100)
  }

  return (
    <div className="relative w-full min-h-screen overflow-hidden">
      <div className="relative z-10">
        {error && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm backdrop-blur-md">
            {error}
          </div>
        )}
        <SignInPage
          title={
            <span className="font-light text-white tracking-tighter">
              {isSignUp ? "Créer un compte" : "Bienvenue"}
            </span>
          }
          description={
            isSignUp
              ? "Créez votre compte pour accéder à votre application Constructo"
              : "Connectez-vous à votre compte Constructo"
          }
          isSignUp={isSignUp}
          onToggleMode={() => setIsSignUp(!isSignUp)}
          onSignIn={handleSubmit}
        />
      </div>
    </div>
  )
}

