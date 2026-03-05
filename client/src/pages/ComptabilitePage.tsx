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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { useChantiers } from "@/context/ChantiersContext";
import { Plus, Paperclip, Edit2, Trash2, Download } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, startOfQuarter, endOfQuarter } from "date-fns";
import { fr } from "date-fns/locale";

const CATEGORIES = [
  "Matériaux",
  "Carburant",
  "Sous-traitance",
  "Outillage",
  "Fournitures",
  "Administratif",
  "Déplacement",
  "Autre",
] as const;

const FOURNISSEURS_SUGGESTIONS = [
  "Point P",
  "Leroy Merlin",
  "Brico Dépôt",
  "Castorama",
  "Station essence",
  "Péage autoroute",
  "Sous-traitant",
  "Autre",
];

// Valeurs sentinelles pour Select (Radix n'accepte pas value="")
const CHANTIER_NONE = "__none__";
const FILTER_ALL = "__all__";

const CATEGORY_BADGE_VARIANTS: Record<string, string> = {
  Matériaux: "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30",
  Carburant: "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30",
  "Sous-traitance": "bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30",
  Outillage: "bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30",
  Fournitures: "bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border-cyan-500/30",
  Administratif: "bg-slate-500/20 text-slate-700 dark:text-slate-400 border-slate-500/30",
  Déplacement: "bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30",
  Autre: "bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-500/30",
};

interface Depense {
  id: string;
  date: string;
  fournisseur: string;
  montantTtc: string;
  categorie: string;
  chantierId: string | null;
  description: string | null;
  justificatifUrl: string;
  justificatifNom: string;
  createdAt: string;
}

const defaultForm = () => ({
  date: format(new Date(), "yyyy-MM-dd"),
  fournisseur: "",
  montantTtc: "",
  categorie: "",
  chantierId: "",
  description: "",
  justificatifFile: null as File | null,
});

