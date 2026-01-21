import { PageWrapper } from '@/components/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Calendar, Building, Clock, User, Users, X } from 'lucide-react';
import { useChantiers } from '@/context/ChantiersContext';
import { useState, useMemo, useEffect } from 'react';

// Fonction pour parser la durée et calculer la date de fin
function calculateEndDate(dateDebut: string, duree: string): Date {
  const startDate = new Date(dateDebut);
  const dureeLower = duree.toLowerCase().trim();
  
  // Parser différentes formats de durée
  let daysToAdd = 0;
  
  if (dureeLower.includes('semaine') || dureeLower.includes('sem')) {
    const weeks = parseInt(dureeLower.match(/\d+/)?.[0] || '1');
    daysToAdd = weeks * 7;
  } else if (dureeLower.includes('mois')) {
    const months = parseInt(dureeLower.match(/\d+/)?.[0] || '1');
    daysToAdd = months * 30; // Approximation
  } else if (dureeLower.includes('jour') || dureeLower.includes('j')) {
    const days = parseInt(dureeLower.match(/\d+/)?.[0] || '1');
    daysToAdd = days;
  } else {
    // Si c'est juste un nombre, on assume des jours
    const days = parseInt(dureeLower.match(/\d+/)?.[0] || '1');
    daysToAdd = days;
  }
  
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + daysToAdd);
  return endDate;
}

// Fonction pour obtenir les jours du mois
function getDaysInMonth(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();
  
  const days = [];
  
  // Ajouter les jours du mois précédent pour compléter la première semaine
  const prevMonth = new Date(year, month, 0);
  const prevMonthDays = prevMonth.getDate();
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    days.push({
      date: new Date(year, month - 1, prevMonthDays - i),
      isCurrentMonth: false,
      isToday: false
    });
  }
  
  // Ajouter les jours du mois actuel
  const today = new Date();
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    days.push({
      date,
      isCurrentMonth: true,
      isToday: date.toDateString() === today.toDateString()
    });
  }
  
  // Ajouter les jours du mois suivant pour compléter la dernière semaine
  const remainingDays = 42 - days.length; // 6 semaines * 7 jours
  for (let day = 1; day <= remainingDays; day++) {
    days.push({
      date: new Date(year, month + 1, day),
      isCurrentMonth: false,
      isToday: false
    });
  }
  
  return days;
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string | null;
  status: string;
}

interface ChantierAssignment {
  id: string;
  chantierId: string;
  teamMemberId: string;
  teamMember: TeamMember;
}

