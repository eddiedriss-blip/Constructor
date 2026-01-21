import { PageWrapper } from '@/components/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building, Plus, Calendar, Clock, User, Image as ImageIcon, X, Users as UsersIcon } from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useChantiers, Chantier, Client } from '@/context/ChantiersContext';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string | null;
  status: string;
  login_code?: string;
  loginCode?: string;
}

interface ChantierAssignment {
  id: string;
  chantierId: string;
  teamMemberId: string;
  teamMember: TeamMember;
}

export default function ProjectsPage() {
  const { chantiers, clients, addChantier, addClient } = useChantiers();
  const [location] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newChantier, setNewChantier] = useState({
    nom: '',
    clientId: '',
    dateDebut: '',
    duree: '',
    images: [] as string[]
  });
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [assignments, setAssignments] = useState<Record<string, ChantierAssignment[]>>({});
  const [selectedChantierForAssignment, setSelectedChantierForAssignment] = useState<string | null>(null);
  const [isAssignmentDialogOpen, setIsAssignmentDialogOpen] = useState(false);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setUploadedImages(prev => [...prev, ...files]);
      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            setNewChantier(prev => ({
              ...prev,
              images: [...prev.images, e.target.result as string]
            }));
          }
        };
        reader.readAsDataURL(file);
      });
    }
  }, []);

  const removeImage = (index: number) => {
    setNewChantier(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddChantier = async (e?: React.FormEvent) => {
    e?.preventDefault();
    
    // Validation avec trim pour ignorer les espaces
    const nom = newChantier.nom?.trim();
    const clientId = newChantier.clientId?.trim();
    const dateDebut = newChantier.dateDebut?.trim();
    const duree = newChantier.duree?.trim();
    
    if (!nom || !clientId || !dateDebut || !duree) {
      const missing = [];
      if (!nom) missing.push('nom');
      if (!clientId) missing.push('client');
      if (!dateDebut) missing.push('date de début');
      if (!duree) missing.push('durée');
      alert(`Veuillez remplir tous les champs obligatoires : ${missing.join(', ')}`);
      return;
    }

    try {
      await addChantier({
        nom,
        clientId,
        dateDebut,
        duree,
        images: newChantier.images || [],
        statut: 'planifié'
      });
      setNewChantier({ nom: '', clientId: '', dateDebut: '', duree: '', images: [] });
      setUploadedImages([]);
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error('Erreur lors de la création du chantier:', error);
      const errorMessage = error?.message || error?.error || 'Erreur lors de la création du chantier. Vérifiez votre connexion à Supabase.';
      alert(errorMessage);
    }
  };

  const handleAddClient = async () => {
    try {
      await addClient({
        name: `Client ${clients.length + 1}`,
        email: '',
        phone: ''
      });
      // Attendre que le client soit créé et recharger les données
      await new Promise(resolve => setTimeout(resolve, 500));
      const updatedClients = await fetch('/api/clients').then(r => r.json());
      if (updatedClients.length > 0) {
        const newClient = updatedClients[updatedClients.length - 1];
        setNewChantier(prev => ({ ...prev, clientId: newClient.id }));
      }
    } catch (error) {
      console.error('Erreur lors de la création du client:', error);
      alert('Erreur lors de la création du client. Vérifiez votre connexion à Supabase.');
    }
  };

  // Charger les membres d'équipe
  useEffect(() => {
    const loadTeamMembers = async () => {
      try {
        const response = await fetch('/api/team-members');
        if (response.ok) {
          const data = await response.json();
          setTeamMembers(data);
        }
      } catch (error) {
        console.error('Erreur chargement membres équipe:', error);
      }
    };
    loadTeamMembers();
  }, []);

  // Charger les affectations pour tous les chantiers
  useEffect(() => {
    const loadAssignments = async () => {
      const assignmentsMap: Record<string, ChantierAssignment[]> = {};
      for (const chantier of chantiers) {
        try {
          const response = await fetch(`/api/chantiers/${chantier.id}/team-members`);
          if (response.ok) {
            const data = await response.json();
            assignmentsMap[chantier.id] = data;
          }
        } catch (error) {
          console.error(`Erreur chargement affectations pour chantier ${chantier.id}:`, error);
        }
      }
      setAssignments(assignmentsMap);
    };
    if (chantiers.length > 0) {
      loadAssignments();
    }
  }, [chantiers]);

  // Ouvrir la popup si le paramètre openDialog est présent dans l'URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('openDialog') === 'true') {
      setIsDialogOpen(true);
      // Nettoyer l'URL
      window.history.replaceState({}, '', '/dashboard/projects');
    }
  }, [location]);

  const handleAssignMember = async (chantierId: string, teamMemberId: string) => {
    try {
      const response = await fetch(`/api/chantiers/${chantierId}/team-members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamMemberId }),
      });

      if (response.ok) {
        // Recharger les affectations
        const assignmentsResponse = await fetch(`/api/chantiers/${chantierId}/team-members`);
        if (assignmentsResponse.ok) {
          const data = await assignmentsResponse.json();
          setAssignments(prev => ({ ...prev, [chantierId]: data }));
        }
        setIsAssignmentDialogOpen(false);
        setSelectedChantierForAssignment(null);
      } else {
        const error = await response.json();
        alert(error.error || 'Erreur lors de l\'affectation');
      }
    } catch (error: any) {
      console.error('Erreur affectation membre:', error);
      alert(error.message || 'Erreur lors de l\'affectation du membre');
    }
  };

  const handleRemoveAssignment = async (chantierId: string, assignmentId: string) => {
    try {
      const response = await fetch(`/api/chantiers/${chantierId}/team-members/${assignmentId}`, {
        method: 'DELETE',
      });

      if (response.ok || response.status === 204) {
        // Recharger les affectations
        const assignmentsResponse = await fetch(`/api/chantiers/${chantierId}/team-members`);
        if (assignmentsResponse.ok) {
          const data = await assignmentsResponse.json();
          setAssignments(prev => ({ ...prev, [chantierId]: data }));
        }
      } else {
        const error = await response.json();
        alert(error.error || 'Erreur lors de la suppression');
      }
    } catch (error: any) {
      console.error('Erreur suppression affectation:', error);
      alert(error.message || 'Erreur lors de la suppression de l\'affectation');
    }
  };

  return (
    <PageWrapper>
      <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-4 rounded-tl-3xl ml-0 sm:ml-20 pr-4 sm:pr-20 md:pr-48">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Mes Chantiers
            </h1>
            <p className="text-xs sm:text-sm text-white/70">Gérez tous vos projets en cours et terminés</p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/clients">
              <Button variant="outline" className="text-white border-white/20 hover:bg-white/10">
                <User className="h-4 w-4 mr-2" />
                Clients
              </Button>
            </Link>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                // Réinitialiser le formulaire quand le dialog se ferme
                setNewChantier({ nom: '', clientId: '', dateDebut: '', duree: '', images: [] });
                setUploadedImages([]);
              }
            }}>
              <DialogTrigger asChild>
                <Button className="bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un Chantier
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-black/20 backdrop-blur-xl border border-white/10 text-white max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-white">Nouveau Chantier</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label className="text-white">Nom du chantier {!newChantier.nom?.trim() && <span className="text-red-400">*</span>}</Label>
                    <Input
                      value={newChantier.nom}
                      onChange={(e) => setNewChantier({ ...newChantier, nom: e.target.value })}
                      placeholder="Ex: Rénovation salle de bain"
                      className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                      required
                    />
                  </div>

                  <div>
                    <Label className="text-white">Client {!newChantier.clientId && <span className="text-red-400">*</span>}</Label>
                    <div className="flex gap-2">
                      <Select
                        value={newChantier.clientId}
                        onValueChange={(value) => setNewChantier({ ...newChantier, clientId: value })}
                      >
                        <SelectTrigger className="bg-black/20 backdrop-blur-md border-white/10 text-white">
                          <SelectValue placeholder="Sélectionner un client" />
                        </SelectTrigger>
                        <SelectContent className="bg-black/20 backdrop-blur-xl border-white/10">
                          {clients.length === 0 ? (
                            <SelectItem value="no-clients" disabled className="text-white/50">
                              Aucun client disponible
                            </SelectItem>
                          ) : (
                            clients.map((client) => (
                              <SelectItem key={client.id} value={client.id} className="text-white">
                                {client.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddClient}
                        className="text-white border-white/20 hover:bg-white/10"
                        title="Ajouter un nouveau client"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    {clients.length === 0 && (
                      <p className="text-sm text-yellow-400 mt-1">
                        Aucun client disponible. Créez d'abord un client.
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-white">Date de début {!newChantier.dateDebut?.trim() && <span className="text-red-400">*</span>}</Label>
                      <Input
                        type="date"
                        value={newChantier.dateDebut}
                        onChange={(e) => setNewChantier({ ...newChantier, dateDebut: e.target.value })}
                        className="bg-black/20 backdrop-blur-md border-white/10 text-white"
                        required
                      />
                    </div>
                    <div>
                      <Label className="text-white">Durée {!newChantier.duree?.trim() && <span className="text-red-400">*</span>}</Label>
                      <Input
                        value={newChantier.duree}
                        onChange={(e) => setNewChantier({ ...newChantier, duree: e.target.value })}
                        placeholder="Ex: 2 semaines"
                        className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-white">Images</Label>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="chantier-images"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('chantier-images')?.click()}
                      className="w-full text-white border-white/20 hover:bg-white/10"
                    >
                      <ImageIcon className="h-4 w-4 mr-2" />
                      Ajouter des images
                    </Button>
                    {newChantier.images.length > 0 && (
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {newChantier.images.map((img, index) => (
                          <div key={index} className="relative group">
                            <img
                              src={img}
                              alt={`Preview ${index + 1}`}
                              className="w-full h-20 object-cover rounded-lg border border-white/20"
                            />
                            <button
                              onClick={() => removeImage(index)}
                              className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      className="text-white border-white/20 hover:bg-white/10"
                    >
                      Annuler
                    </Button>
                    <Button
                      type="button"
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!newChantier.nom?.trim() || !newChantier.clientId?.trim() || !newChantier.dateDebut?.trim() || !newChantier.duree?.trim()) {
                          alert('Veuillez remplir tous les champs obligatoires');
                          return;
                        }
                        await handleAddChantier(e);
                      }}
                      disabled={!newChantier.nom?.trim() || !newChantier.clientId?.trim() || !newChantier.dateDebut?.trim() || !newChantier.duree?.trim()}
                      className="bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Ajouter
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 ml-0 sm:ml-20">
        {chantiers.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <Card className="w-full max-w-md text-center bg-black/20 backdrop-blur-xl border border-white/10 text-white">
              <CardHeader className="pb-4">
                <div className="w-16 h-16 mx-auto rounded-xl bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center mb-4">
                  <Building className="h-8 w-8 text-white/70" />
                </div>
                <CardTitle className="text-xl text-white">Aucun chantier</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-white/70 mb-4">
                  Commencez par ajouter votre premier chantier
                </p>
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  className="bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un chantier
                </Button>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {chantiers.map((chantier) => (
              <Card
                key={chantier.id}
                className="bg-black/20 backdrop-blur-xl border border-white/10 text-white hover:shadow-lg transition-shadow cursor-pointer"
              >
                {chantier.images.length > 0 && (
                  <div className="relative h-48 overflow-hidden rounded-t-lg">
                    <img
                      src={chantier.images[0]}
                      alt={chantier.nom}
                      className="w-full h-full object-cover"
                    />
                    {chantier.images.length > 1 && (
                      <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                        <ImageIcon className="h-3 w-3" />
                        {chantier.images.length}
                      </div>
                    )}
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="text-lg">{chantier.nom}</CardTitle>
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <User className="h-4 w-4" />
                    {chantier.clientName}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <Calendar className="h-4 w-4" />
                    {new Date(chantier.dateDebut).toLocaleDateString('fr-FR')}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <Clock className="h-4 w-4" />
                    {chantier.duree}
                  </div>
                  <div className="mt-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      chantier.statut === 'planifié' ? 'bg-blue-500/20 text-blue-300' :
                      chantier.statut === 'en cours' ? 'bg-green-500/20 text-green-300' :
                      'bg-gray-500/20 text-gray-300'
                    }`}>
                      {chantier.statut}
                    </span>
                  </div>
                  
                  {/* Membres affectés */}
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        <UsersIcon className="h-4 w-4" />
                        <span>Membres ({assignments[chantier.id]?.length || 0})</span>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedChantierForAssignment(chantier.id);
                          setIsAssignmentDialogOpen(true);
                        }}
                        className="h-6 px-2 text-xs text-white/70 hover:bg-white/10 hover:text-white"
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Ajouter
                      </Button>
                    </div>
                    {assignments[chantier.id] && assignments[chantier.id].length > 0 && (
                      <div className="space-y-1">
                        {assignments[chantier.id].map((assignment) => (
                          <div
                            key={assignment.id}
                            className="flex items-center justify-between text-xs bg-black/20 rounded px-2 py-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-white/70">{assignment.teamMember.name} ({assignment.teamMember.role})</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Retirer ${assignment.teamMember.name} de ce chantier ?`)) {
                                  handleRemoveAssignment(chantier.id, assignment.id);
                                }
                              }}
                              className="h-5 w-5 p-0 text-red-400 hover:bg-red-500/20"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Dialog pour affecter un membre à un chantier */}
      <Dialog open={isAssignmentDialogOpen} onOpenChange={setIsAssignmentDialogOpen}>
        <DialogContent className="bg-black/20 backdrop-blur-xl border border-white/10 text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Affecter un membre d'équipe</DialogTitle>
          </DialogHeader>
          {selectedChantierForAssignment && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-white">Sélectionner un membre</Label>
                <Select
                  onValueChange={(teamMemberId) => {
                    handleAssignMember(selectedChantierForAssignment, teamMemberId);
                  }}
                >
                  <SelectTrigger className="w-full bg-black/20 border-white/10 text-white">
                    <SelectValue placeholder="Choisir un membre" />
                  </SelectTrigger>
                  <SelectContent className="bg-black/30 backdrop-blur-lg border-white/10 text-white">
                    {teamMembers
                      .filter(member => {
                        // Exclure les membres déjà affectés
                        const existing = assignments[selectedChantierForAssignment] || [];
                        return !existing.some(a => a.teamMemberId === member.id);
                      })
                      .map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name} - {member.role}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              {teamMembers.filter(m => {
                const existing = assignments[selectedChantierForAssignment] || [];
                return !existing.some(a => a.teamMemberId === m.id);
              }).length === 0 && (
                <p className="text-sm text-white/50">Tous les membres sont déjà affectés à ce chantier</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAssignmentDialogOpen(false);
                setSelectedChantierForAssignment(null);
              }}
              className="text-white border-white/20 hover:bg-white/10"
            >
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
