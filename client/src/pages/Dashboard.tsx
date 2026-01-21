import { useEffect } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Sidebar from '@/components/Sidebar'
import { UserAccountButton } from '@/components/UserAccountButton'
import { 
  Building, 
  FileText, 
  Euro,
  TrendingUp,
  Plus,
  User
} from 'lucide-react'
import { Link, useLocation } from 'wouter'
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const chartData = [
  { name: 'Jan', revenus: 120000, depenses: 80000 },
  { name: 'Fév', revenus: 135000, depenses: 85000 },
  { name: 'Mar', revenus: 150000, depenses: 90000 },
  { name: 'Avr', revenus: 165000, depenses: 95000 },
  { name: 'Mai', revenus: 180000, depenses: 100000 },
  { name: 'Jun', revenus: 195000, depenses: 105000 },
]

const conversionData = [
  { name: 'Sem 1', taux: 65 },
  { name: 'Sem 2', taux: 68 },
  { name: 'Sem 3', taux: 71 },
  { name: 'Sem 4', taux: 73 },
]

export default function Dashboard() {
  const [location, setLocation] = useLocation();

  useEffect(() => {
    const userType = localStorage.getItem('userType')
    if (userType === 'team') {
      setLocation('/team-dashboard')
    }
  }, [setLocation])
  
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="relative z-10">
        <Sidebar />
        
        {/* User Account Button - fixed top right */}
        <UserAccountButton />

        {/* Main Content */}
        <main className="ml-0 lg:ml-0 p-4 sm:p-6 lg:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-7xl mx-auto"
          >
            {/* Header */}
            <div className="mb-8 ml-0 sm:ml-20">
              <h1 className="text-4xl font-light tracking-tight text-white mb-2 drop-shadow-lg">
                Dashboard
              </h1>
              <p className="text-white/90 drop-shadow-md">Vue d'ensemble de votre activité</p>
            </div>

            {/* Content */}
            <div className="space-y-6">
              <OverviewTab />
            </div>
          </motion.div>
        </AnimatePresence>
      </main>
      </div>
    </div>
  )
}

// Overview Tab Component
function OverviewTab() {
  const [, setLocation] = useLocation();
  
  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        <MetricCard
          title="Chiffre d'Affaires"
          value="€165,000"
          change="+18.2%"
          icon={Euro}
          delay={0.1}
        />
        <MetricCard
          title="Chantiers Actifs"
          value="12"
          change="+3 en cours"
          icon={Building}
          delay={0.2}
        />
        <MetricCard
          title="Devis En Attente"
          value="8"
          change="Réponses attendues"
          icon={FileText}
          delay={0.3}
        />
        <MetricCard
          title="Taux de Conversion"
          value="73%"
          change="+5.2%"
          icon={TrendingUp}
          delay={0.4}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 shadow-xl rounded-2xl text-white">
          <CardHeader>
            <CardTitle className="text-white font-light">Évolution des Revenus</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenus" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#a78bfa" stopOpacity={0.5}/>
                    <stop offset="95%" stopColor="#a78bfa" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis dataKey="name" stroke="rgba(255, 255, 255, 0.7)" />
                <YAxis stroke="rgba(255, 255, 255, 0.7)" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px',
                    color: '#fff'
                  }}
                />
                <Area type="monotone" dataKey="revenus" stroke="#a78bfa" fillOpacity={1} fill="url(#colorRevenus)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 shadow-xl rounded-2xl text-white">
          <CardHeader>
            <CardTitle className="text-white font-light">Taux de Conversion</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={conversionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis dataKey="name" stroke="rgba(255, 255, 255, 0.7)" />
                <YAxis stroke="rgba(255, 255, 255, 0.7)" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px',
                    color: '#fff'
                  }}
                />
                <Line type="monotone" dataKey="taux" stroke="#a78bfa" strokeWidth={2} dot={{ fill: '#a78bfa', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-black/20 backdrop-blur-xl border border-white/10 shadow-xl rounded-2xl text-white">
        <CardHeader>
          <CardTitle className="text-white font-light">Actions Rapides</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Button 
            className="w-full justify-start h-auto p-4 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30 border border-violet-200 dark:border-violet-800"
            onClick={() => setLocation('/dashboard/projects?openDialog=true')}
          >
            <Plus className="h-5 w-5 mr-3" />
            <div className="text-left">
              <div className="font-medium">Nouveau Chantier</div>
              <div className="text-xs opacity-70">Créer un projet</div>
            </div>
          </Button>
          <Button 
            className="w-full justify-start h-auto p-4 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30 border border-violet-200 dark:border-violet-800"
            onClick={() => setLocation('/dashboard/quotes')}
          >
            <FileText className="h-5 w-5 mr-3" />
            <div className="text-left">
              <div className="font-medium">Créer un Devis</div>
              <div className="text-xs opacity-70">Générer un devis</div>
            </div>
          </Button>
          <Button 
            className="w-full justify-start h-auto p-4 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30 border border-violet-200 dark:border-violet-800"
            onClick={() => setLocation('/dashboard/clients?addClient=true')}
          >
            <User className="h-5 w-5 mr-3" />
            <div className="text-left">
              <div className="font-medium">Ajouter un Client</div>
              <div className="text-xs opacity-70">Nouveau client</div>
            </div>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function MetricCard({ title, value, change, icon: Icon, delay }: { title: string, value: string, change: string, icon: any, delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
    >
      <Card className="bg-black/20 backdrop-blur-xl border border-white/10 shadow-xl rounded-2xl hover:shadow-2xl transition-shadow text-white">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-white/70">{title}</CardTitle>
          <Icon className="h-5 w-5 text-violet-400" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-light text-white mb-1">{value}</div>
          <p className="text-xs text-white/60">{change}</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