export default function PlanningPage() {
  const { chantiers } = useChantiers();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTeamMemberId, setSelectedTeamMemberId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [assignments, setAssignments] = useState<Record<string, ChantierAssignment[]>>({});
  
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
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const days = useMemo(() => getDaysInMonth(year, month), [year, month]);
  
  // Fonction pour obtenir les chantiers d'un jour donné, filtrés par membre si sélectionné
  const getChantiersForDay = (date: Date) => {
    let filteredChantiers = chantiers;
    
    // Filtrer par membre d'équipe si un membre est sélectionné
    if (selectedTeamMemberId) {
      filteredChantiers = chantiers.filter(chantier => {
        const chantierAssignments = assignments[chantier.id] || [];
        return chantierAssignments.some(a => a.teamMemberId === selectedTeamMemberId);
      });
    }
    
    return filteredChantiers.filter(chantier => {
      const startDate = new Date(chantier.dateDebut);
      const endDate = calculateEndDate(chantier.dateDebut, chantier.duree);
      
      // Normaliser les dates (ignorer l'heure)
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);
      
      const chantierStart = new Date(startDate);
      chantierStart.setHours(0, 0, 0, 0);
      const chantierEnd = new Date(endDate);
      chantierEnd.setHours(23, 59, 59, 999);
      
      return dayStart >= chantierStart && dayStart <= chantierEnd;
    });
  };
  
  // Obtenir les chantiers filtrés du mois
  const filteredChantiers = useMemo(() => {
    let filtered = chantiers;
    
    // Filtrer par membre d'équipe si un membre est sélectionné
    if (selectedTeamMemberId) {
      filtered = chantiers.filter(chantier => {
        const chantierAssignments = assignments[chantier.id] || [];
        return chantierAssignments.some(a => a.teamMemberId === selectedTeamMemberId);
      });
    }
    
    return filtered.filter(chantier => {
      const startDate = new Date(chantier.dateDebut);
      const endDate = calculateEndDate(chantier.dateDebut, chantier.duree);
      return (
        (startDate.getMonth() === month && startDate.getFullYear() === year) ||
        (endDate.getMonth() === month && endDate.getFullYear() === year) ||
        (startDate <= new Date(year, month + 1, 0) && endDate >= new Date(year, month, 1))
      );
    });
  }, [chantiers, selectedTeamMemberId, assignments, month, year]);
  
  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  
  const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };
  
  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };
  
  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleDayClick = (date: Date) => {
    const dayChantiers = getChantiersForDay(date);
    if (dayChantiers.length > 0) {
      setSelectedDate(date);
      setIsDialogOpen(true);
    }
  };
  
  return (
    <PageWrapper>
      <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-4 sm:px-6 py-4 rounded-tl-3xl ml-0 sm:ml-20 pr-4 sm:pr-20 md:pr-48">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Planning des Chantiers
            </h1>
            <p className="text-sm text-white/70">Calendrier intégré pour organiser vos interventions</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="team-member-filter" className="text-white text-sm">
                <Users className="h-4 w-4 inline mr-2" />
                Filtrer par membre :
              </Label>
              <Select
                value={selectedTeamMemberId || "all"}
                onValueChange={(value) => setSelectedTeamMemberId(value === "all" ? null : value)}
              >
                <SelectTrigger className="w-[250px] bg-black/20 border-white/10 text-white">
                  <SelectValue placeholder="Tous les membres" />
                </SelectTrigger>
                <SelectContent className="bg-black/30 backdrop-blur-lg border-white/10 text-white">
                  <SelectItem value="all">Tous les membres</SelectItem>
                  {teamMembers.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name} - {member.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedTeamMemberId && (
                <button
                  onClick={() => setSelectedTeamMemberId(null)}
                  className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                  title="Retirer le filtre"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4 sm:p-6 space-y-6 ml-0 sm:ml-20">
        {/* Contrôles du calendrier */}
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={goToPreviousMonth}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <Calendar className="h-5 w-5 rotate-180" />
                </button>
                <h2 className="text-xl font-semibold">
                  {monthNames[month]} {year}
                </h2>
                <button
                  onClick={goToNextMonth}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <Calendar className="h-5 w-5" />
                </button>
              </div>
              <button
                onClick={goToToday}
                className="px-4 py-2 rounded-lg bg-white/20 backdrop-blur-md text-white hover:bg-white/30 transition-colors text-sm"
              >
                Aujourd'hui
              </button>
            </div>
          </CardHeader>
        </Card>

        {/* Calendrier */}
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardContent className="p-2 sm:p-6">
            {/* En-têtes des jours */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 sm:mb-4">
              {dayNames.map(day => (
                <div key={day} className="text-center text-xs sm:text-sm font-semibold text-white/70 py-1 sm:py-2">
                  {day.substring(0, 3)}
                </div>
              ))}
            </div>
            
            {/* Grille du calendrier - Scrollable horizontalement sur mobile */}
            <div className="overflow-x-auto -mx-2 sm:mx-0">
              <div className="grid grid-cols-7 gap-1 sm:gap-2 min-w-[700px] sm:min-w-0">
              {days.map((day, index) => {
                const dayChantiers = getChantiersForDay(day.date);
                const isToday = day.isToday;
                
                return (
                  <div
                    key={index}
                    onClick={() => handleDayClick(day.date)}
                    className={`min-h-[80px] sm:min-h-[100px] p-1 sm:p-2 rounded-lg border cursor-pointer transition-all hover:bg-white/5 ${
                      day.isCurrentMonth
                        ? isToday
                          ? 'bg-white/10 border-white/30 border-2'
                          : 'bg-black/10 border-white/10'
                        : 'bg-black/5 border-white/5 opacity-50'
                    } ${dayChantiers.length > 0 ? 'hover:border-white/30' : ''}`}
                  >
                    <div className={`text-xs sm:text-sm font-medium mb-1 ${
                      day.isCurrentMonth ? 'text-white' : 'text-white/50'
                    } ${isToday ? 'text-white font-bold' : ''}`}>
                      {day.date.getDate()}
                    </div>
                    
                    {/* Afficher les chantiers */}
                    <div className="space-y-0.5 sm:space-y-1">
                      {dayChantiers.slice(0, 1).map(chantier => {
                        const startDate = new Date(chantier.dateDebut);
                        const isStart = day.date.toDateString() === startDate.toDateString();
                        const endDate = calculateEndDate(chantier.dateDebut, chantier.duree);
                        const isEnd = day.date.toDateString() === endDate.toDateString();
                        
                        return (
                          <div
                            key={chantier.id}
                            className={`text-[10px] sm:text-xs p-0.5 sm:p-1 rounded truncate ${
                              chantier.statut === 'planifié'
                                ? 'bg-blue-500/30 text-blue-200 border border-blue-500/50'
                                : chantier.statut === 'en cours'
                                ? 'bg-yellow-500/30 text-yellow-200 border border-yellow-500/50'
                                : 'bg-green-500/30 text-green-200 border border-green-500/50'
                            }`}
                            title={`${chantier.nom} - ${chantier.clientName}`}
                          >
                            {isStart && '▶ '}
                            {isEnd && '◀ '}
                            <span className="hidden sm:inline">{chantier.nom}</span>
                            <span className="sm:hidden">{chantier.nom.substring(0, 8)}...</span>
                          </div>
                        );
                      })}
                      {dayChantiers.length > 1 && (
                        <div className="text-[10px] sm:text-xs text-white/70 font-medium">
                          +{dayChantiers.length - 1}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Légende */}
        <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
          <CardHeader>
            <CardTitle className="text-lg">Légende</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-blue-500/30 border border-blue-500/50"></div>
                <span className="text-sm">Planifié</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-yellow-500/30 border border-yellow-500/50"></div>
                <span className="text-sm">En cours</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-500/30 border border-green-500/50"></div>
                <span className="text-sm">Terminé</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liste des chantiers du mois */}
        {filteredChantiers.length > 0 && (
          <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building className="h-5 w-5" />
                {selectedTeamMemberId 
                  ? `Chantiers du mois - ${teamMembers.find(m => m.id === selectedTeamMemberId)?.name || 'Membre sélectionné'}`
                  : 'Chantiers du mois'
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredChantiers.map(chantier => {
                  const chantierAssignments = assignments[chantier.id] || [];
                    const startDate = new Date(chantier.dateDebut);
                    const endDate = calculateEndDate(chantier.dateDebut, chantier.duree);
                    
                    return (
                      <div
                        key={chantier.id}
                        className="p-3 rounded-lg bg-black/20 border border-white/10"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Building className="h-4 w-4 text-white/70" />
                              <span className="font-semibold">{chantier.nom}</span>
                              <span className={`px-2 py-0.5 rounded text-xs ${
                                chantier.statut === 'planifié'
                                  ? 'bg-blue-500/20 text-blue-300'
                                  : chantier.statut === 'en cours'
                                  ? 'bg-yellow-500/20 text-yellow-300'
                                  : 'bg-green-500/20 text-green-300'
                              }`}>
                                {chantier.statut}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-white/70">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                {chantier.clientName}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {startDate.toLocaleDateString('fr-FR')} - {endDate.toLocaleDateString('fr-FR')}
                              </div>
                            </div>
                            {chantierAssignments.length > 0 && (
                              <div className="flex items-center gap-2 mt-2">
                                <Users className="h-3 w-3 text-white/60" />
                                <div className="flex flex-wrap gap-1">
                                  {chantierAssignments.map(assignment => (
                                    <span
                                      key={assignment.id}
                                      className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/80 border border-white/20"
                                    >
                                      {assignment.teamMember.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}
        {selectedTeamMemberId && filteredChantiers.length === 0 && (
          <Card className="bg-black/20 backdrop-blur-xl border border-white/10 text-white">
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-white/50" />
              <p className="text-white/70">
                Aucun chantier assigné à {teamMembers.find(m => m.id === selectedTeamMemberId)?.name || 'ce membre'} ce mois-ci
              </p>
            </CardContent>
          </Card>
        )}

        {/* Dialog pour afficher les détails d'une journée */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-black/20 backdrop-blur-xl border border-white/10 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-white text-xl">
                Interventions du {selectedDate && selectedDate.toLocaleDateString('fr-FR', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {selectedDate && getChantiersForDay(selectedDate).length === 0 ? (
                <p className="text-white/70 text-center py-8">
                  Aucune intervention prévue pour cette journée
                </p>
              ) : (
                selectedDate && getChantiersForDay(selectedDate).map(chantier => {
                  const startDate = new Date(chantier.dateDebut);
                  const endDate = calculateEndDate(chantier.dateDebut, chantier.duree);
                  const isStart = selectedDate.toDateString() === startDate.toDateString();
                  const isEnd = selectedDate.toDateString() === endDate.toDateString();
                  
                  return (
                    <Card 
                      key={chantier.id}
                      className="bg-black/20 backdrop-blur-md border border-white/10"
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Building className="h-5 w-5 text-white/70" />
                              <h3 className="font-semibold text-lg text-white">{chantier.nom}</h3>
                              <span className={`px-2 py-1 rounded text-xs ${
                                chantier.statut === 'planifié'
                                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/50'
                                  : chantier.statut === 'en cours'
                                  ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50'
                                  : 'bg-green-500/20 text-green-300 border border-green-500/50'
                              }`}>
                                {chantier.statut}
                              </span>
                            </div>
                            <div className="space-y-2 text-sm text-white/80">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-white/60" />
                                <span>Client : {chantier.clientName}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-white/60" />
                                <span>
                                  {isStart && 'Début : '}
                                  {isEnd && 'Fin : '}
                                  {!isStart && !isEnd && 'En cours : '}
                                  {startDate.toLocaleDateString('fr-FR')} - {endDate.toLocaleDateString('fr-FR')}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-white/60" />
                                <span>Durée : {chantier.duree}</span>
                              </div>
                              {(() => {
                                const chantierAssignments = assignments[chantier.id] || [];
                                return chantierAssignments.length > 0 && (
                                  <div className="flex items-center gap-2 mt-2">
                                    <Users className="h-4 w-4 text-white/60" />
                                    <div className="flex flex-wrap gap-2">
                                      <span className="text-sm text-white/80">Membres assignés :</span>
                                      {chantierAssignments.map(assignment => (
                                        <span
                                          key={assignment.id}
                                          className="text-xs px-2 py-1 rounded bg-white/10 text-white/90 border border-white/20"
                                        >
                                          {assignment.teamMember.name} ({assignment.teamMember.role})
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                );
                              })()}
                              {isStart && (
                                <div className="mt-2 px-2 py-1 bg-blue-500/20 border border-blue-500/50 rounded text-xs text-blue-300 inline-block">
                                  ▶ Début de l'intervention
                                </div>
                              )}
                              {isEnd && (
                                <div className="mt-2 px-2 py-1 bg-green-500/20 border border-green-500/50 rounded text-xs text-green-300 inline-block">
                                  ◀ Fin de l'intervention
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        {chantier.images && chantier.images.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <p className="text-xs text-white/60 mb-2">Images du projet :</p>
                            <div className="grid grid-cols-4 gap-2">
                              {chantier.images.slice(0, 4).map((img, idx) => (
                                <img
                                  key={idx}
                                  src={img}
                                  alt={`${chantier.nom} ${idx + 1}`}
                                  className="w-full h-16 object-cover rounded border border-white/10"
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </PageWrapper>
  );
}
