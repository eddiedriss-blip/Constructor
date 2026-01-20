import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Mail, User, Phone, Calendar, FileText } from "lucide-react"
import { motion } from "framer-motion"

interface Prospect {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  notes?: string
  createdAt: string
}

interface Column {
  id: string
  name: string
  items: Prospect[]
}

export function CRMPipeline() {
  const [columns, setColumns] = useState<Column[]>([
    {
      id: 'all',
      name: 'Tous les prospects',
      items: [
        {
          id: '1',
          name: 'Jean Dupont',
          email: 'jean.dupont@example.com',
          phone: '06 12 34 56 78',
          company: 'Entreprise ABC',
          createdAt: '2024-01-15'
        }
      ]
    },
    {
      id: 'quote',
      name: 'Envoi du devis',
      items: []
    },
    {
      id: 'followup1',
      name: 'Relance 1',
      items: []
    },
    {
      id: 'followup2',
      name: 'Relance 2',
      items: []
    },
    {
      id: 'followup3',
      name: 'Relance 3',
      items: []
    },
  ])

  const [draggedItem, setDraggedItem] = useState<{prospect: Prospect, columnId: string} | null>(null)
  const [showQuoteModal, setShowQuoteModal] = useState(false)
  const [showFollowupModal, setShowFollowupModal] = useState(false)
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null)
  const [selectedColumn, setSelectedColumn] = useState<string>("")

  const handleDragStart = (prospect: Prospect, columnId: string) => {
    setDraggedItem({ prospect, columnId })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (targetColumnId: string) => {
    if (!draggedItem) return

    const { prospect, columnId: sourceColumnId } = draggedItem

    // Si on déplace vers "Envoi du devis", ouvrir la popup
    if (targetColumnId === 'quote') {
      setSelectedProspect(prospect)
      setSelectedColumn(targetColumnId)
      setShowQuoteModal(true)
      return
    }

    // Si on déplace vers une colonne de relance, ouvrir la popup
    if (targetColumnId.startsWith('followup')) {
      setSelectedProspect(prospect)
      setSelectedColumn(targetColumnId)
      setShowFollowupModal(true)
      return
    }

    // Déplacer l'élément
    setColumns(prev => {
      const newColumns = prev.map(col => {
        if (col.id === sourceColumnId) {
          return {
            ...col,
            items: col.items.filter(item => item.id !== prospect.id)
          }
        }
        if (col.id === targetColumnId) {
          return {
            ...col,
            items: [...col.items, prospect]
          }
        }
        return col
      })
      return newColumns
    })

    setDraggedItem(null)
  }

  const handleQuoteConfirm = () => {
    if (!draggedItem || !selectedProspect) return

    setColumns(prev => {
      const newColumns = prev.map(col => {
        if (col.id === draggedItem.columnId) {
          return {
            ...col,
            items: col.items.filter(item => item.id !== selectedProspect.id)
          }
        }
        if (col.id === 'quote') {
          return {
            ...col,
            items: [...col.items, selectedProspect]
          }
        }
        return col
      })
      return newColumns
    })

    // TODO: Implémenter l'envoi du devis par email/webhook

    setShowQuoteModal(false)
    setSelectedProspect(null)
    setDraggedItem(null)
  }

  const handleFollowupConfirm = () => {
    if (!draggedItem || !selectedProspect) return

    setColumns(prev => {
      const newColumns = prev.map(col => {
        if (col.id === draggedItem.columnId) {
          return {
            ...col,
            items: col.items.filter(item => item.id !== selectedProspect.id)
          }
        }
        if (col.id === selectedColumn) {
          return {
            ...col,
            items: [...col.items, selectedProspect]
          }
        }
        return col
      })
      return newColumns
    })

    // TODO: Implémenter l'envoi de la relance par email/webhook

    setShowFollowupModal(false)
    setSelectedProspect(null)
    setSelectedColumn("")
    setDraggedItem(null)
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {columns.map((column) => (
          <Card
            key={column.id}
            className="bg-black/20 backdrop-blur-xl border border-white/10 text-white"
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(column.id)}
          >
            <CardHeader>
              <CardTitle className="text-sm">{column.name}</CardTitle>
              <Badge variant="secondary" className="mt-2">
                {column.items.length}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="min-h-[200px] space-y-2">
                {column.items.map((prospect) => (
                  <motion.div
                    key={prospect.id}
                    draggable
                    onDragStart={() => handleDragStart(prospect, column.id)}
                    className="p-3 bg-black/20 backdrop-blur-md border border-white/10 rounded-lg cursor-move hover:bg-white/10 transition-all text-white"
                  >
                    <div className="space-y-1">
                      <p className="font-medium text-sm">{prospect.name}</p>
                      <div className="flex items-center gap-1 text-xs text-white/70">
                        <Mail className="h-3 w-3" />
                        <span className="truncate">{prospect.email}</span>
                      </div>
                      {prospect.phone && (
                        <div className="flex items-center gap-1 text-xs text-white/70">
                          <Phone className="h-3 w-3" />
                          <span>{prospect.phone}</span>
                        </div>
                      )}
                      {prospect.company && (
                        <p className="text-xs text-white/70">{prospect.company}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
                {column.items.length === 0 && (
                  <p className="text-xs text-white/70 text-center py-8">
                    Aucun prospect
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Modal pour visualisation du devis */}
      {showQuoteModal && selectedProspect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="bg-black/20 backdrop-blur-xl border border-white/10 w-full max-w-2xl m-4 text-white">
            <CardHeader>
              <CardTitle>Visualisation du Devis</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Destinataire:</p>
                <p className="text-sm">{selectedProspect.name} ({selectedProspect.email})</p>
              </div>
              <div className="border border-white/10 rounded-lg p-4 bg-black/20 backdrop-blur-md">
                <p className="text-sm text-white/70 mb-4">Aperçu du devis à envoyer...</p>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Prestation</span>
                    <span>€0.00</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Total</span>
                    <span>€0.00</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => {
                  setShowQuoteModal(false)
                  setSelectedProspect(null)
                  setDraggedItem(null)
                }}>
                  Annuler
                </Button>
                <Button onClick={handleQuoteConfirm}>
                  Envoyer le Devis
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal pour relance */}
      {showFollowupModal && selectedProspect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="bg-black/20 backdrop-blur-xl border border-white/10 w-full max-w-2xl m-4 text-white">
            <CardHeader>
              <CardTitle>Message de Relance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium mb-2">Destinataire:</p>
                <p className="text-sm">{selectedProspect.name} ({selectedProspect.email})</p>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Message (modifiable):</label>
                <textarea
                  className="w-full px-3 py-2 rounded-md border bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50 min-h-[150px]"
                  defaultValue="Bonjour, je souhaite faire un suivi concernant notre échange précédent..."
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => {
                  setShowFollowupModal(false)
                  setSelectedProspect(null)
                  setSelectedColumn("")
                  setDraggedItem(null)
                }}>
                  Annuler
                </Button>
                <Button onClick={handleFollowupConfirm}>
                  Envoyer la Relance
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