export default function ComptabilitePage() {
  const { user } = useAuth();
  const { chantiers } = useChantiers();
  const { toast } = useToast();
  const userId = user?.id ?? "default-user";
  const headers = () => ({ "Content-Type": "application/json", "X-User-Id": userId });

  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(defaultForm());
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filterMonth, setFilterMonth] = useState<string>(FILTER_ALL);
  const [filterCategorie, setFilterCategorie] = useState<string>(FILTER_ALL);
  const [filterChantier, setFilterChantier] = useState<string>(FILTER_ALL);
  const [searchFournisseur, setSearchFournisseur] = useState("");
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportPreset, setExportPreset] = useState<string>("ce-mois");
  const [exportDateDebut, setExportDateDebut] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [exportDateFin, setExportDateFin] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [exportLoading, setExportLoading] = useState(false);

  const chantiersActifs = useMemo(
    () => chantiers.filter((c) => c.statut !== "terminé"),
    [chantiers]
  );

  const fournisseursOptions = useMemo(() => {
    const fromDepenses = Array.from(new Set(depenses.map((d) => d.fournisseur).filter(Boolean)));
    return Array.from(new Set([...FOURNISSEURS_SUGGESTIONS, ...fromDepenses]));
  }, [depenses]);

  const fetchDepenses = async () => {
    try {
      const res = await fetch("/api/depenses", { headers: headers() });
      if (res.ok) {
        const data = await res.json();
        setDepenses(data);
      }
    } catch (e) {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de charger les dépenses." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepenses();
  }, []);

  const filteredDepenses = useMemo(() => {
    let list = [...depenses];
    if (filterMonth && filterMonth !== FILTER_ALL) {
      list = list.filter((d) => d.date.slice(0, 7) === filterMonth);
    }
    if (filterCategorie && filterCategorie !== FILTER_ALL) list = list.filter((d) => d.categorie === filterCategorie);
    if (filterChantier && filterChantier !== FILTER_ALL) list = list.filter((d) => (d.chantierId || "") === filterChantier);
    if (searchFournisseur.trim())
      list = list.filter((d) =>
        d.fournisseur.toLowerCase().includes(searchFournisseur.trim().toLowerCase())
      );
    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [depenses, filterMonth, filterCategorie, filterChantier, searchFournisseur]);

  const totalPeriod = useMemo(
    () => filteredDepenses.reduce((s, d) => s + parseFloat(String(d.montantTtc || 0)), 0),
    [filteredDepenses]
  );

  const validateForm = () => {
    const err: Record<string, string> = {};
    if (!form.date) err.date = "La date est requise.";
    if (!form.fournisseur.trim()) err.fournisseur = "Le fournisseur est requis.";
    if (form.montantTtc === "" || isNaN(parseFloat(form.montantTtc)) || parseFloat(form.montantTtc) <= 0)
      err.montantTtc = "Montant TTC invalide.";
    if (!form.categorie) err.categorie = "La catégorie est requise.";
    if (!editingId && !form.justificatifFile) err.justificatif = "Le justificatif est obligatoire.";
    setFormErrors(err);
    return Object.keys(err).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      let justificatifUrl = "";
      let justificatifNom = "";
      if (editingId) {
        const existing = depenses.find((d) => d.id === editingId);
        if (existing) {
          justificatifUrl = existing.justificatifUrl;
          justificatifNom = existing.justificatifNom;
        }
      }
      if (form.justificatifFile) {
        const fd = new FormData();
        fd.append("file", form.justificatifFile);
        const upRes = await fetch("/api/depenses/upload-justificatif", {
          method: "POST",
          headers: { "X-User-Id": userId },
          body: fd,
        });
        if (!upRes.ok) {
          const data = await upRes.json().catch(() => ({}));
          throw new Error(data.error || "Échec de l'upload du justificatif.");
        }
        const { url, nom } = await upRes.json();
        justificatifUrl = url;
        justificatifNom = nom;
      }
      const payload = {
        date: form.date,
        fournisseur: form.fournisseur.trim(),
        montantTtc: parseFloat(form.montantTtc),
        categorie: form.categorie,
        chantierId: form.chantierId && form.chantierId !== CHANTIER_NONE ? form.chantierId : null,
        description: form.description.trim() || null,
        justificatifUrl,
        justificatifNom,
      };
      if (editingId) {
        const res = await fetch(`/api/depenses/${editingId}`, {
          method: "PUT",
          headers: headers(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Erreur");
        const updated = await res.json();
        setDepenses((prev) => prev.map((d) => (d.id === editingId ? { ...d, ...updated } : d)));
        toast({ title: "Dépense mise à jour ✓" });
      } else {
        const res = await fetch("/api/depenses", {
          method: "POST",
          headers: headers(),
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Erreur");
        const created = await res.json();
        setDepenses((prev) => [created, ...prev]);
        toast({ title: "Dépense enregistrée ✓" });
      }
      setForm(defaultForm());
      setFormErrors({});
      setIsFormOpen(false);
      setEditingId(null);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: e?.message || "Enregistrement impossible.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/depenses/${id}`, {
        method: "DELETE",
        headers: headers(),
      });
      if (!res.ok) throw new Error("Suppression impossible.");
      setDepenses((prev) => prev.filter((d) => d.id !== id));
      toast({ title: "Dépense supprimée." });
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e?.message });
    }
    setDeleteId(null);
  };

  const openEdit = (d: Depense) => {
    setForm({
      date: d.date.split("T")[0],
      fournisseur: d.fournisseur,
      montantTtc: String(d.montantTtc),
      categorie: d.categorie,
      chantierId: d.chantierId || CHANTIER_NONE,
      description: d.description || "",
      justificatifFile: null,
    });
    setEditingId(d.id);
    setFormErrors({});
    setIsFormOpen(true);
  };

  const openNew = () => {
    setForm(defaultForm());
    setEditingId(null);
    setFormErrors({});
    setIsFormOpen(true);
  };

  const getExportDates = () => {
    const now = new Date();
    switch (exportPreset) {
      case "ce-mois":
        return { debut: format(startOfMonth(now), "yyyy-MM-dd"), fin: format(endOfMonth(now), "yyyy-MM-dd") };
      case "mois-dernier":
        const last = subMonths(now, 1);
        return { debut: format(startOfMonth(last), "yyyy-MM-dd"), fin: format(endOfMonth(last), "yyyy-MM-dd") };
      case "ce-trimestre":
        return { debut: format(startOfQuarter(now), "yyyy-MM-dd"), fin: format(endOfQuarter(now), "yyyy-MM-dd") };
      case "cette-annee":
        return { debut: format(startOfYear(now), "yyyy-MM-dd"), fin: format(endOfYear(now), "yyyy-MM-dd") };
      default:
        return { debut: exportDateDebut, fin: exportDateFin };
    }
  };

  const handleExport = async () => {
    const { debut, fin } = getExportDates();
    setExportLoading(true);
    try {
      const res = await fetch(
        `/api/comptabilite/export-csv?dateDebut=${encodeURIComponent(debut)}&dateFin=${encodeURIComponent(fin)}`,
        { headers: { "X-User-Id": userId } }
      );
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const data = await res.json();
        if (data.empty) {
          toast({ variant: "destructive", title: "Aucune donnée à exporter sur cette période." });
          return;
        }
      }
      if (!res.ok) throw new Error("Export impossible.");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Export_Comptable_${debut}_${fin}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export téléchargé ✓" });
      setExportDialogOpen(false);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Erreur", description: e?.message || "Échec de l'export." });
    } finally {
      setExportLoading(false);
    }
  };

  const formatDate = (d: string) => {
    try {
      const [y, m, day] = d.split("T")[0].split("-");
      return `${day}/${m}/${y}`;
    } catch {
      return d;
    }
  };

  const chantierNom = (chantierId: string | null) =>
    chantierId ? chantiers.find((c) => c.id === chantierId)?.nom ?? "—" : "—";

  return (
    <PageWrapper>
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ml-0 sm:ml-20">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Comptabilité</h1>
          <div className="flex flex-wrap gap-2">
            <Dialog open={isFormOpen} onOpenChange={(o) => { setIsFormOpen(o); if (!o) setEditingId(null); }}>
              <DialogTrigger asChild>
                <Button onClick={openNew} className="bg-violet-600 hover:bg-violet-700 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Nouvelle dépense
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-white/10 text-white max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingId ? "Modifier la dépense" : "Nouvelle dépense"}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                      className="bg-black/20 border-white/20"
                    />
                    {formErrors.date && <p className="text-sm text-red-400">{formErrors.date}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label>Fournisseur *</Label>
                    <Input
                      list="fournisseurs-list"
                      value={form.fournisseur}
                      onChange={(e) => setForm((f) => ({ ...f, fournisseur: e.target.value }))}
                      placeholder="Ex: Point P, Leroy Merlin..."
                      className="bg-black/20 border-white/20"
                    />
                    <datalist id="fournisseurs-list">
                      {fournisseursOptions.map((f) => (
                        <option key={f} value={f} />
                      ))}
                    </datalist>
                    {formErrors.fournisseur && <p className="text-sm text-red-400">{formErrors.fournisseur}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label>Montant TTC (€) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.montantTtc}
                      onChange={(e) => setForm((f) => ({ ...f, montantTtc: e.target.value }))}
                      placeholder="0.00"
                      className="bg-black/20 border-white/20"
                    />
                    {formErrors.montantTtc && <p className="text-sm text-red-400">{formErrors.montantTtc}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label>Catégorie *</Label>
                    <Select value={form.categorie} onValueChange={(v) => setForm((f) => ({ ...f, categorie: v }))}>
                      <SelectTrigger className="bg-black/20 border-white/20">
                        <SelectValue placeholder="Choisir..." />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formErrors.categorie && <p className="text-sm text-red-400">{formErrors.categorie}</p>}
                  </div>
                  <div className="grid gap-2">
                    <Label>Chantier associé</Label>
                    <Select value={form.chantierId || CHANTIER_NONE} onValueChange={(v) => setForm((f) => ({ ...f, chantierId: v }))}>
                      <SelectTrigger className="bg-black/20 border-white/20">
                        <SelectValue placeholder="Aucun / Frais généraux" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={CHANTIER_NONE}>Aucun / Frais généraux</SelectItem>
                        {chantiersActifs.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label>Description</Label>
                    <Textarea
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Ex: Sacs de ciment, vis, planches..."
                      className="bg-black/20 border-white/20 min-h-[80px]"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Justificatif (JPG, PNG ou PDF, max 5 Mo) {editingId ? "" : "*"}</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                        onChange={(e) => setForm((f) => ({ ...f, justificatifFile: e.target.files?.[0] ?? null }))}
                        className="bg-black/20 border-white/20"
                      />
                      {form.justificatifFile && (
                        <span className="text-sm text-white/70 truncate max-w-[120px]">{form.justificatifFile.name}</span>
                      )}
                    </div>
                    {formErrors.justificatif && <p className="text-sm text-red-400">{formErrors.justificatif}</p>}
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsFormOpen(false)} disabled={isSubmitting}>
                    Annuler
                  </Button>
                  <Button onClick={handleSubmit} disabled={isSubmitting}>
                    {isSubmitting ? "Enregistrement..." : editingId ? "Enregistrer" : "Enregistrer la dépense"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10">
                  <Download className="h-4 w-4 mr-2" />
                  Générer export comptable
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gray-900 border-white/10 text-white">
                <DialogHeader>
                  <DialogTitle>Export comptable</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid gap-2">
                    <Label>Période</Label>
                    <Select value={exportPreset} onValueChange={setExportPreset}>
                      <SelectTrigger className="bg-black/20 border-white/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ce-mois">Ce mois</SelectItem>
                        <SelectItem value="mois-dernier">Mois dernier</SelectItem>
                        <SelectItem value="ce-trimestre">Ce trimestre</SelectItem>
                        <SelectItem value="cette-annee">Cette année</SelectItem>
                        <SelectItem value="personnalise">Période personnalisée</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {exportPreset === "personnalise" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Date début</Label>
                        <Input
                          type="date"
                          value={exportDateDebut}
                          onChange={(e) => setExportDateDebut(e.target.value)}
                          className="bg-black/20 border-white/20"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Date fin</Label>
                        <Input
                          type="date"
                          value={exportDateFin}
                          onChange={(e) => setExportDateFin(e.target.value)}
                          className="bg-black/20 border-white/20"
                        />
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setExportDialogOpen(false)} disabled={exportLoading}>
                    Annuler
                  </Button>
                  <Button onClick={handleExport} disabled={exportLoading}>
                    {exportLoading ? "Génération..." : "Générer et télécharger"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <section className="ml-0 sm:ml-20">
          <Card className="bg-black/20 backdrop-blur-xl border-white/10 shadow-xl rounded-2xl text-white">
            <CardHeader>
              <CardTitle>Mes dépenses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 items-center">
                <Input
                  placeholder="Rechercher par fournisseur..."
                  value={searchFournisseur}
                  onChange={(e) => setSearchFournisseur(e.target.value)}
                  className="max-w-xs bg-black/20 border-white/20"
                />
                <Select value={filterMonth} onValueChange={setFilterMonth}>
                  <SelectTrigger className="w-[180px] bg-black/20 border-white/20">
                    <SelectValue placeholder="Tous les mois" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FILTER_ALL}>Tous les mois</SelectItem>
                    {Array.from({ length: 24 }, (_, i) => {
                      const d = subMonths(new Date(), i);
                      const v = format(d, "yyyy-MM");
                      const label = format(d, "MMMM yyyy", { locale: fr });
                      return <SelectItem key={v} value={v}>{label}</SelectItem>;
                    })}
                  </SelectContent>
                </Select>
                <Select value={filterCategorie} onValueChange={setFilterCategorie}>
                  <SelectTrigger className="w-[160px] bg-black/20 border-white/20">
                    <SelectValue placeholder="Catégorie" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FILTER_ALL}>Toutes</SelectItem>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterChantier} onValueChange={setFilterChantier}>
                  <SelectTrigger className="w-[180px] bg-black/20 border-white/20">
                    <SelectValue placeholder="Chantier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FILTER_ALL}>Tous</SelectItem>
                    {chantiersActifs.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-sm text-white/70">
                Total période affichée : <strong>{totalPeriod.toFixed(2)} €</strong>
              </p>
              {loading ? (
                <p className="text-white/70">Chargement...</p>
              ) : (
                <div className="overflow-x-auto -mx-2 sm:mx-0 rounded-lg border border-white/10">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/10 hover:bg-white/5">
                        <TableHead className="text-white/80">Date</TableHead>
                        <TableHead className="text-white/80">Fournisseur</TableHead>
                        <TableHead className="text-white/80">Montant TTC</TableHead>
                        <TableHead className="text-white/80">Catégorie</TableHead>
                        <TableHead className="text-white/80">Chantier</TableHead>
                        <TableHead className="text-white/80">Justificatif</TableHead>
                        <TableHead className="text-white/80 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDepenses.length === 0 ? (
                        <TableRow className="border-white/10">
                          <TableCell colSpan={7} className="text-center text-white/60 py-8">
                            Aucune dépense.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredDepenses.map((d) => (
                          <TableRow key={d.id} className="border-white/10 hover:bg-white/5">
                            <TableCell className="text-white/90">{formatDate(d.date)}</TableCell>
                            <TableCell className="text-white/90">{d.fournisseur}</TableCell>
                            <TableCell className="text-white/90">{parseFloat(String(d.montantTtc)).toFixed(2)} €</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={CATEGORY_BADGE_VARIANTS[d.categorie] || ""}>
                                {d.categorie}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-white/90">{chantierNom(d.chantierId)}</TableCell>
                            <TableCell>
                              <a
                                href={d.justificatifUrl.startsWith("http") ? d.justificatifUrl : `${window.location.origin}${d.justificatifUrl}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-violet-400 hover:underline"
                              >
                                <Paperclip className="h-4 w-4" />
                                <span className="sr-only">Ouvrir justificatif</span>
                              </a>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-white/80 hover:text-white"
                                onClick={() => openEdit(d)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <AlertDialog open={deleteId === d.id} onOpenChange={(o) => !o && setDeleteId(null)}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-red-400 hover:text-red-300"
                                  onClick={() => setDeleteId(d.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                <AlertDialogContent className="bg-gray-900 border-white/10">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Supprimer cette dépense ?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Cette action est irréversible.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="text-white/80">Annuler</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-red-600 hover:bg-red-700"
                                      onClick={() => handleDelete(d.id)}
                                    >
                                      Supprimer
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </PageWrapper>
  );
}
