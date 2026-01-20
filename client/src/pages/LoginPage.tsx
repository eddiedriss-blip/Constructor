import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useLocation } from "wouter"
import { Users, Key } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { motion } from "framer-motion"

export default function LoginPage() {
  const [code, setCode] = useState("")
  const [loginMode, setLoginMode] = useState<'admin' | 'team'>('admin')
  const [, setLocation] = useLocation()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Rediriger directement sans vérification, même si le code est vide
    if (loginMode === 'team') {
      // Stocker le type utilisateur dans le localStorage
      localStorage.setItem('userType', 'team')
      setLocation("/team-dashboard")
    } else {
      // Mode admin - rediriger vers /loading puis /dashboard
      localStorage.setItem('userType', 'admin')
      setLocation("/loading")
    }
  }

  return (
    <div className="relative w-full min-h-screen overflow-hidden">
      <div className="relative z-10 flex items-center justify-center min-h-screen p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md bg-black/20 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl text-white"
        >
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4 relative">
              <div className="flex-1"></div>
              <h1 className="text-3xl font-light tracking-tight text-white flex-1 text-center absolute left-0 right-0">
                Connexion
              </h1>
            </div>
            <p className="text-white/80 text-sm text-center">
              {loginMode === 'admin' 
                ? "Entrer votre code de connection à votre application"
                : "Sélectionnez un membre d'équipe ou entrez votre code"}
            </p>
          </div>

          {/* Toggle Admin/Team */}
          <div className="flex gap-2 mb-6">
            <Button
              type="button"
              variant={loginMode === 'admin' ? 'default' : 'outline'}
              onClick={() => setLoginMode('admin')}
              className={`flex-1 ${loginMode === 'admin' 
                ? 'bg-violet-500 text-white' 
                : 'bg-transparent border-white/20 text-white hover:bg-white/10'}`}
            >
              Admin
            </Button>
            <Button
              type="button"
              variant={loginMode === 'team' ? 'default' : 'outline'}
              onClick={() => setLoginMode('team')}
              className={`flex-1 ${loginMode === 'team' 
                ? 'bg-violet-500 text-white' 
                : 'bg-transparent border-white/20 text-white hover:bg-white/10'}`}
            >
              <Users className="h-4 w-4 mr-2" />
              Équipe
            </Button>
          </div>

          {loginMode === 'team' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Entrez votre code (optionnel)"
                  className="w-full bg-black/20 border-white/20 text-white placeholder:text-white/50 focus:border-violet-400 focus:ring-violet-400/20 h-12 text-center text-lg tracking-widest font-mono"
                  maxLength={10}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-violet-500 hover:bg-violet-600 text-white transition-colors h-12 text-base font-medium rounded-2xl"
              >
                Se connecter
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Entrez votre code (optionnel)"
                  className="w-full bg-black/40 backdrop-blur-md border-white/20 text-white placeholder:text-white/50 focus:border-violet-400 focus:ring-violet-400/20 h-12 text-center text-lg tracking-widest font-mono"
                  maxLength={10}
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-violet-500 hover:bg-violet-600 text-white transition-colors h-12 text-base font-medium rounded-2xl"
              >
                Se connecter
              </Button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  )
}
