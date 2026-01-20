import { useState } from 'react';
import { PageWrapper } from '@/components/PageWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Download,
  Calculator,
  User,
  Building,
  Euro,
  Check,
  ChevronsUpDown,
  Mail,
  Save
} from 'lucide-react';
import { useChantiers } from '@/context/ChantiersContext';
import { cn } from '@/lib/utils';

interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface ClientInfo {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export default function QuotesPage() {
  const { clients } = useChantiers();
  const [clientInfo, setClientInfo] = useState<ClientInfo>({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [clientSearchOpen, setClientSearchOpen] = useState(false);
  const [clientSearchValue, setClientSearchValue] = useState('');

  const [projectType, setProjectType] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [validityDays, setValidityDays] = useState('30');
  const [items, setItems] = useState<QuoteItem[]>([
    { id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 }
  ]);
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const addItem = () => {
    const newItem: QuoteItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof QuoteItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
        }
        return updatedItem;
      }
      return item;
    }));
  };

  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const tva = subtotal * 0.2;
  const total = subtotal + tva;

  const generatePDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 20;
    const margin = 20;
    const lineHeight = 7;

    // En-tête
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('DEVIS', margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Planchais Construction', margin, yPosition);
    yPosition += 5;
    doc.text('Votre adresse professionnelle', margin, yPosition);
    yPosition += 10;

    // Date et validité
    doc.setFont('helvetica', 'normal');
    const currentDate = new Date().toLocaleDateString('fr-FR');
    const validityDate = formatDate(parseInt(validityDays) || 30);
    doc.text(`Date: ${currentDate}`, pageWidth - margin - 50, 20);
    doc.text(`Validité: ${validityDays} jours`, pageWidth - margin - 50, 25);
    doc.text(`Échéance: ${validityDate}`, pageWidth - margin - 50, 30);

    // Ligne de séparation
    yPosition += 5;
    doc.setLineWidth(0.5);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    // Informations client
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('CLIENT', margin, yPosition);
    yPosition += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    if (clientInfo.name) {
      doc.setFont('helvetica', 'bold');
      doc.text(clientInfo.name, margin, yPosition);
      yPosition += 6;
      doc.setFont('helvetica', 'normal');
    }
    if (clientInfo.email) {
      doc.text(clientInfo.email, margin, yPosition);
      yPosition += 6;
    }
    if (clientInfo.phone) {
      doc.text(clientInfo.phone, margin, yPosition);
      yPosition += 6;
    }
    if (clientInfo.address) {
      doc.text(clientInfo.address, margin, yPosition);
      yPosition += 6;
    }
    yPosition += 5;

    // Détails du projet
    if (projectType || projectDescription) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('PROJET', margin, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      if (projectType) {
        const projectTypeLabel = projectType === 'piscine' ? 'Piscine & Spa' : 
                                 projectType === 'paysage' ? 'Aménagement Paysager' :
                                 projectType === 'menuiserie' ? 'Menuiserie Sur-Mesure' :
                                 projectType === 'renovation' ? 'Rénovation' : 'Autre';
        doc.setFont('helvetica', 'bold');
        doc.text(`Type: ${projectTypeLabel}`, margin, yPosition);
        yPosition += 6;
        doc.setFont('helvetica', 'normal');
      }
      if (projectDescription) {
        const splitDescription = doc.splitTextToSize(projectDescription, pageWidth - 2 * margin);
        doc.text(splitDescription, margin, yPosition);
        yPosition += splitDescription.length * 6;
      }
      yPosition += 5;
    }

    // Tableau des prestations
    const filteredItems = items.filter(item => item.description || item.quantity > 0 || item.unitPrice > 0);
    if (filteredItems.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('DÉTAIL DES PRESTATIONS', margin, yPosition);
      yPosition += 10;

      // En-têtes du tableau
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Description', margin, yPosition);
      doc.text('Qté', margin + 100, yPosition);
      doc.text('Prix unit.', margin + 120, yPosition);
      doc.text('Total', margin + 160, yPosition);
      yPosition += 5;
      doc.setLineWidth(0.3);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 5;

      // Lignes du tableau
      doc.setFont('helvetica', 'normal');
      filteredItems.forEach((item, index) => {
        // Vérifier si on doit ajouter une nouvelle page
        if (yPosition > pageHeight - 40) {
          doc.addPage();
          yPosition = 20;
        }

        const description = item.description || `Prestation ${index + 1}`;
        const splitDesc = doc.splitTextToSize(description, 90);
        
        doc.setFontSize(9);
        doc.text(splitDesc, margin, yPosition);
        doc.text(item.quantity.toString(), margin + 100, yPosition);
        doc.text(`${item.unitPrice.toFixed(2)} €`, margin + 120, yPosition);
        doc.text(`${item.total.toFixed(2)} €`, margin + 160, yPosition);
        
        yPosition += Math.max(splitDesc.length * 5, 8);
      });

      yPosition += 10;
    }

    // Totaux
    if (yPosition > pageHeight - 50) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setLineWidth(0.3);
    doc.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 10;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Sous-total HT:', pageWidth - margin - 60, yPosition);
    doc.text(`${subtotal.toFixed(2)} €`, pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 7;

    doc.text('TVA (20%):', pageWidth - margin - 60, yPosition);
    doc.text(`${tva.toFixed(2)} €`, pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 7;

    doc.setLineWidth(0.5);
    doc.line(pageWidth - margin - 60, yPosition, pageWidth - margin, yPosition);
    yPosition += 7;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Total TTC:', pageWidth - margin - 60, yPosition);
    doc.text(`${total.toFixed(2)} €`, pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 15;

    // Pied de page
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Ce devis est valable ${validityDays} jours à compter de sa date d'émission.`, margin, pageHeight - 15, { align: 'center', maxWidth: pageWidth - 2 * margin });

    return doc;
  };

  const handleGeneratePDF = () => {
    setShowConfirmDialog(true);
  };

  const confirmGeneratePDF = () => {
    setShowConfirmDialog(false);
    setShowActionDialog(true);
  };

  const handleSavePDF = () => {
    const doc = generatePDF();
    const fileName = `Devis_${clientInfo.name || 'Client'}_${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
    setShowActionDialog(false);
  };

  const handleSendEmail = async () => {
    if (!clientInfo.email) {
      alert('Veuillez renseigner l\'adresse email du client');
      return;
    }

    setIsSendingEmail(true);
    try {
      const doc = generatePDF();
      const pdfBlob = doc.output('blob');
      const formData = new FormData();
      formData.append('pdf', pdfBlob, `Devis_${clientInfo.name || 'Client'}_${new Date().toISOString().split('T')[0]}.pdf`);
      formData.append('email', clientInfo.email);
      formData.append('clientName', clientInfo.name);
      formData.append('subject', `Devis - ${projectType || 'Projet'}`);

      const response = await fetch('/api/quotes/send-email', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        alert('Devis envoyé avec succès par email !');
        setShowActionDialog(false);
      } else {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de l\'envoi');
      }
    } catch (error: any) {
      console.error('Erreur envoi email:', error);
      alert(error.message || 'Erreur lors de l\'envoi du devis par email');
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handlePreview = () => {
    setShowPreview(true);
  };

  const formatDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  return (
    <PageWrapper>
      <div className="max-w-7xl mx-auto">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 pr-20 md:pr-48"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-light tracking-tight text-gray-900 dark:text-white mb-2">
                Générateur de Devis
              </h1>
              <p className="text-gray-600 dark:text-gray-400">Créez des devis professionnels en quelques clics</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="rounded-xl" onClick={handlePreview} data-testid="button-preview">
                <FileText className="h-4 w-4 mr-2" />
                Aperçu
              </Button>
              <Button size="sm" onClick={handleGeneratePDF} className="bg-violet-500 hover:bg-violet-600 text-white rounded-xl" data-testid="button-generate">
                <Download className="h-4 w-4 mr-2" />
                Générer PDF
              </Button>
            </div>
          </div>
        </motion.header>

        <main className="space-y-6">
          {/* Client Information */}
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white font-light">
                <User className="h-5 w-5 text-violet-500" />
                Informations Client
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="client-name" className="text-gray-700 dark:text-gray-300">Nom complet</Label>
                <div className="flex gap-2">
                  <Input
                    id="client-name"
                    data-testid="input-client-name"
                    value={clientInfo.name}
                    onChange={(e) => setClientInfo(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Saisir le nom ou rechercher un client"
                    className="flex-1 rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                  />
                  <Popover open={clientSearchOpen} onOpenChange={setClientSearchOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                      >
                        <User className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <Command>
                        <CommandInput 
                          placeholder="Rechercher un client..." 
                          value={clientSearchValue}
                          onValueChange={setClientSearchValue}
                        />
                        <CommandList>
                          <CommandEmpty>
                            <div className="py-6 text-center text-sm text-gray-500">
                              Aucun client trouvé
                            </div>
                          </CommandEmpty>
                          <CommandGroup>
                            {clients.map((client) => (
                              <CommandItem
                                key={client.id}
                                value={`${client.name} ${client.email || ''}`}
                                onSelect={() => {
                                  setClientInfo({
                                    name: client.name,
                                    email: client.email || '',
                                    phone: client.phone || '',
                                    address: client.address || ''
                                  });
                                  setClientSearchOpen(false);
                                  setClientSearchValue('');
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    clientInfo.name === client.name ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span>{client.name}</span>
                                  {client.email && (
                                    <span className="text-xs text-gray-500">{client.email}</span>
                                  )}
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-email" className="text-gray-700 dark:text-gray-300">Email</Label>
                <Input
                  id="client-email"
                  type="email"
                  data-testid="input-client-email"
                  value={clientInfo.email}
                  onChange={(e) => setClientInfo(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="email@exemple.com"
                  className="rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-phone" className="text-gray-700 dark:text-gray-300">Téléphone</Label>
                <Input
                  id="client-phone"
                  data-testid="input-client-phone"
                  value={clientInfo.phone}
                  onChange={(e) => setClientInfo(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="06 12 34 56 78"
                  className="rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="client-address" className="text-gray-700 dark:text-gray-300">Adresse</Label>
                <Input
                  id="client-address"
                  data-testid="input-client-address"
                  value={clientInfo.address}
                  onChange={(e) => setClientInfo(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Adresse complète"
                  className="rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                />
              </div>
            </CardContent>
          </Card>

          {/* Project Information */}
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white font-light">
                <Building className="h-5 w-5 text-violet-500" />
                Détails du Projet
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="project-type" className="text-gray-700 dark:text-gray-300">Type de projet</Label>
                  <Select value={projectType} onValueChange={setProjectType}>
                    <SelectTrigger data-testid="select-project-type" className="rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                      <SelectValue placeholder="Sélectionner le type" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="piscine">Piscine & Spa</SelectItem>
                      <SelectItem value="paysage">Aménagement Paysager</SelectItem>
                      <SelectItem value="menuiserie">Menuiserie Sur-Mesure</SelectItem>
                      <SelectItem value="renovation">Rénovation</SelectItem>
                      <SelectItem value="autre">Autre</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="validity" className="text-gray-700 dark:text-gray-300">Validité du devis (jours)</Label>
                  <Input
                    id="validity"
                    type="number"
                    data-testid="input-validity"
                    value={validityDays}
                    onChange={(e) => setValidityDays(e.target.value)}
                    placeholder="30"
                    className="rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="project-description" className="text-gray-700 dark:text-gray-300">Description du projet</Label>
                <Textarea
                  id="project-description"
                  data-testid="textarea-project-description"
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Décrivez en détail le projet à réaliser..."
                  rows={3}
                  className="rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                />
              </div>
            </CardContent>
          </Card>

          {/* Quote Items */}
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 shadow-xl rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-white font-light">
                <Calculator className="h-5 w-5 text-violet-500" />
                Détail du Devis
              </CardTitle>
              <Button size="sm" onClick={addItem} className="bg-violet-500 hover:bg-violet-600 text-white rounded-xl" data-testid="button-add-item">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter ligne
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-xl">
                  <div className="md:col-span-5 space-y-2">
                    <Label className="text-gray-700 dark:text-gray-300">Description</Label>
                    <Input
                      data-testid={`input-item-description-${index}`}
                      value={item.description}
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                      placeholder="Description de la prestation"
                      className="rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label className="text-gray-700 dark:text-gray-300">Quantité</Label>
                    <Input
                      type="number"
                      data-testid={`input-item-quantity-${index}`}
                      value={item.quantity}
                      onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.1"
                      className="rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label className="text-gray-700 dark:text-gray-300">Prix unitaire</Label>
                    <Input
                      type="number"
                      data-testid={`input-item-price-${index}`}
                      value={item.unitPrice}
                      onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      className="rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <Label className="text-gray-700 dark:text-gray-300">Total</Label>
                    <div className="h-10 px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl flex items-center text-sm font-medium text-gray-900 dark:text-white">
                      {item.total.toFixed(2)} €
                    </div>
                  </div>
                  <div className="md:col-span-1 flex items-end">
                    {items.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="rounded-xl"
                        data-testid={`button-remove-item-${index}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              <Separator />

              {/* Totals */}
              <div className="space-y-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 p-4 rounded-xl">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Sous-total HT</span>
                  <span className="font-medium text-gray-900 dark:text-white">{subtotal.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">TVA (20%)</span>
                  <span className="font-medium text-gray-900 dark:text-white">{tva.toFixed(2)} €</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-900 dark:text-white">Total TTC</span>
                  <Badge className="bg-violet-500 text-white px-4 py-2 rounded-xl">
                    <Euro className="h-3 w-3 mr-1" />
                    {total.toFixed(2)} €
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Dialog d'aperçu du devis */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-900">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Aperçu du Devis</DialogTitle>
          </DialogHeader>
          
          {/* Aperçu du devis */}
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            {/* En-tête */}
            <div className="mb-8 pb-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">DEVIS</h1>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Planchais Construction</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Votre adresse professionnelle</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Date: {new Date().toLocaleDateString('fr-FR')}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Validité: {validityDays} jours</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Échéance: {formatDate(parseInt(validityDays) || 30)}</p>
                </div>
              </div>
            </div>

            {/* Informations client */}
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">Client</h2>
              <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                {clientInfo.name && (
                  <p className="font-medium text-gray-900 dark:text-white mb-1">{clientInfo.name}</p>
                )}
                {clientInfo.email && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">{clientInfo.email}</p>
                )}
                {clientInfo.phone && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">{clientInfo.phone}</p>
                )}
                {clientInfo.address && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{clientInfo.address}</p>
                )}
              </div>
            </div>

            {/* Détails du projet */}
            {(projectType || projectDescription) && (
              <div className="mb-8">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wide">Projet</h2>
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg">
                  {projectType && (
                    <p className="font-medium text-gray-900 dark:text-white mb-2">
                      Type: {projectType === 'piscine' ? 'Piscine & Spa' : 
                             projectType === 'paysage' ? 'Aménagement Paysager' :
                             projectType === 'menuiserie' ? 'Menuiserie Sur-Mesure' :
                             projectType === 'renovation' ? 'Rénovation' : 'Autre'}
                    </p>
                  )}
                  {projectDescription && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{projectDescription}</p>
                  )}
                </div>
              </div>
            )}

            {/* Détail des prestations */}
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 uppercase tracking-wide">Détail des prestations</h2>
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Description</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Qté</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Prix unitaire</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {items.filter(item => item.description || item.quantity > 0 || item.unitPrice > 0).map((item, index) => (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {item.description || `Prestation ${index + 1}`}
                        </td>
                        <td className="px-4 py-3 text-sm text-center text-gray-600 dark:text-gray-400">
                          {item.quantity}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-600 dark:text-gray-400">
                          {item.unitPrice.toFixed(2)} €
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                          {item.total.toFixed(2)} €
                        </td>
                      </tr>
                    ))}
                    {items.filter(item => item.description || item.quantity > 0 || item.unitPrice > 0).length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                          Aucune prestation ajoutée
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totaux */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex justify-end">
                <div className="w-64 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Sous-total HT</span>
                    <span className="text-gray-900 dark:text-white font-medium">{subtotal.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">TVA (20%)</span>
                    <span className="text-gray-900 dark:text-white font-medium">{tva.toFixed(2)} €</span>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between">
                    <span className="text-base font-semibold text-gray-900 dark:text-white">Total TTC</span>
                    <span className="text-base font-bold text-violet-600 dark:text-violet-400">{total.toFixed(2)} €</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pied de page */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Ce devis est valable {validityDays} jours à compter de sa date d'émission.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmation */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="bg-white dark:bg-gray-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-gray-900 dark:text-white">Générer le PDF</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-600 dark:text-gray-400">
              Êtes-vous sûr de vouloir générer le devis au format PDF avec les informations actuelles ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-gray-700 dark:text-gray-300">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmGeneratePDF} className="bg-violet-500 hover:bg-violet-600">
              Confirmer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog pour choisir l'action */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent className="bg-white dark:bg-gray-800">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white">Que souhaitez-vous faire ?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Button
              onClick={handleSavePDF}
              className="w-full bg-violet-500 hover:bg-violet-600 text-white"
            >
              <Save className="h-4 w-4 mr-2" />
              Enregistrer sur l'ordinateur
            </Button>
            <Button
              onClick={handleSendEmail}
              disabled={!clientInfo.email || isSendingEmail}
              className="w-full bg-gray-500 hover:bg-gray-600 text-white disabled:opacity-50"
            >
              <Mail className="h-4 w-4 mr-2" />
              {isSendingEmail ? 'Envoi en cours...' : `Envoyer par email à ${clientInfo.email || 'le client'}`}
            </Button>
            {!clientInfo.email && (
              <p className="text-sm text-yellow-600 dark:text-yellow-400">
                ⚠️ L'adresse email du client est requise pour l'envoi par email
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(false)}>
              Annuler
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
