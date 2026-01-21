import { createContext, useContext, useState, ReactNode, useEffect } from 'react';

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
}

export interface Chantier {
  id: string;
  nom: string;
  clientId: string;
  clientName?: string;
  dateDebut: string;
  duree: string;
  images: string[];
  statut: 'planifié' | 'en cours' | 'terminé';
}

interface ChantiersContextType {
  clients: Client[];
  chantiers: Chantier[];
  loading: boolean;
  addClient: (client: Omit<Client, 'id'>) => Promise<Client>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  addChantier: (chantier: Omit<Chantier, 'id' | 'clientName'>) => Promise<void>;
  updateChantier: (id: string, updates: Partial<Chantier>) => Promise<void>;
  deleteChantier: (id: string) => Promise<void>;
  refreshData: () => Promise<void>;
}

const ChantiersContext = createContext<ChantiersContextType | undefined>(undefined);

export function ChantiersProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>([]);
  const [chantiers, setChantiers] = useState<Chantier[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger les données depuis l'API
  const loadData = async () => {
    try {
      console.log('loadData appelé');
      setLoading(true);
      
      const clientsPromise = fetch('/api/clients').catch(err => {
        console.error('Erreur fetch clients:', err);
        return { ok: false, status: 500, statusText: 'Erreur réseau' } as Response;
      });
      
      const chantiersPromise = fetch('/api/chantiers').catch(err => {
        console.error('Erreur fetch chantiers:', err);
        return { ok: false, status: 500, statusText: 'Erreur réseau' } as Response;
      });
      
      const [clientsRes, chantiersRes] = await Promise.all([
        clientsPromise,
        chantiersPromise
      ]);

      let clientsData: Client[] = [];
      if (clientsRes.ok) {
        try {
          clientsData = await clientsRes.json();
          setClients(clientsData);
          console.log('Clients chargés:', clientsData.length);
        } catch (err) {
          console.error('Erreur parsing clients:', err);
        }
      } else {
        console.error('Erreur chargement clients:', clientsRes.status, clientsRes.statusText);
      }

      if (chantiersRes.ok) {
        try {
          const chantiersData = await chantiersRes.json();
          // Enrichir les chantiers avec le nom du client
          const enrichedChantiers = chantiersData.map((c: Chantier) => {
            const client = clientsData.find(cl => cl.id === c.clientId);
            return { ...c, clientName: client?.name || 'Client inconnu' };
          });
          setChantiers(enrichedChantiers);
          console.log('Chantiers chargés:', enrichedChantiers.length);
        } catch (err) {
          console.error('Erreur parsing chantiers:', err);
        }
      } else {
        console.error('Erreur chargement chantiers:', chantiersRes.status, chantiersRes.statusText);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
      console.log('loadData terminé');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Recharger les données après modification
  const refreshData = async () => {
    await loadData();
  };

  const addClient = async (client: Omit<Client, 'id'>): Promise<Client> => {
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(client),
      });
      
      if (response.ok) {
        const createdClient = await response.json();
        
        // Mettre à jour directement l'état
        setClients(prev => [...prev, createdClient]);
        
        // Recharger les données en arrière-plan (sans bloquer)
        refreshData().catch(err => {
          console.error('Erreur lors du rechargement en arrière-plan:', err);
        });
        
        return createdClient;
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        throw new Error(errorData.error || `Erreur ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      console.error('Erreur création client:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error.message || 'Erreur lors de la création du client');
    }
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    try {
      const response = await fetch(`/api/clients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (response.ok) {
        await refreshData();
      } else {
        throw new Error('Erreur lors de la mise à jour du client');
      }
    } catch (error) {
      console.error('Erreur mise à jour client:', error);
      throw error;
    }
  };

  const deleteClient = async (id: string) => {
    try {
      const response = await fetch(`/api/clients/${id}`, {
        method: 'DELETE',
      });
      
      // 204 No Content est une réponse valide pour DELETE
      if (response.ok || response.status === 204) {
        await refreshData();
      } else {
        // Récupérer le message d'erreur depuis l'API
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        throw new Error(errorData.error || `Erreur ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      console.error('Erreur suppression client:', error);
      // Si c'est déjà une Error avec un message, la relancer
      if (error instanceof Error) {
        throw error;
      }
      // Sinon, créer une nouvelle Error
      throw new Error(error.message || 'Erreur lors de la suppression du client');
    }
  };

  const addChantier = async (chantier: Omit<Chantier, 'id' | 'clientName'>) => {
    try {
      const response = await fetch('/api/chantiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chantier),
      });
      
      if (response.ok) {
        await refreshData();
      } else {
        // Récupérer le message d'erreur depuis l'API
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        throw new Error(errorData.error || `Erreur ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      console.error('Erreur création chantier:', error);
      // Si c'est déjà une Error avec un message, la relancer
      if (error instanceof Error) {
        throw error;
      }
      // Sinon, créer une nouvelle Error
      throw new Error(error.message || 'Erreur lors de la création du chantier');
    }
  };

  const updateChantier = async (id: string, updates: Partial<Chantier>) => {
    try {
      const response = await fetch(`/api/chantiers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (response.ok) {
        await refreshData();
      } else {
        throw new Error('Erreur lors de la mise à jour du chantier');
      }
    } catch (error) {
      console.error('Erreur mise à jour chantier:', error);
      throw error;
    }
  };

  const deleteChantier = async (id: string) => {
    try {
      const response = await fetch(`/api/chantiers/${id}`, {
        method: 'DELETE',
      });
      
      if (response.ok || response.status === 204) {
        await refreshData();
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        throw new Error(errorData.error || `Erreur ${response.status}: ${response.statusText}`);
      }
    } catch (error: any) {
      console.error('Erreur suppression chantier:', error);
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(error.message || 'Erreur lors de la suppression du chantier');
    }
  };

  return (
    <ChantiersContext.Provider value={{ 
      clients, 
      chantiers, 
      loading,
      addClient, 
      updateClient, 
      deleteClient, 
      addChantier, 
      updateChantier,
      deleteChantier,
      refreshData
    }}>
      {children}
    </ChantiersContext.Provider>
  );
}

export function useChantiers() {
  const context = useContext(ChantiersContext);
  if (context === undefined) {
    throw new Error('useChantiers must be used within a ChantiersProvider');
  }
  return context;
}

