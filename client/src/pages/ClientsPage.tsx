import { PageWrapper } from '@/components/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Plus, Building, Mail, Phone, Image as ImageIcon, MapPin, Edit, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useChantiers, Client } from '@/context/ChantiersContext';

export default function ClientsPage() {
  const { clients, chantiers, addClient, updateClient, deleteClient } = useChantiers();
  const [location, setLocation] = useLocation();
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [newClient, setNewClient] = useState({ name: '', email: '', phone: '', address: '' });
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Vérifier si le paramètre addClient est présent dans l'URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('addClient') === 'true') {
      setIsDialogOpen(true);
      // Nettoyer l'URL en retirant le paramètre
      setLocation('/dashboard/clients');
    }
  }, [setLocation]);

  // Filtrer les chantiers du client sélectionné
  const clientChantiers = selectedClient
    ? chantiers.filter(c => c.clientId === selectedClient.id)
    : [];

  const handleAddClient = async () => {
    console.log('🔵 handleAddClient appelé');
    if (isSubmitting) {
      console.log('⚠️ Déjà en cours de soumission');
      return;
    }

    const name = newClient.name?.trim();
    const phone = newClient.phone?.trim();
    
    console.log('📝 Données:', { name, phone, email: newClient.email, address: newClient.address });
    
    if (!name || !phone) {
      alert('Veuillez remplir tous les champs obligatoires (nom et téléphone)');
      return;
    }

    setIsSubmitting(true);
    console.log('⏳ Début de la soumission...');
    
    try {
      console.log('📤 Appel addClient...');
      const createdClient = await addClient({
        name,
        email: newClient.email?.trim() || undefined,
        phone,
        address: newClient.address?.trim() || undefined
      });
      
      console.log('✅ Client créé:', createdClient);
      setNewClient({ name: '', email: '', phone: '', address: '' });
      setIsDialogOpen(false);
      console.log('🎉 Succès complet');
    } catch (error: any) {
      console.error('❌ Erreur création client:', error);
      alert(error?.message || 'Erreur lors de la création du client');
    } finally {
      setIsSubmitting(false);
      console.log('🏁 Fin handleAddClient');
    }
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setIsEditDialogOpen(true);
  };

  const handleUpdateClient = async () => {
    if (!editingClient || !editingClient.name || !editingClient.phone) return;

    try {
      await updateClient(editingClient.id, editingClient);
      setEditingClient(null);
      setIsEditDialogOpen(false);
      // Si le client modifié est celui sélectionné, mettre à jour la sélection
      if (selectedClient && selectedClient.id === editingClient.id) {
        setSelectedClient(editingClient);
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du client:', error);
      alert('Erreur lors de la mise à jour du client. Vérifiez votre connexion à Supabase.');
    }
  };

  const handleDeleteClick = (client: Client, e: React.MouseEvent) => {
    e.stopPropagation(); // Empêcher la sélection du client
    setClientToDelete(client);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (clientToDelete) {
      try {
        await deleteClient(clientToDelete.id);
        setClientToDelete(null);
        setIsDeleteDialogOpen(false);
        // Si le client supprimé est celui sélectionné, revenir à la liste
        if (selectedClient && selectedClient.id === clientToDelete.id) {
          setSelectedClient(null);
        }
      } catch (error) {
        console.error('Erreur lors de la suppression du client:', error);
        alert('Erreur lors de la suppression du client. Vérifiez votre connexion à Supabase.');
      }
    }
  };

  return (
    <PageWrapper>
      <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-4 rounded-tl-3xl ml-0 sm:ml-20 pr-4 sm:pr-20 md:pr-48">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white">
              Clients
            </h1>
            <p className="text-xs sm:text-sm text-white/70">
              {selectedClient ? `Chantiers de ${selectedClient.name}` : 'Gérez vos clients et leurs chantiers'}
            </p>
          </div>
          {!selectedClient && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              if (isSubmitting) {
                // Empêcher la fermeture si on est en train de soumettre
                return;
              }
              setIsDialogOpen(open);
              if (!open) {
                // Réinitialiser le formulaire quand le dialog se ferme
                setNewClient({ name: '', email: '', phone: '', address: '' });
                setIsSubmitting(false);
              }
            }}>
              <DialogTrigger asChild>
                <Button className="bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un Client
                </Button>
              </DialogTrigger>
              <DialogContent 
                className="bg-black/20 backdrop-blur-xl border border-white/10 text-white"
                onInteractOutside={(e) => {
                  if (isSubmitting) {
                    e.preventDefault();
                  }
                }}
                onEscapeKeyDown={(e) => {
                  if (isSubmitting) {
                    e.preventDefault();
                  }
                }}
              >
                <DialogHeader>
                  <DialogTitle className="text-white">Nouveau Client</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label className="text-white">Nom {!newClient.name?.trim() && <span className="text-red-400">*</span>}</Label>
                    <Input
                      value={newClient.name}
                      onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                      placeholder="Nom du client"
                      className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-white">Email</Label>
                    <Input
                      type="email"
                      value={newClient.email}
                      onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                      placeholder="email@example.com (optionnel)"
                      className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                    />
                  </div>
                  <div>
                    <Label className="text-white">Téléphone {!newClient.phone?.trim() && <span className="text-red-400">*</span>}</Label>
                    <Input
                      type="tel"
                      value={newClient.phone}
                      onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                      placeholder="06 12 34 56 78"
                      className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                      required
                    />
                  </div>
                  <div>
                    <Label className="text-white">Adresse</Label>
                    <Input
                      value={newClient.address}
                      onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                      placeholder="Adresse complète"
                      className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                    />
                  </div>
                  <DialogFooter>
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
                      onClick={(e) => {
                        console.log('🖱️ BOUTON CLIQUÉ');
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🖱️ Appel handleAddClient depuis le bouton');
                        handleAddClient();
                      }}
                      disabled={isSubmitting || !newClient.name?.trim() || !newClient.phone?.trim()}
                      className="bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Ajout en cours...' : 'Ajouter'}
                    </Button>
                  </DialogFooter>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {selectedClient && (
            <Button
              variant="outline"
              onClick={() => setSelectedClient(null)}
              className="text-white border-white/20 hover:bg-white/10"
            >
              Retour à la liste
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 ml-0 sm:ml-20">
        {!selectedClient ? (
          clients.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <Card className="w-full max-w-md text-center bg-black/20 backdrop-blur-xl border border-white/10 text-white">
                <CardHeader className="pb-4">
                  <div className="w-16 h-16 mx-auto rounded-xl bg-black/20 backdrop-blur-md border border-white/10 flex items-center justify-center mb-4">
                    <User className="h-8 w-8 text-white/70" />
                  </div>
                  <CardTitle className="text-xl text-white">Aucun client</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-white/70 mb-4">
                    Commencez par ajouter votre premier client
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {clients.map((client) => (
              <Card
                key={client.id}
                className="bg-black/20 backdrop-blur-xl border border-white/10 text-white hover:shadow-lg transition-shadow cursor-pointer relative group"
                onClick={() => setSelectedClient(client)}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
                        <User className="h-6 w-6 text-white/70" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{client.name}</CardTitle>
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleEditClient(client)}
                        className="h-8 w-8 p-0 text-white hover:bg-white/20"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDeleteClick(client, e)}
                        className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {client.email && (
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <Mail className="h-4 w-4" />
                      {client.email}
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-white/70">
                    <Phone className="h-4 w-4" />
                    {client.phone}
                  </div>
                  {client.address && (
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <MapPin className="h-4 w-4" />
                      {client.address}
                    </div>
                  )}
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center gap-2 text-sm text-white/70">
                      <Building className="h-4 w-4" />
                      {chantiers.filter(c => c.clientId === client.id).length} chantier(s)
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          )
        ) : (
          <div>
            <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
                      <User className="h-6 w-6 text-white/70" />
                    </div>
                    <div>
                      <div className="text-xl">{selectedClient.name}</div>
                      {selectedClient.email && (
                        <div className="text-sm font-normal text-white/70">{selectedClient.email}</div>
                      )}
                      <div className="text-sm font-normal text-white/70">{selectedClient.phone}</div>
                      {selectedClient.address && (
                        <div className="text-sm font-normal text-white/70 flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3" />
                          {selectedClient.address}
                        </div>
                      )}
                    </div>
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditClient(selectedClient)}
                      className="text-white border-white/20 hover:bg-white/10"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Modifier
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setClientToDelete(selectedClient);
                        setIsDeleteDialogOpen(true);
                      }}
                      className="text-red-400 border-red-500/20 hover:bg-red-500/20"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Supprimer
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <h2 className="text-xl font-semibold text-white mb-4">Chantiers de {selectedClient.name}</h2>

            {clientChantiers.length === 0 ? (
              <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
                <CardContent className="py-12 text-center">
                  <Building className="h-12 w-12 mx-auto mb-4 text-white/50" />
                  <p className="text-white/70">Aucun chantier pour ce client</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {clientChantiers.map((chantier) => (
                  <Card
                    key={chantier.id}
                    className="bg-black/20 backdrop-blur-xl border border-white/10 text-white hover:shadow-lg transition-shadow"
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
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="text-sm text-white/70">
                        Date: {new Date(chantier.dateDebut).toLocaleDateString('fr-FR')}
                      </div>
                      <div className="text-sm text-white/70">
                        Durée: {chantier.duree}
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
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Dialog de modification */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Modifier le Client</DialogTitle>
          </DialogHeader>
          {editingClient && (
            <div className="space-y-4">
              <div>
                <Label className="text-white">Nom</Label>
                <Input
                  value={editingClient.name}
                  onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                  placeholder="Nom du client"
                  className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                />
              </div>
              <div>
                <Label className="text-white">Email</Label>
                <Input
                  type="email"
                  value={editingClient.email}
                  onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                  placeholder="email@example.com"
                  className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                />
              </div>
              <div>
                <Label className="text-white">Téléphone</Label>
                <Input
                  type="tel"
                  value={editingClient.phone}
                  onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })}
                  placeholder="06 12 34 56 78"
                  className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                />
              </div>
              <div>
                <Label className="text-white">Adresse</Label>
                <Input
                  value={editingClient.address || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, address: e.target.value })}
                  placeholder="Adresse complète"
                  className="bg-black/20 backdrop-blur-md border-white/10 text-white placeholder:text-white/50"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setEditingClient(null);
                  }}
                  className="text-white border-white/20 hover:bg-white/10"
                >
                  Annuler
                </Button>
                <Button
                  onClick={handleUpdateClient}
                  className="bg-white/20 backdrop-blur-md text-white border border-white/10 hover:bg-white/30"
                >
                  Enregistrer
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Supprimer le client</AlertDialogTitle>
            <AlertDialogDescription className="text-white/70">
              Êtes-vous sûr de vouloir supprimer le client "{clientToDelete?.name}" ? 
              Cette action supprimera également tous les chantiers associés à ce client. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-white border-white/20 hover:bg-white/10">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-500/20 text-red-400 border border-red-500/20 hover:bg-red-500/30"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}

