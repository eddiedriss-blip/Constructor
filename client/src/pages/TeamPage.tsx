import { PageWrapper } from '@/components/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, User, Mail, Phone, Trash2, Building, Key, Edit2, Copy, Check } from 'lucide-react';
import { useState, useEffect } from 'react';

// Interface TeamMember
interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string | null;
  status: 'actif' | 'inactif';
  login_code?: string;
  loginCode?: string;
  user_id?: string | null;
  userId?: string | null;
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [newMember, setNewMember] = useState({
    name: '',
    role: '',
    email: '',
    phone: '',
    login_code: ''
  });

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/team-members');
      if (response.ok) {
        const data = await response.json();
        // Normaliser les données (loginCode vs login_code)
        const normalizedData = data.map((m: any) => ({
          ...m,
          login_code: m.loginCode || m.login_code,
          user_id: m.userId || m.user_id,
          created_at: m.createdAt || m.created_at,
          updated_at: m.updatedAt || m.updated_at,
        }));
        setMembers(normalizedData);
      } else {
        throw new Error('Erreur lors du chargement des membres');
      }
    } catch (error) {
      console.error('Error loading members:', error);
    } finally {
      setLoading(false);
    }
  };

  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const handleAddMember = async (e?: React.FormEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    // Validation avec trim pour ignorer les espaces
    const name = newMember.name?.trim();
    const role = newMember.role?.trim();
    const email = newMember.email?.trim();
    const login_code = newMember.login_code?.trim();
    
    if (!name || !role || !email || !login_code) {
      const missing = [];
      if (!name) missing.push('nom');
      if (!role) missing.push('rôle');
      if (!email) missing.push('email');
      if (!login_code) missing.push('code de connexion');
      alert(`Veuillez remplir tous les champs obligatoires : ${missing.join(', ')}`);
      return;
    }

    try {
      const payload = {
        name,
        role,
        email,
        phone: newMember.phone?.trim() || null,
        status: 'actif',
        loginCode: login_code,
      };
      
      const response = await fetch('/api/team-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Créer un lien d'invitation
        const inviteLink = `${window.location.origin}/invite/${result.id}`;
        setInviteLink(inviteLink);
        setShowInviteModal(true);

        await loadMembers();
        setNewMember({ name: '', role: '', email: '', phone: '', login_code: '' });
        setIsDialogOpen(false);
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        console.error('Erreur API:', errorData);
        throw new Error(errorData.error || `Erreur ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      console.error('Erreur création membre:', error);
      const errorMessage = error?.message || error?.error || 'Erreur lors de la création du membre. Vérifiez votre connexion à Supabase.';
      alert(errorMessage);
    }
  };

  const handleEditMember = (member: TeamMember) => {
    setEditingMember(member);
    setIsEditDialogOpen(true);
  };

  const handleUpdateMember = async () => {
    if (!editingMember) return;

    try {
      const response = await fetch(`/api/team-members/${editingMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editingMember.name,
          role: editingMember.role,
          email: editingMember.email,
          phone: editingMember.phone || null,
          status: editingMember.status,
          loginCode: editingMember.login_code || editingMember.loginCode,
        }),
      });

      if (response.ok) {
        await loadMembers();
        setEditingMember(null);
        setIsEditDialogOpen(false);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la mise à jour');
      }
    } catch (error: any) {
      console.error('Erreur mise à jour membre:', error);
      alert(error.message || 'Erreur lors de la mise à jour du membre. Vérifiez votre connexion à Supabase.');
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce membre ?')) {
      return;
    }

    try {
      const response = await fetch(`/api/team-members/${id}`, {
        method: 'DELETE',
      });

      if (response.ok || response.status === 204) {
        await loadMembers();
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la suppression');
      }
    } catch (error: any) {
      console.error('Erreur suppression membre:', error);
      alert(error.message || 'Erreur lors de la suppression du membre. Vérifiez votre connexion à Supabase.');
    }
  };

  return (
    <PageWrapper>
      <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-4 rounded-tl-3xl ml-0 sm:ml-20 pr-4 sm:pr-20 md:pr-48">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Gestion de l'Équipe
            </h1>
            <p className="text-sm text-white/70">Gérez les membres de votre équipe et leurs codes de connexion</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              // Réinitialiser le formulaire quand le dialog se ferme
              setNewMember({ name: '', role: '', email: '', phone: '', login_code: '' });
            }
          }}>
            <DialogTrigger asChild>
              <Button className="bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un Membre
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-black/20 backdrop-blur-xl border border-white/10 text-white rounded-2xl">
              <DialogHeader>
                <DialogTitle className="text-white">Ajouter un Nouveau Membre</DialogTitle>
              </DialogHeader>
              <div>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-white">Nom complet {!newMember.name?.trim() && <span className="text-red-400">*</span>}</Label>
                    <Input
                      id="name"
                      value={newMember.name}
                      onChange={(e) => setNewMember(prev => ({ ...prev, name: e.target.value }))}
                      className="bg-black/20 border-white/10 text-white"
                      placeholder="Jean Dupont"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role" className="text-white">Rôle {!newMember.role?.trim() && <span className="text-red-400">*</span>}</Label>
                    <Select 
                      value={newMember.role || ''} 
                      onValueChange={(value) => {
                        setNewMember(prev => ({ ...prev, role: value }));
                      }}
                      required
                    >
                      <SelectTrigger id="role" className="w-full bg-black/20 border-white/10 text-white">
                        <SelectValue placeholder="Sélectionner un rôle" />
                      </SelectTrigger>
                      <SelectContent className="bg-black/30 backdrop-blur-lg border-white/10 text-white">
                        <SelectItem value="Chef de chantier">Chef de chantier</SelectItem>
                        <SelectItem value="Ouvrier">Ouvrier</SelectItem>
                        <SelectItem value="Commercial">Commercial</SelectItem>
                        <SelectItem value="Assistant">Assistant</SelectItem>
                        <SelectItem value="Autre">Autre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-white">Email {!newMember.email?.trim() && <span className="text-red-400">*</span>}</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newMember.email}
                      onChange={(e) => setNewMember(prev => ({ ...prev, email: e.target.value }))}
                      className="bg-black/20 border-white/10 text-white"
                      placeholder="jean.dupont@planchais.fr"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-white">Téléphone</Label>
                    <Input
                      id="phone"
                      value={newMember.phone}
                      onChange={(e) => setNewMember(prev => ({ ...prev, phone: e.target.value }))}
                      className="bg-black/20 border-white/10 text-white"
                      placeholder="06 12 34 56 78"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login_code" className="text-white">Code de connexion {!newMember.login_code?.trim() && <span className="text-red-400">*</span>}</Label>
                    <Input
                      id="login_code"
                      value={newMember.login_code}
                      onChange={(e) => setNewMember(prev => ({ ...prev, login_code: e.target.value }))}
                      className="bg-black/20 border-white/10 text-white font-mono"
                      placeholder="Entrez le code de connexion"
                      maxLength={10}
                      required
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="text-white border-white/20 hover:bg-white/10">
                    Annuler
                  </Button>
                  <Button 
                    type="button"
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!newMember.name?.trim() || !newMember.role?.trim() || !newMember.email?.trim() || !newMember.login_code?.trim()) {
                        alert('Veuillez remplir tous les champs obligatoires');
                        return;
                      }
                      await handleAddMember(e);
                    }}
                    className="bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Ajouter le Membre
                  </Button>
                </DialogFooter>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 space-y-6 ml-0 sm:ml-20">
        {/* Membres de l'Équipe */}
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-white/70" />
              Membres de l'Équipe
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="text-center py-8">
                <p className="text-white/70">Chargement...</p>
              </div>
            ) : members.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-4 text-white/50" />
                <p className="text-white/70">Aucun membre dans l'équipe</p>
                <p className="text-sm text-white/50 mt-2">Ajoutez votre premier membre pour commencer</p>
              </div>
            ) : (
              <div className="space-y-2">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-black/20 backdrop-blur-md border border-white/10 rounded-lg hover:bg-black/30 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
                        <User className="h-6 w-6 text-white/70" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-white">{member.name}</p>
                        <p className="text-sm text-white/70">{member.role}</p>
                        <div className="flex items-center gap-4 mt-1">
                          <div className="flex items-center gap-1 text-xs text-white/60">
                            <Mail className="h-3 w-3" />
                            {member.email}
                          </div>
                          {member.phone && (
                            <div className="flex items-center gap-1 text-xs text-white/60">
                              <Phone className="h-3 w-3" />
                              {member.phone}
                            </div>
                          )}
                          <div className="flex items-center gap-1 text-xs text-white/60">
                            <Key className="h-3 w-3" />
                            <span className="font-mono">{member.login_code || member.loginCode}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={member.status === 'actif' ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'}>
                        {member.status === 'actif' ? 'Actif' : 'Inactif'}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditMember(member)}
                        className="text-white/70 hover:bg-white/10 hover:text-white"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteMember(member.id)}
                        className="text-white/70 hover:bg-white/10 hover:text-white"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog d'édition */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-black/20 backdrop-blur-xl border border-white/10 text-white rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-white">Modifier le Membre</DialogTitle>
            </DialogHeader>
            {editingMember && (
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name" className="text-white">Nom complet</Label>
                  <Input
                    id="edit-name"
                    value={editingMember.name}
                    onChange={(e) => setEditingMember(prev => prev ? { ...prev, name: e.target.value } : null)}
                    className="bg-black/20 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-role" className="text-white">Rôle</Label>
                  <Select 
                    value={editingMember.role} 
                    onValueChange={(value) => setEditingMember(prev => prev ? { ...prev, role: value } : null)}
                  >
                    <SelectTrigger className="w-full bg-black/20 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black/30 backdrop-blur-lg border-white/10 text-white">
                      <SelectItem value="Chef de chantier">Chef de chantier</SelectItem>
                      <SelectItem value="Ouvrier">Ouvrier</SelectItem>
                      <SelectItem value="Commercial">Commercial</SelectItem>
                      <SelectItem value="Assistant">Assistant</SelectItem>
                      <SelectItem value="Autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email" className="text-white">Email</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editingMember.email}
                    onChange={(e) => setEditingMember(prev => prev ? { ...prev, email: e.target.value } : null)}
                    className="bg-black/20 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone" className="text-white">Téléphone</Label>
                  <Input
                    id="edit-phone"
                    value={editingMember.phone || ''}
                    onChange={(e) => setEditingMember(prev => prev ? { ...prev, phone: e.target.value } : null)}
                    className="bg-black/20 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-login_code" className="text-white">Code de connexion</Label>
                  <Input
                    id="edit-login_code"
                    value={editingMember.login_code || editingMember.loginCode || ''}
                    onChange={(e) => setEditingMember(prev => prev ? { ...prev, login_code: e.target.value, loginCode: e.target.value } : null)}
                    className="bg-black/20 border-white/10 text-white font-mono"
                    maxLength={10}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-status" className="text-white">Statut</Label>
                  <Select 
                    value={editingMember.status} 
                    onValueChange={(value) => setEditingMember(prev => prev ? { ...prev, status: value as 'actif' | 'inactif' } : null)}
                  >
                    <SelectTrigger className="w-full bg-black/20 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-black/30 backdrop-blur-lg border-white/10 text-white">
                      <SelectItem value="actif">Actif</SelectItem>
                      <SelectItem value="inactif">Inactif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="text-white border-white/20 hover:bg-white/10">
                Annuler
              </Button>
              <Button onClick={handleUpdateMember}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Affectation aux Chantiers */}
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5 text-white/70" />
              Affectation aux Chantiers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-white/70">
              Affectez les membres de l'équipe aux chantiers depuis la fiche chantier ou depuis le planning.
              Cette fonctionnalité vous permet de suivre qui travaille sur quel projet.
            </p>
          </CardContent>
        </Card>
      </main>

      {/* Modal pour afficher le lien d'invitation */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="bg-black/20 backdrop-blur-xl border border-white/10 text-white rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Lien d'invitation créé</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-white/70 text-sm">
              Partagez ce lien avec le membre d'équipe pour qu'il puisse se connecter :
            </p>
            <div className="flex gap-2">
              <Input
                value={inviteLink || ''}
                readOnly
                className="bg-black/20 border-white/10 text-white font-mono text-sm"
              />
              <Button
                onClick={() => {
                  if (inviteLink) {
                    navigator.clipboard.writeText(inviteLink);
                    alert('Lien copié dans le presse-papier !');
                  }
                }}
                className="bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-white/50">
              Le membre devra entrer son code de connexion sur la page d'invitation.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowInviteModal(false)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
