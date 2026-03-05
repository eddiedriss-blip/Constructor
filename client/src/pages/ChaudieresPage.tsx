import { PageWrapper } from "@/components/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useChantiers } from "@/context/ChantiersContext";
import {
  Plus,
  Phone,
  Mail,
  Calendar,
  Edit2,
  Trash2,
  CheckCircle2,
  User,
  LayoutGrid,
  List,
  Download,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import {
  format,
  addYears,
  differenceInDays,
  parseISO,
  isBefore,
  startOfDay,
} from "date-fns";
import { fr } from "date-fns/locale";

const FILTER_ALL = "__all__";
const TYPE_CHAUDIERE_OPTIONS = [
  "Gaz",
  "Fioul",
  "Électrique",
  "Pompe à chaleur",
  "Chaudière bois/granulés",
  "Autre",
] as const;
const MARQUES_SUGGESTIONS = [
  "Saunier Duval",
  "Vaillant",
  "De Dietrich",
  "Frisquet",
  "Chaffoteaux",
  "Viessmann",
  "Atlantic",
  "Elm Leblanc",
  "Autre",
];
const TYPE_CONTRAT_OPTIONS = [
  "Entretien seul",
  "Entretien + Dépannage",
  "Entretien + Dépannage + Pièces",
  "Pas de contrat",
] as const;
const STATUT_FILTER_OPTIONS = [
  { value: FILTER_ALL, label: "Toutes" },
  { value: "echu", label: "Échues (dépassées)" },
  { value: "urgent", label: "Urgent (< 3 mois)" },
  { value: "a_planifier", label: "À planifier (3-6 mois)" },
  { value: "ok", label: "OK (6-12 mois)" },
  { value: "futur", label: "Futur (> 12 mois)" },
  { value: "sans_contrat", label: "Sans contrat" },
];

type StatutUrgence = "echu" | "urgent" | "a_planifier" | "ok" | "futur" | "sans_contrat";

function computeStatut(
  dateProchain: string,
  typeContrat: string
): { statut: StatutUrgence; joursRestants: number } {
  if (typeContrat === "Pas de contrat") {
    return { statut: "sans_contrat", joursRestants: 0 };
  }
  const today = startOfDay(new Date());
  const prochain = startOfDay(parseISO(dateProchain.split("T")[0]));
  const joursRestants = differenceInDays(prochain, today);
  if (joursRestants < 0) return { statut: "echu", joursRestants };
  if (joursRestants < 90) return { statut: "urgent", joursRestants };
  if (joursRestants < 180) return { statut: "a_planifier", joursRestants };
  if (joursRestants < 365) return { statut: "ok", joursRestants };
  return { statut: "futur", joursRestants };
}

const BANDEAU_COLORS: Record<StatutUrgence, string> = {
  echu: "#EF4444",
  urgent: "#EF4444",
  a_planifier: "#F59E0B",
  ok: "#10B981",
  futur: "#6B7280",
  sans_contrat: "#6B7280",
};

interface ChaudiereRow {
  id: string;
  clientId: string;
  typeChaudiere: string;
  marque: string;
  modele: string | null;
  puissanceKw: string | null;
  anneeInstallation: number | null;
  numeroSerie: string | null;
  localisation: string | null;
  dateDernierEntretien: string;
  dateProchainEntretien: string;
  typeContrat: string;
  montantAnnuelContrat: string | null;
  remarques: string | null;
  dateDerniereRelance: string | null;
  createdAt: string;
}

export default function ChaudieresPage() {
  const { user } = useAuth();
  const { clients } = useChantiers();
  const { toast } = useToast();
  const userId = user?.id ?? "default-user";
  const headers = () => ({ "Content-Type": "application/json", "X-User-Id": userId });

  const [chaudieres, setChaudieres] = useState<ChaudiereRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");
  const [search, setSearch] = useState("");
  const [filterStatut, setFilterStatut] = useState<string>(FILTER_ALL);
  const [filterType, setFilterType] = useState<string>(FILTER_ALL);
  const [tri, setTri] = useState<string>("urgent");
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [effectueChaudiere, setEffectueChaudiere] = useState<ChaudiereRow | null>(null);
  const [effectueDate, setEffectueDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [effectueRemarques, setEffectueRemarques] = useState("");
  const [effectueSubmitting, setEffectueSubmitting] = useState(false);

  const [form, setForm] = useState({
    clientId: "",
    typeChaudiere: "",
    marque: "",
    modele: "",
    puissanceKw: "",
    anneeInstallation: "",
    numeroSerie: "",
    localisation: "",
    dateDernierEntretien: format(new Date(), "yyyy-MM-dd"),
    dateProchainEntretien: format(addYears(new Date(), 1), "yyyy-MM-dd"),
    typeContrat: "Entretien seul",
    montantAnnuelContrat: "",
    remarques: "",
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [formSubmitting, setFormSubmitting] = useState(false);

  const clientById = useMemo(() => {
    const m: Record<string, { name: string; address?: string; phone?: string; email?: string }> = {};
    clients.forEach((c) => {
      m[c.id] = { name: c.name, address: c.address, phone: c.phone, email: c.email };
    });
    return m;
  }, [clients]);

  const chaudieresWithStatut = useMemo(() => {
    return chaudieres.map((ch) => {
      const { statut, joursRestants } = computeStatut(ch.dateProchainEntretien, ch.typeContrat);
      return { ...ch, statut, joursRestants };
    });
  }, [chaudieres]);

  const filteredAndSorted = useMemo(() => {
    let list = chaudieresWithStatut;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((ch) => {
        const client = clientById[ch.clientId];
        const name = client?.name?.toLowerCase() || "";
        const addr = (client?.address || "").toLowerCase();
        const marque = (ch.marque || "").toLowerCase();
        return name.includes(q) || addr.includes(q) || marque.includes(q);
      });
    }
    if (filterStatut !== FILTER_ALL) {
      list = list.filter((ch) => ch.statut === filterStatut);
    }
    if (filterType !== FILTER_ALL) {
      list = list.filter((ch) => ch.typeChaudiere === filterType);
    }
    if (tri === "urgent") {
      list = [...list].sort((a, b) => a.joursRestants - b.joursRestants);
    } else if (tri === "date") {
      list = [...list].sort(
        (a, b) =>
          new Date(a.dateProchainEntretien).getTime() - new Date(b.dateProchainEntretien).getTime()
      );
    } else if (tri === "client") {
      list = [...list].sort((a, b) => {
        const na = clientById[a.clientId]?.name || "";
        const nb = clientById[b.clientId]?.name || "";
        return na.localeCompare(nb);
      });
    } else if (tri === "recent") {
      list = [...list].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    return list;
  }, [chaudieresWithStatut, search, filterStatut, filterType, tri, clientById]);

  const kpis = useMemo(() => {
    const list = chaudieresWithStatut;
    const urgent = list.filter((ch) => ch.statut === "urgent").length;
    const aPlanifier = list.filter((ch) => ch.statut === "a_planifier").length;
    const echues = list.filter((ch) => ch.statut === "echu").length;
    const caAnnuel = list.reduce(
      (s, ch) => s + (ch.montantAnnuelContrat ? parseFloat(String(ch.montantAnnuelContrat)) : 0),
      0
    );
    return { total: list.length, urgent, aPlanifier, echues, caAnnuel };
  }, [chaudieresWithStatut]);

  const marquesOptions = useMemo(() => {
    const fromData = Array.from(new Set(chaudieres.map((ch) => ch.marque).filter(Boolean)));
    return Array.from(new Set([...MARQUES_SUGGESTIONS, ...fromData]));
  }, [chaudieres]);

  const fetchChaudieres = async () => {
    try {
      const res = await fetch("/api/chaudieres", { headers: headers() });
      if (res.ok) setChaudieres(await res.json());
    } catch {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de charger les chaudières." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChaudieres();
  }, []);

  const validateForm = () => {
    const err: Record<string, string> = {};
    if (!form.clientId) err.clientId = "Le client est requis.";
    if (!form.typeChaudiere) err.typeChaudiere = "Le type de chaudière est requis.";
    if (!form.marque.trim()) err.marque = "La marque est requise.";
    if (!form.dateDernierEntretien) err.dateDernierEntretien = "La date du dernier entretien est requise.";
    if (!form.dateProchainEntretien) err.dateProchainEntretien = "La date de fin de contrat est requise.";
    setFormErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmitForm = async () => {
    if (!validateForm()) return;
    setFormSubmitting(true);
    try {
      const payload = {
        clientId: form.clientId,
        typeChaudiere: form.typeChaudiere,
        marque: form.marque.trim(),
        modele: form.modele.trim() || null,
        puissanceKw: form.puissanceKw ? parseFloat(form.puissanceKw) : null,
        anneeInstallation: form.anneeInstallation ? parseInt(form.anneeInstallation, 10) : null,
        numeroSerie: form.numeroSerie.trim() || null,
        localisation: form.localisation.trim() || null,
        dateDernierEntretien: form.dateDernierEntretien,
        dateProchainEntretien: form.dateProchainEntretien,
        typeContrat: form.typeContrat,
        montantAnnuelContrat: form.montantAnnuelContrat ? parseFloat(form.montantAnnuelContrat) : null,
        remarques: form.remarques.trim() || null,
      };
      if (editingId) {
        const res = await fetch(`/api/chaudieres/${editingId}`, {
          method: "PUT",
          headers: headers(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Erreur");
        const updated = await res.json();
        setChaudieres((prev) => prev.map((ch) => (ch.id === editingId ? { ...ch, ...updated } : ch)));
        toast({ title: "Chaudière mise à jour ✓" });
      } else {
        const res = await fetch("/api/chaudieres", {
          method: "POST",
          headers: headers(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Erreur");
        const created = await res.json();
        setChaudieres((prev) => [created, ...prev]);
        toast({ title: "Chaudière ajoutée ✓" });
      }
      setFormOpen(false);
      setEditingId(null);
      setForm({
        clientId: "",
        typeChaudiere: "",
        marque: "",
        modele: "",
        puissanceKw: "",
        anneeInstallation: "",
        numeroSerie: "",
        localisation: "",
        dateDernierEntretien: format(new Date(), "yyyy-MM-dd"),
        dateProchainEntretien: format(addYears(new Date(), 1), "yyyy-MM-dd"),
        typeContrat: "Entretien seul",
        montantAnnuelContrat: "",
        remarques: "",
      });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e?.message });
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/chaudieres/${id}`, { method: "DELETE", headers: headers() });
      if (!res.ok) throw new Error("Suppression impossible.");
      setChaudieres((prev) => prev.filter((ch) => ch.id !== id));
      toast({ title: "Chaudière supprimée." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e?.message });
    }
    setDeleteId(null);
  };

  const handleEffectue = async () => {
    if (!effectueChaudiere) return;
    setEffectueSubmitting(true);
    try {
      const nextDate = format(addYears(parseISO(effectueDate), 1), "yyyy-MM-dd");
      await fetch(`/api/chaudieres/${effectueChaudiere.id}/interventions`, {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({
          dateIntervention: effectueDate,
          typeIntervention: "Entretien annuel",
          description: effectueRemarques || undefined,
        }),
      });
      await fetch(`/api/chaudieres/${effectueChaudiere.id}`, {
        method: "PUT",
        headers: headers(),
        body: JSON.stringify({
          dateDernierEntretien: effectueDate,
          dateProchainEntretien: nextDate,
        }),
      });
      const updated = await fetch(`/api/chaudieres/${effectueChaudiere.id}`, { headers: headers() }).then((r) => r.json());
      setChaudieres((prev) => prev.map((ch) => (ch.id === effectueChaudiere.id ? updated : ch)));
      toast({ title: `Entretien enregistré, prochaine fin de contrat le ${format(parseISO(nextDate), "d MMMM yyyy", { locale: fr })} ✓` });
      setEffectueChaudiere(null);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e?.message });
    } finally {
      setEffectueSubmitting(false);
    }
  };

  const openEdit = (ch: ChaudiereRow) => {
    setForm({
      clientId: ch.clientId,
      typeChaudiere: ch.typeChaudiere,
      marque: ch.marque,
      modele: ch.modele || "",
      puissanceKw: ch.puissanceKw ?? "",
      anneeInstallation: ch.anneeInstallation != null ? String(ch.anneeInstallation) : "",
      numeroSerie: ch.numeroSerie ?? "",
      localisation: ch.localisation ?? "",
      dateDernierEntretien: ch.dateDernierEntretien.split("T")[0],
      dateProchainEntretien: ch.dateProchainEntretien.split("T")[0],
      typeContrat: ch.typeContrat,
      montantAnnuelContrat: ch.montantAnnuelContrat ?? "",
      remarques: ch.remarques ?? "",
    });
    setEditingId(ch.id);
    setFormErrors({});
    setFormOpen(true);
  };

  const openNew = () => {
    setForm({
      clientId: "",
      typeChaudiere: "",
      marque: "",
      modele: "",
      puissanceKw: "",
      anneeInstallation: "",
      numeroSerie: "",
      localisation: "",
      dateDernierEntretien: format(new Date(), "yyyy-MM-dd"),
      dateProchainEntretien: format(addYears(new Date(), 1), "yyyy-MM-dd"),
      typeContrat: "Entretien seul",
      montantAnnuelContrat: "",
      remarques: "",
    });
    setEditingId(null);
    setFormErrors({});
    setFormOpen(true);
  };

  const selectedClient = clients.find((c) => c.id === form.clientId);
  const formatNextDate = (dateStr: string, joursRestants: number, statut: StatutUrgence) => {
    const d = parseISO(dateStr.split("T")[0]);
    const formatted = format(d, "d MMMM yyyy", { locale: fr });
    if (statut === "echu") return `${formatted} — Échu depuis ${Math.abs(joursRestants)} jours`;
    if (joursRestants === 0) return `${formatted} — Aujourd'hui`;
    if (joursRestants === 1) return `${formatted} — Demain`;
    if (joursRestants < 60) return `${formatted} — Dans ${joursRestants} jours`;
    if (joursRestants < 365) {
      const months = Math.round(joursRestants / 30);
      return `${formatted} — Dans ${months} mois`;
    }
    return formatted;
  };

  return (
    <PageWrapper>
      <div className="max-w-7xl mx-auto space-y-6 ml-0 sm:ml-20">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Mes chaudières</h1>
          <div className="flex flex-wrap gap-2">
            <Dialog open={formOpen} onOpenChange={(o) => { setFormOpen(o); if (!o) setEditingId(null); }}>
              <DialogTrigger asChild>
                <Button onClick={openNew} className="bg-violet-600 hover:bg-violet-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle chaudière
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-white/10 text-white max-h-[90vh] overflow-y-auto max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingId ? "Modifier la chaudière" : "Ajouter une chaudière"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Client *</Label>
                    <Select value={form.clientId || "__none__"} onValueChange={(v) => setForm((f) => ({ ...f, clientId: v === "__none__" ? "" : v }))}>
                      <SelectTrigger className="bg-black/20 border-white/20">
                        <SelectValue placeholder="Choisir un client" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Choisir un client</SelectItem>
                        {clients.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedClient && (
                      <p className="text-xs text-white/60">
                        {selectedClient.address && `${selectedClient.address} · `}
                        {selectedClient.phone}
                        {selectedClient.email && ` · ${selectedClient.email}`}
                      </p>
                    )}
                    {formErrors.clientId && <p className="text-sm text-red-400">{formErrors.clientId}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Type de chaudière *</Label>
                      <Select value={form.typeChaudiere || "__none__"} onValueChange={(v) => v !== "__none__" && setForm((f) => ({ ...f, typeChaudiere: v }))}>
                        <SelectTrigger className="bg-black/20 border-white/20">
                          <SelectValue placeholder="Type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Type</SelectItem>
                          {TYPE_CHAUDIERE_OPTIONS.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {formErrors.typeChaudiere && <p className="text-sm text-red-400">{formErrors.typeChaudiere}</p>}
                    </div>
                    <div className="grid gap-2">
                      <Label>Marque *</Label>
                      <Input
                        list="marques-list"
                        value={form.marque}
                        onChange={(e) => setForm((f) => ({ ...f, marque: e.target.value }))}
                        placeholder="Ex: Vaillant"
                        className="bg-black/20 border-white/20"
                      />
                      <datalist id="marques-list">
                        {marquesOptions.map((m) => <option key={m} value={m} />)}
                      </datalist>
                      {formErrors.marque && <p className="text-sm text-red-400">{formErrors.marque}</p>}
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Modèle</Label>
                    <Input
                      value={form.modele}
                      onChange={(e) => setForm((f) => ({ ...f, modele: e.target.value }))}
                      className="bg-black/20 border-white/20"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Puissance (kW)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={form.puissanceKw}
                        onChange={(e) => setForm((f) => ({ ...f, puissanceKw: e.target.value }))}
                        className="bg-black/20 border-white/20"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Année d'installation</Label>
                      <Input
                        type="number"
                        min="1980"
                        max={new Date().getFullYear()}
                        value={form.anneeInstallation}
                        onChange={(e) => setForm((f) => ({ ...f, anneeInstallation: e.target.value }))}
                        placeholder="AAAA"
                        className="bg-black/20 border-white/20"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Localisation dans le logement</Label>
                    <Input
                      value={form.localisation}
                      onChange={(e) => setForm((f) => ({ ...f, localisation: e.target.value }))}
                      placeholder="Sous-sol, Garage, Cuisine..."
                      className="bg-black/20 border-white/20"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Date du dernier entretien *</Label>
                      <Input
                        type="date"
                        value={form.dateDernierEntretien}
                        onChange={(e) => {
                          const v = e.target.value;
                          setForm((f) => {
                            const next = { ...f, dateDernierEntretien: v };
                            if (v) {
                              try {
                                next.dateProchainEntretien = format(addYears(parseISO(v), 1), "yyyy-MM-dd");
                              } catch (_) {}
                            }
                            return next;
                          });
                        }}
                        className="bg-black/20 border-white/20"
                      />
                      {formErrors.dateDernierEntretien && <p className="text-sm text-red-400">{formErrors.dateDernierEntretien}</p>}
                    </div>
                    <div className="grid gap-2">
                      <Label>Date de fin de contrat *</Label>
                      <Input
                        type="date"
                        value={form.dateProchainEntretien}
                        onChange={(e) => setForm((f) => ({ ...f, dateProchainEntretien: e.target.value }))}
                        className="bg-black/20 border-white/20"
                      />
                      {formErrors.dateProchainEntretien && <p className="text-sm text-red-400">{formErrors.dateProchainEntretien}</p>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Type de contrat</Label>
                      <Select value={form.typeContrat} onValueChange={(v) => setForm((f) => ({ ...f, typeContrat: v }))}>
                        <SelectTrigger className="bg-black/20 border-white/20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TYPE_CONTRAT_OPTIONS.map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Montant annuel du contrat (€)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={form.montantAnnuelContrat}
                        onChange={(e) => setForm((f) => ({ ...f, montantAnnuelContrat: e.target.value }))}
                        className="bg-black/20 border-white/20"
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Remarques / Notes</Label>
                    <Textarea
                      value={form.remarques}
                      onChange={(e) => setForm((f) => ({ ...f, remarques: e.target.value }))}
                      placeholder="Accès difficile, code portail..."
                      className="bg-black/20 border-white/20 min-h-[80px]"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setFormOpen(false)} disabled={formSubmitting}>Annuler</Button>
                  <Button onClick={handleSubmitForm} disabled={formSubmitting}>
                    {formSubmitting ? "Enregistrement..." : editingId ? "Enregistrer" : "Enregistrer la chaudière"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button
              variant="outline"
              className="border-white/20 text-white"
              onClick={async () => {
                const rows = filteredAndSorted.map((ch) => {
                  const client = clientById[ch.clientId];
                  const { statut } = computeStatut(ch.dateProchainEntretien, ch.typeContrat);
                  return [
                    client?.name ?? "",
                    client?.address ?? "",
                    client?.phone ?? "",
                    client?.email ?? "",
                    ch.typeChaudiere,
                    ch.marque,
                    ch.modele ?? "",
                    ch.typeContrat,
                    ch.dateDernierEntretien?.split("T")[0] ?? "",
                    ch.dateProchainEntretien?.split("T")[0] ?? "",
                    statut,
                    ch.montantAnnuelContrat ?? "",
                  ].join(";");
                });
                const header = "Client;Adresse;Téléphone;Email;Type;Marque;Modèle;Type contrat;Dernier entretien;Date de fin de contrat;Statut;Montant annuel (€)";
                const csv = "\uFEFF" + header + "\r\n" + rows.join("\r\n");
                const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `Chaudieres_${format(new Date(), "yyyy-MM-dd")}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                toast({ title: "Export téléchargé ✓" });
              }}
            >
              <Download className="h-4 w-4 mr-2" /> Exporter
            </Button>
            <div className="flex rounded-lg border border-white/20 overflow-hidden">
              <Button
                variant={viewMode === "cards" ? "default" : "ghost"}
                size="sm"
                className={viewMode === "cards" ? "bg-white/10 text-white" : "text-white/70"}
                onClick={() => setViewMode("cards")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                className={viewMode === "table" ? "bg-white/10 text-white" : "text-white/70"}
                onClick={() => setViewMode("table")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <Card className="bg-black/20 border-white/10 text-white">
            <CardContent className="p-4">
              <p className="text-xs text-white/60">Total chaudières</p>
              <p className="text-2xl font-bold">{kpis.total}</p>
            </CardContent>
          </Card>
          <Card className="bg-black/20 border-white/10 text-white border-red-500/30">
            <CardContent className="p-4">
              <p className="text-xs text-white/60">Urgentes (&lt; 3 mois)</p>
              <p className="text-2xl font-bold text-red-400">{kpis.urgent}</p>
            </CardContent>
          </Card>
          <Card className="bg-black/20 border-white/10 text-white border-amber-500/30">
            <CardContent className="p-4">
              <p className="text-xs text-white/60">À planifier (3-6 mois)</p>
              <p className="text-2xl font-bold text-amber-400">{kpis.aPlanifier}</p>
            </CardContent>
          </Card>
          <Card className="bg-black/20 border-white/10 text-white border-red-500/50">
            <CardContent className="p-4">
              <p className="text-xs text-white/60">Échues</p>
              <p className="text-2xl font-bold text-red-500">{kpis.echues}</p>
            </CardContent>
          </Card>
          <Card className="bg-black/20 border-white/10 text-white">
            <CardContent className="p-4">
              <p className="text-xs text-white/60">CA annuel contrats</p>
              <p className="text-2xl font-bold text-green-400">{kpis.caAnnuel.toFixed(0)} €</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-2 items-center">
          <Input
            placeholder="Rechercher (client, adresse, marque)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs bg-black/20 border-white/20 text-white"
          />
          <Select value={filterStatut} onValueChange={setFilterStatut}>
            <SelectTrigger className="w-[200px] bg-black/20 border-white/20 text-white">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              {STATUT_FILTER_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px] bg-black/20 border-white/20 text-white">
              <SelectValue placeholder="Type chaudière" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={FILTER_ALL}>Tous les types</SelectItem>
              {TYPE_CHAUDIERE_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tri} onValueChange={setTri}>
            <SelectTrigger className="w-[200px] bg-black/20 border-white/20 text-white">
              <SelectValue placeholder="Tri" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="urgent">Plus urgentes d'abord</SelectItem>
              <SelectItem value="date">Par date d'entretien</SelectItem>
              <SelectItem value="client">Par client (A-Z)</SelectItem>
              <SelectItem value="recent">Récemment ajoutées</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Contenu */}
        {loading ? (
          <p className="text-white/70">Chargement...</p>
        ) : viewMode === "cards" ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredAndSorted.map((ch) => {
              const client = clientById[ch.clientId];
              const bandeau = BANDEAU_COLORS[ch.statut];
              const isEchu = ch.statut === "echu";
              return (
                <Card
                  key={ch.id}
                  className="bg-black/20 border-white/10 text-white overflow-hidden hover:shadow-xl transition-shadow"
                >
                  <div className="h-2 w-full" style={{ backgroundColor: bandeau }} />
                  <CardContent className="p-4 relative">
                    {(ch.statut === "urgent" || ch.statut === "echu") && (
                      <Badge
                        className={`absolute top-3 right-3 ${isEchu ? "bg-red-600 animate-pulse" : "bg-red-500/90"}`}
                      >
                        {isEchu ? "ÉCHU" : "URGENT"}
                      </Badge>
                    )}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="font-bold text-lg text-white flex items-center gap-1">
                          <User className="h-4 w-4 text-white/70" />
                          {client?.name ?? "—"}
                        </p>
                        {client?.address && (
                          <p className="text-sm text-white/60">{client.address}</p>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-white/80 mb-1">
                      {ch.typeChaudiere} — {ch.marque}
                      {ch.modele && ` ${ch.modele}`}
                    </p>
                    <p className="text-sm text-white/90 mb-2">
                      Fin de contrat : {formatNextDate(ch.dateProchainEntretien, ch.joursRestants, ch.statut)}
                    </p>
                    <p className="text-xs text-white/60 mb-2">
                      {ch.typeContrat}
                      {ch.montantAnnuelContrat && ` · ${parseFloat(String(ch.montantAnnuelContrat)).toFixed(0)} €/an`}
                    </p>
                    {ch.dateDerniereRelance && (
                      <p className="text-xs text-white/50 mb-2">Relancé le {format(parseISO(ch.dateDerniereRelance), "dd/MM/yyyy", { locale: fr })}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mt-3">
                      {client?.phone && (
                        <Button variant="outline" size="sm" className="border-white/20 text-white/90" asChild>
                          <a href={`tel:${client.phone}`}><Phone className="h-3 w-3 mr-1" /> Appeler</a>
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="border-white/20 text-white/90" onClick={() => openEdit(ch)}>
                        <Edit2 className="h-3 w-3 mr-1" /> Modifier
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-green-500/50 text-green-400"
                        onClick={() => { setEffectueChaudiere(ch); setEffectueDate(format(new Date(), "yyyy-MM-dd")); setEffectueRemarques(""); }}
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Effectué
                      </Button>
                      <Button variant="outline" size="sm" className="border-red-500/50 text-red-400" onClick={() => setDeleteId(ch.id)}>
                        <Trash2 className="h-3 w-3 mr-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="bg-black/20 border-white/10 text-white overflow-x-auto">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left p-3 text-white/80">Client</th>
                    <th className="text-left p-3 text-white/80">Adresse</th>
                    <th className="text-left p-3 text-white/80">Type</th>
                    <th className="text-left p-3 text-white/80">Marque/Modèle</th>
                    <th className="text-left p-3 text-white/80">Date de fin de contrat</th>
                    <th className="text-left p-3 text-white/80">Statut</th>
                    <th className="text-right p-3 text-white/80">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSorted.map((ch) => {
                    const client = clientById[ch.clientId];
                    return (
                      <tr key={ch.id} className="border-b border-white/5 hover:bg-white/5">
                        <td className="p-3 font-medium">{client?.name ?? "—"}</td>
                        <td className="p-3 text-white/70">{client?.address ?? "—"}</td>
                        <td className="p-3">{ch.typeChaudiere}</td>
                        <td className="p-3">{ch.marque}{ch.modele ? ` ${ch.modele}` : ""}</td>
                        <td className="p-3">{format(parseISO(ch.dateProchainEntretien.split("T")[0]), "dd/MM/yyyy", { locale: fr })}</td>
                        <td className="p-3">
                          <span
                            className="inline-block w-3 h-3 rounded-full"
                            style={{ backgroundColor: BANDEAU_COLORS[ch.statut] }}
                          />
                          <span className="ml-2 capitalize">{ch.statut.replace("_", " ")}</span>
                        </td>
                        <td className="p-3 text-right">
                          {client?.phone && <a href={`tel:${client.phone}`} className="text-violet-400 hover:underline mr-2">📞</a>}
                          <button type="button" onClick={() => openEdit(ch)} className="text-white/80 hover:text-white mr-2">✏️</button>
                          <button type="button" onClick={() => { setEffectueChaudiere(ch); setEffectueDate(format(new Date(), "yyyy-MM-dd")); setEffectueRemarques(""); }} className="text-green-400 mr-2">✅</button>
                          <button type="button" onClick={() => setDeleteId(ch.id)} className="text-red-400">🗑️</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredAndSorted.length === 0 && (
                <p className="text-center text-white/60 py-8">Aucune chaudière.</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Modale Marquer comme effectué */}
        <Dialog open={!!effectueChaudiere} onOpenChange={(o) => !o && setEffectueChaudiere(null)}>
          <DialogContent className="bg-gray-900 border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Entretien effectué</DialogTitle>
            </DialogHeader>
            {effectueChaudiere && (
              <div className="grid gap-4 py-4">
                <p className="text-sm text-white/80">
                  {clientById[effectueChaudiere.clientId]?.name} — {effectueChaudiere.typeChaudiere} {effectueChaudiere.marque}
                </p>
                <div className="grid gap-2">
                  <Label>Date de l'intervention</Label>
                  <Input
                    type="date"
                    value={effectueDate}
                    onChange={(e) => setEffectueDate(e.target.value)}
                    className="bg-black/20 border-white/20"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Remarques (optionnel)</Label>
                  <Input
                    value={effectueRemarques}
                    onChange={(e) => setEffectueRemarques(e.target.value)}
                    placeholder="Remarques rapides"
                    className="bg-black/20 border-white/20"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEffectueChaudiere(null)} disabled={effectueSubmitting}>Annuler</Button>
              <Button onClick={handleEffectue} disabled={effectueSubmitting}>
                {effectueSubmitting ? "Enregistrement..." : "Valider"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirmation suppression */}
        <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
          <AlertDialogContent className="bg-gray-900 border-white/10">
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer cette chaudière ?</AlertDialogTitle>
              <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="text-white/80">Annuler</AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-600 hover:bg-red-700"
                onClick={() => { if (deleteId) handleDelete(deleteId); setDeleteId(null); }}
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </PageWrapper>
  );
}
