import { useState, useEffect } from "react"
import { useLocation } from "wouter"
import { AnimatePresence, motion } from "framer-motion"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import TeamSidebar from '@/components/TeamSidebar'
import { GlobalBackground } from '@/components/GlobalBackground'
import { 
  Building, 
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react'
import { useChantiers } from '@/context/ChantiersContext'

export default function TeamDashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'planning'>('overview')
  const [location] = useLocation()
  const { chantiers } = useChantiers()
  const [teamMember, setTeamMember] = useState<any>(null)

  useEffect(() => {
    // Vérifier si l'utilisateur est un membre d'équipe
    const storedMember = localStorage.getItem('teamMember')
    const userType = localStorage.getItem('userType')
    
    if (!storedMember || userType !== 'team') {
      // Rediriger vers la page d'accueil si pas de membre
      window.location.href = '/'
      return
    }

    setTeamMember(JSON.parse(storedMember))
  }, [])

  // Stats pour le membre
  const myChantiers = chantiers.filter(c => c.statut !== 'terminé')
  const chantiersEnCours = chantiers.filter(c => c.statut === 'en cours')
  const chantiersPlanifies = chantiers.filter(c => c.statut === 'planifié')

  return (
    <>
      <GlobalBackground />
      <div className="flex min-h-screen relative overflow-hidden">
        {/* Sidebar */}
        <TeamSidebar />

        {/* Main Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="flex-1 flex flex-col relative z-10 ml-64 rounded-l-3xl overflow-hidden"
          >
            <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-4 rounded-tl-3xl ml-0 sm:ml-20">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    Dashboard Membre d'Équipe
                  </h1>
                  <p className="text-sm text-white/70">
                    {teamMember ? `Bienvenue, ${teamMember.name}` : 'Chargement...'}
                  </p>
                </div>
              </div>
            </header>

            {/* Tabs Navigation */}
            <div className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-6 rounded-tl-3xl">
              <div className="flex gap-2 overflow-x-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab('overview')}
                  className={activeTab === 'overview' ? 'bg-white/20 backdrop-blur-md border border-white/10 text-white hover:bg-white/30' : 'text-white hover:bg-white/10'}
                >
                  Vue d'ensemble
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab('projects')}
                  className={activeTab === 'projects' ? 'bg-white/20 backdrop-blur-md border border-white/10 text-white hover:bg-white/30' : 'text-white hover:bg-white/10'}
                >
                  <Building className="h-4 w-4 mr-2" />
                  Mes Chantiers
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab('planning')}
                  className={activeTab === 'planning' ? 'bg-white/20 backdrop-blur-md border border-white/10 text-white hover:bg-white/30' : 'text-white hover:bg-white/10'}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Planning
                </Button>
              </div>
            </div>

            {/* Tab Content */}
            <main className="flex-1 p-4 sm:p-6 space-y-6 overflow-auto ml-0 sm:ml-20">
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Mes Chantiers</CardTitle>
                        <Building className="h-4 w-4 text-white/70" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{myChantiers.length}</div>
                        <p className="text-xs text-white/70">Chantiers actifs</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">En Cours</CardTitle>
                        <Clock className="h-4 w-4 text-white/70" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{chantiersEnCours.length}</div>
                        <p className="text-xs text-white/70">Chantiers en cours</p>
                      </CardContent>
                    </Card>

                    <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Planifiés</CardTitle>
                        <Calendar className="h-4 w-4 text-white/70" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{chantiersPlanifies.length}</div>
                        <p className="text-xs text-white/70">Chantiers planifiés</p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Mes Chantiers Récents */}
                  <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
                    <CardHeader>
                      <CardTitle>Mes Chantiers Récents</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {myChantiers.length === 0 ? (
                        <p className="text-white/70 text-center py-4">Aucun chantier assigné</p>
                      ) : (
                        <div className="space-y-3">
                          {myChantiers.slice(0, 5).map((chantier) => (
                            <div
                              key={chantier.id}
                              className="flex items-center justify-between p-3 bg-black/20 backdrop-blur-md border border-white/10 rounded-lg"
                            >
                              <div>
                                <p className="font-medium text-white">{chantier.nom}</p>
                                <p className="text-sm text-white/70">Client: {chantier.clientName}</p>
                                <p className="text-xs text-white/60">Début: {chantier.dateDebut} ({chantier.duree})</p>
                              </div>
                              <Badge className={
                                chantier.statut === 'planifié' ? 'bg-blue-500/20 text-blue-300' :
                                chantier.statut === 'en cours' ? 'bg-yellow-500/20 text-yellow-300' :
                                'bg-green-500/20 text-green-300'
                              }>
                                {chantier.statut}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === 'projects' && (
                <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
                  <CardHeader>
                    <CardTitle>Mes Chantiers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {myChantiers.length === 0 ? (
                      <div className="text-center py-8">
                        <Building className="h-12 w-12 mx-auto mb-4 text-white/50" />
                        <p className="text-white/70">Aucun chantier assigné</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {myChantiers.map((chantier) => (
                          <Card key={chantier.id} className="bg-black/20 backdrop-blur-lg border border-white/10 text-white">
                            <CardHeader>
                              <CardTitle className="text-lg">{chantier.nom}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                              <p className="text-sm text-white/70">Client: {chantier.clientName}</p>
                              <p className="text-sm text-white/70">Début: {chantier.dateDebut}</p>
                              <p className="text-sm text-white/70">Durée: {chantier.duree}</p>
                              {chantier.images.length > 0 && (
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                  {chantier.images.slice(0, 2).map((img, index) => (
                                    <img key={index} src={img} alt={`Chantier ${index}`} className="w-full h-20 object-cover rounded-md" />
                                  ))}
                                </div>
                              )}
                              <Badge className={
                                chantier.statut === 'planifié' ? 'bg-blue-500/20 text-blue-300' :
                                chantier.statut === 'en cours' ? 'bg-yellow-500/20 text-yellow-300' :
                                'bg-green-500/20 text-green-300'
                              }>
                                {chantier.statut}
                              </Badge>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {activeTab === 'planning' && (
                <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
                  <CardHeader>
                    <CardTitle>Mon Planning</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-white/70 text-center py-4">
                      Vue planning simplifiée pour les membres d'équipe
                    </p>
                    {/* Ici vous pouvez ajouter un calendrier simplifié si nécessaire */}
                  </CardContent>
                </Card>
              )}
            </main>
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  )
}

