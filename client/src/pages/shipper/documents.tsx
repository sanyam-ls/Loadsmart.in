import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { 
  FileText, Upload, Search, Filter, Download, Eye, Trash2, AlertCircle, 
  CheckCircle, X, Tag, Calendar, Link2, Plus, RotateCw, ZoomIn, ZoomOut,
  ChevronLeft, ChevronRight, Clock, FileImage, Info, Edit2, History
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import { useMockData } from "@/lib/mock-data-store";
import {
  useDocumentVault,
  documentCategoryLabels,
  formatFileSize,
  formatDate,
  getDaysUntilExpiry,
  type VaultDocument,
  type DocumentCategory,
  type DocumentStatus,
} from "@/lib/document-vault-store";

type SortOption = "newest" | "oldest" | "expiring" | "largest";

// Shipper-specific document categories (excluding carrier documents)
const shipperDocumentCategories: DocumentCategory[] = [
  "pod", "bol", "invoice", "lr", "eway_bill", "weight_slip", "photos", "other"
];

// Categorized groups for shipper documents
const shipperDocumentGroups = {
  shipment: {
    label: "Shipment Documents",
    icon: "truck",
    categories: ["pod", "bol", "lr"] as DocumentCategory[],
  },
  compliance: {
    label: "Compliance & Customs",
    icon: "shield",
    categories: ["eway_bill", "weight_slip"] as DocumentCategory[],
  },
  financial: {
    label: "Financial",
    icon: "receipt",
    categories: ["invoice"] as DocumentCategory[],
  },
  media: {
    label: "Photos & Other",
    icon: "image",
    categories: ["photos", "other"] as DocumentCategory[],
  },
};

const shipperCategoryLabels: Record<string, string> = {
  pod: "Proof of Delivery",
  bol: "Bill of Lading",
  invoice: "Invoice",
  lr: "LR / Consignment Note",
  eway_bill: "E-way Bill",
  weight_slip: "Weight Slip",
  photos: "Photos",
  other: "Other",
};

// Map API document types to our category types
const apiDocTypeToCategory: Record<string, DocumentCategory> = {
  lr_consignment: "lr",
  eway_bill: "eway_bill",
  loading_photos: "photos",
  delivery_photos: "photos",
  pod: "pod",
  invoice: "invoice",
  weight_slip: "weight_slip",
  bol: "bol",
  other: "other",
};

interface ApiDocument {
  id: string;
  userId: string;
  loadId?: string;
  shipmentId?: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  isVerified: boolean;
  createdAt: string;
  load?: {
    shipperLoadNumber?: number;
    adminReferenceNumber?: number;
  };
}

export default function DocumentsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { getActiveLoads } = useMockData();
  const {
    documents: mockDocuments,
    templates,
    uploadDocument,
    deleteDocument,
    verifyDocument,
    replaceDocument,
    getExpiringDocuments,
    getExpiredDocuments,
  } = useDocumentVault();
  
  const activeLoads = getActiveLoads();
  
  // Fetch real shipment documents from API
  const { data: apiDocuments = [], isLoading: isLoadingApiDocs } = useQuery<ApiDocument[]>({
    queryKey: ['/api/shipper/documents'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  
  // Convert API documents to VaultDocument format and merge with mock documents
  const documents = useMemo(() => {
    const convertedApiDocs: VaultDocument[] = apiDocuments.map((doc) => {
      const category = apiDocTypeToCategory[doc.documentType] || "other";
      const loadNumber = doc.load?.adminReferenceNumber || doc.load?.shipperLoadNumber;
      const loadIdStr = loadNumber ? `LD-${String(loadNumber).padStart(3, '0')}` : doc.loadId;
      
      return {
        documentId: `api-${doc.id}`,
        fileName: doc.fileName,
        fileSize: doc.fileSize || 0,
        fileType: doc.fileName.toLowerCase().endsWith('.pdf') ? "pdf" as const : "image" as const,
        fileUrl: doc.fileUrl,
        category,
        loadId: loadIdStr,
        shipmentId: doc.shipmentId,
        uploadedBy: "Carrier",
        uploadedDate: new Date(doc.createdAt),
        status: "active" as DocumentStatus,
        tags: [doc.documentType],
        version: 1,
        isVerified: doc.isVerified,
      };
    });
    
    // Merge: API documents first (real), then mock documents
    // Filter out mock documents that might duplicate API documents
    const apiDocIds = new Set(convertedApiDocs.map(d => d.fileName));
    const filteredMockDocs = mockDocuments.filter(d => !apiDocIds.has(d.fileName));
    
    return [...convertedApiDocs, ...filteredMockDocs];
  }, [apiDocuments, mockDocuments]);

  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<DocumentCategory | "all">("all");
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | "all">("all");
  const [loadFilter, setLoadFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [detailPanelOpen, setDetailPanelOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<VaultDocument | null>(null);

  const [uploadForm, setUploadForm] = useState({
    fileName: "",
    fileType: "pdf" as "pdf" | "image",
    category: "" as DocumentCategory | "",
    loadId: "none",
    notes: "",
    tags: "",
    expiryDate: "",
  });
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);

  const expiringDocs = getExpiringDocuments();
  const expiredDocs = getExpiredDocuments();

  const filteredAndSortedDocs = useMemo(() => {
    let result = documents.filter(doc => {
      // Only show shipper-relevant document categories
      const isShipperCategory = shipperDocumentCategories.includes(doc.category);
      const matchesSearch = 
        doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.loadId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = typeFilter === "all" || doc.category === typeFilter;
      const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
      const matchesLoad = loadFilter === "all" || doc.loadId === loadFilter;
      return isShipperCategory && matchesSearch && matchesType && matchesStatus && matchesLoad;
    });

    result.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return b.uploadedDate.getTime() - a.uploadedDate.getTime();
        case "oldest":
          return a.uploadedDate.getTime() - b.uploadedDate.getTime();
        case "expiring":
          const aExp = a.expiryDate?.getTime() || Infinity;
          const bExp = b.expiryDate?.getTime() || Infinity;
          return aExp - bExp;
        case "largest":
          return b.fileSize - a.fileSize;
        default:
          return 0;
      }
    });

    return result;
  }, [documents, searchQuery, typeFilter, statusFilter, loadFilter, sortBy]);

  const handleUpload = () => {
    if (!uploadForm.fileName || !uploadForm.category) {
      toast({
        title: "Missing Information",
        description: "Please provide a file name and select a document type.",
        variant: "destructive",
      });
      return;
    }

    const template = templates.find(t => t.id === uploadForm.category);
    let expiryDate: Date | undefined;
    if (uploadForm.expiryDate) {
      expiryDate = new Date(uploadForm.expiryDate);
    } else if (template?.hasExpiry && template.defaultExpiryMonths) {
      expiryDate = new Date();
      expiryDate.setMonth(expiryDate.getMonth() + template.defaultExpiryMonths);
    }

    uploadDocument({
      fileName: uploadForm.fileName,
      fileSize: Math.floor(Math.random() * 2000000) + 100000,
      fileType: uploadForm.fileType,
      fileUrl: `/mock/${uploadForm.category}.${uploadForm.fileType === "pdf" ? "pdf" : "jpg"}`,
      category: uploadForm.category as DocumentCategory,
      loadId: uploadForm.loadId && uploadForm.loadId !== "none" ? uploadForm.loadId : undefined,
      uploadedBy: "You",
      expiryDate,
      notes: uploadForm.notes || undefined,
      tags: uploadForm.tags ? uploadForm.tags.split(",").map(t => t.trim()) : template?.suggestedTags || [],
      isVerified: false,
    });

    toast({
      title: "Document Uploaded",
      description: `${uploadForm.fileName} has been added to your vault.`,
    });

    setUploadForm({
      fileName: "",
      fileType: "pdf",
      category: "",
      loadId: "none",
      notes: "",
      tags: "",
      expiryDate: "",
    });
    setUploadDialogOpen(false);
  };

  const handleView = (doc: VaultDocument) => {
    setSelectedDocument(doc);
    setZoom(100);
    setRotation(0);
    setViewerOpen(true);
  };

  const handleDetails = (doc: VaultDocument) => {
    setSelectedDocument(doc);
    setDetailPanelOpen(true);
  };

  const handleDelete = (doc: VaultDocument) => {
    deleteDocument(doc.documentId);
    toast({
      title: "Document Deleted",
      description: `${doc.fileName} has been removed from your vault.`,
    });
    setDetailPanelOpen(false);
  };

  const handleVerify = (doc: VaultDocument) => {
    verifyDocument(doc.documentId);
    toast({
      title: "Document Verified",
      description: `${doc.fileName} has been marked as verified.`,
    });
  };

  const handleDownload = (doc: VaultDocument) => {
    toast({
      title: "Download Started",
      description: `Downloading ${doc.fileName}...`,
    });
  };

  const handleSelectTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setUploadForm(prev => ({
        ...prev,
        category: templateId as DocumentCategory,
        tags: template.suggestedTags.join(", "),
      }));
    }
  };

  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 no-default-hover-elevate no-default-active-elevate">Active</Badge>;
      case "expiring_soon":
        return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 no-default-hover-elevate no-default-active-elevate">Expiring Soon</Badge>;
      case "expired":
        return <Badge variant="destructive" className="no-default-hover-elevate no-default-active-elevate">Expired</Badge>;
    }
  };

  const linkedLoads = Array.from(new Set(documents.filter(d => d.loadId).map(d => d.loadId!)));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-bold">{t('documents.title')}</h1>
          <p className="text-muted-foreground">{t('shipper.documentsTitle')}</p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)} data-testid="button-upload-document">
          <Upload className="h-4 w-4 mr-2" />
          {t('documents.uploadDocument')}
        </Button>
      </div>

      {(expiringDocs.length > 0 || expiredDocs.length > 0) && (
        <Card className="mb-6 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  {expiredDocs.length > 0 && `${expiredDocs.length} ${t('documents.expired')}`}
                  {expiredDocs.length > 0 && expiringDocs.length > 0 && " & "}
                  {expiringDocs.length > 0 && `${expiringDocs.length} ${t('documents.expiringSoon')}`}
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  {t('documents.expiringDocuments')}
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setStatusFilter("expiring_soon")}
                data-testid="button-view-expiring"
              >
                {t('documents.viewDocument')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, load ID (e.g. LD-057)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-documents"
            />
          </div>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as DocumentCategory | "all")}>
            <SelectTrigger className="w-full sm:w-44" data-testid="select-type-filter">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Document type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')} {t('common.type')}</SelectItem>
              {Object.entries(shipperDocumentGroups).map(([groupKey, group]) => (
                <div key={groupKey}>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{group.label}</div>
                  {group.categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{shipperCategoryLabels[cat]}</SelectItem>
                  ))}
                </div>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as DocumentStatus | "all")}>
            <SelectTrigger className="w-full sm:w-40" data-testid="select-status-filter">
              <SelectValue placeholder={t('common.status')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('common.all')}</SelectItem>
              <SelectItem value="active">{t('common.active')}</SelectItem>
              <SelectItem value="expiring_soon">{t('documents.expiringSoon')}</SelectItem>
              <SelectItem value="expired">{t('documents.expired')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-4 flex-wrap justify-between">
          <div className="flex items-center gap-2">
            <Select value={loadFilter} onValueChange={setLoadFilter}>
              <SelectTrigger className="w-40" data-testid="select-load-filter">
                <Link2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder={t('loads.title')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')} {t('loads.title')}</SelectItem>
                {linkedLoads.map(loadId => (
                  <SelectItem key={loadId} value={loadId}>{loadId}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {t('common.showing')} {filteredAndSortedDocs.length} {t('common.of')} {documents.length} {t('documents.title').toLowerCase()}
            </p>
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-40" data-testid="select-sort">
              <SelectValue placeholder={t('common.sortBy')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t('common.descending')}</SelectItem>
              <SelectItem value="oldest">{t('common.ascending')}</SelectItem>
              <SelectItem value="expiring">{t('documents.expiringSoon')}</SelectItem>
              <SelectItem value="largest">{t('common.more')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredAndSortedDocs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={t('documents.noDocumentsFound')}
          description={t('documents.uploadFirstDocument')}
          actionLabel={t('documents.uploadDocument')}
          onAction={() => setUploadDialogOpen(true)}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAndSortedDocs.map((doc) => (
            <Card 
              key={doc.documentId} 
              className="hover-elevate cursor-pointer" 
              onClick={() => handleDetails(doc)}
              data-testid={`document-card-${doc.documentId}`}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 ${
                    doc.fileType === "pdf" 
                      ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
                      : "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
                  }`}>
                    {doc.fileType === "pdf" ? <FileText className="h-5 w-5" /> : <FileImage className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" data-testid={`text-filename-${doc.documentId}`}>
                      {doc.fileName}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(doc.fileSize)}</p>
                  </div>
                  {doc.isVerified ? (
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate">
                      {shipperCategoryLabels[doc.category] || documentCategoryLabels[doc.category]}
                    </Badge>
                    {getStatusBadge(doc.status)}
                  </div>
                  {doc.loadId && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t('loads.title')}</span>
                      <span className="font-medium">{doc.loadId}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('documents.uploadedOn')}</span>
                    <span>{formatDate(doc.uploadedDate)}</span>
                  </div>
                  {doc.expiryDate && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t('documents.expiryDate')}</span>
                      <span className={doc.status === "expired" ? "text-destructive" : doc.status === "expiring_soon" ? "text-amber-600 dark:text-amber-400" : ""}>
                        {formatDate(doc.expiryDate)}
                        {doc.status !== "active" && ` (${getDaysUntilExpiry(doc.expiryDate)}d)`}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1" 
                    onClick={() => handleView(doc)}
                    data-testid={`button-view-${doc.documentId}`}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    {t('common.view')}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleDownload(doc)}
                    data-testid={`button-download-${doc.documentId}`}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    {t('common.download')}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => handleDelete(doc)}
                    data-testid={`button-delete-${doc.documentId}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('documents.uploadDocument')}</DialogTitle>
            <DialogDescription>
              {t('documents.dragAndDrop')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('documents.documentType')}</Label>
              <div className="grid grid-cols-3 gap-2">
                {templates.slice(0, 6).map(template => (
                  <Button
                    key={template.id}
                    variant={uploadForm.category === template.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSelectTemplate(template.id)}
                    className="text-xs"
                    data-testid={`button-template-${template.id}`}
                  >
                    {template.name.split(" ")[0]}
                  </Button>
                ))}
              </div>
            </div>

            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover-elevate cursor-pointer">
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">{t('documents.dragAndDrop')}</p>
              <p className="text-xs text-muted-foreground">{t('documents.supportedFormats')}: PDF, JPG, PNG</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fileName">{t('documents.documentName')}</Label>
                <Input
                  id="fileName"
                  placeholder={t('common.name') + '...'}
                  value={uploadForm.fileName}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, fileName: e.target.value }))}
                  data-testid="input-file-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fileType">{t('common.type')}</Label>
                <Select 
                  value={uploadForm.fileType} 
                  onValueChange={(v) => setUploadForm(prev => ({ ...prev, fileType: v as "pdf" | "image" }))}
                >
                  <SelectTrigger data-testid="select-file-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">{t('documents.documentType')}</Label>
                <Select 
                  value={uploadForm.category} 
                  onValueChange={(v) => setUploadForm(prev => ({ ...prev, category: v as DocumentCategory }))}
                >
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder={t('documents.selectDocumentType')} />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(shipperDocumentGroups).map(([groupKey, group]) => (
                      <div key={groupKey}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{group.label}</div>
                        {group.categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>{shipperCategoryLabels[cat]}</SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="loadId">{t('loads.title')} ({t('common.optional')})</Label>
                <Select 
                  value={uploadForm.loadId} 
                  onValueChange={(v) => setUploadForm(prev => ({ ...prev, loadId: v }))}
                >
                  <SelectTrigger data-testid="select-load-link">
                    <SelectValue placeholder={t('common.select') + '...'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('common.none')}</SelectItem>
                    {activeLoads.map(load => (
                      <SelectItem key={load.loadId} value={load.loadId}>
                        {load.loadId} - {load.pickup} to {load.drop}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expiryDate">{t('documents.expiryDate')} ({t('common.optional')})</Label>
              <Input
                id="expiryDate"
                type="date"
                value={uploadForm.expiryDate}
                onChange={(e) => setUploadForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                data-testid="input-expiry-date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">{t('documents.tags')}</Label>
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="tags"
                  placeholder={t('documents.addTag') + '...'}
                  value={uploadForm.tags}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, tags: e.target.value }))}
                  data-testid="input-tags"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">{t('common.notes')}</Label>
              <Textarea
                id="notes"
                placeholder={t('common.notes') + '...'}
                value={uploadForm.notes}
                onChange={(e) => setUploadForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                data-testid="input-notes"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleUpload} data-testid="button-confirm-upload">
              <Upload className="h-4 w-4 mr-2" />
              {t('documents.uploadDocument')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={viewerOpen} onOpenChange={setViewerOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedDocument?.fileType === "pdf" ? <FileText className="h-5 w-5" /> : <FileImage className="h-5 w-5" />}
              {selectedDocument?.fileName}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex items-center justify-center gap-2 p-2 border-b">
            <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.max(25, z - 25))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm min-w-12 text-center">{zoom}%</span>
            <Button variant="outline" size="icon" onClick={() => setZoom(z => Math.min(200, z + 25))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button variant="outline" size="icon" onClick={() => setRotation(r => (r + 90) % 360)}>
              <RotateCw className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button variant="outline" size="icon">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">Page 1 of 1</span>
            <Button variant="outline" size="icon">
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button variant="outline" size="sm" onClick={() => selectedDocument && handleDownload(selectedDocument)}>
              <Download className="h-4 w-4 mr-2" />
              {t('common.download')}
            </Button>
          </div>
          
          <div className="flex items-center justify-center bg-muted rounded-lg min-h-[400px] overflow-auto">
            <div 
              className="flex items-center justify-center p-8"
              style={{ 
                transform: `scale(${zoom / 100}) rotate(${rotation}deg)`,
                transition: "transform 0.2s ease"
              }}
            >
              {selectedDocument?.fileType === "pdf" ? (
                <div className="bg-background border rounded-lg p-8 shadow-lg min-w-[300px]">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="h-8 w-8 text-red-500" />
                    <div>
                      <p className="font-semibold">{selectedDocument.fileName}</p>
                      <p className="text-sm text-muted-foreground">{formatFileSize(selectedDocument.fileSize)}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Category: {shipperCategoryLabels[selectedDocument.category] || documentCategoryLabels[selectedDocument.category]}</p>
                    <p>Uploaded: {formatDate(selectedDocument.uploadedDate)}</p>
                    {selectedDocument.loadId && <p>Load: {selectedDocument.loadId}</p>}
                    {selectedDocument.notes && <p>Notes: {selectedDocument.notes}</p>}
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-center text-muted-foreground">
                      PDF Preview (simulated)
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 rounded-lg p-8 min-w-[300px] min-h-[200px] flex items-center justify-center">
                  <div className="text-center">
                    <FileImage className="h-16 w-16 mx-auto mb-2 text-blue-500" />
                    <p className="font-medium">{selectedDocument?.fileName}</p>
                    <p className="text-sm text-muted-foreground">Image Preview (simulated)</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={detailPanelOpen} onOpenChange={setDetailPanelOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedDocument && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {selectedDocument.fileType === "pdf" ? <FileText className="h-5 w-5" /> : <FileImage className="h-5 w-5" />}
                  {t('documents.documentDetails')}
                </SheetTitle>
                <SheetDescription>
                  {t('documents.viewDocument')}
                </SheetDescription>
              </SheetHeader>

              <Tabs defaultValue="overview" className="mt-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview" data-testid="tab-overview">
                    <Info className="h-4 w-4 mr-1" />
                    {t('common.overview')}
                  </TabsTrigger>
                  <TabsTrigger value="preview" data-testid="tab-preview">
                    <Eye className="h-4 w-4 mr-1" />
                    {t('common.preview')}
                  </TabsTrigger>
                  <TabsTrigger value="history" data-testid="tab-history">
                    <History className="h-4 w-4 mr-1" />
                    {t('common.history')}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  <Card>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t('documents.documentName')}</span>
                        <span className="font-medium text-right max-w-48 truncate">{selectedDocument.fileName}</span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t('common.type')}</span>
                        <Badge variant="secondary">{shipperCategoryLabels[selectedDocument.category] || documentCategoryLabels[selectedDocument.category]}</Badge>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t('documents.fileSize')}</span>
                        <span>{formatFileSize(selectedDocument.fileSize)}</span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t('documents.version')}</span>
                        <span>v{selectedDocument.version}</span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t('common.status')}</span>
                        {getStatusBadge(selectedDocument.status)}
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t('documents.verified')}</span>
                        {selectedDocument.isVerified ? (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 no-default-hover-elevate">{t('documents.verified')}</Badge>
                        ) : (
                          <Badge variant="outline">{t('common.pending')}</Badge>
                        )}
                      </div>
                      {selectedDocument.loadId && (
                        <>
                          <Separator />
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">{t('loads.title')}</span>
                            <span className="font-medium">{selectedDocument.loadId}</span>
                          </div>
                        </>
                      )}
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t('documents.uploadedBy')}</span>
                        <span>{selectedDocument.uploadedBy}</span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t('documents.uploadedOn')}</span>
                        <span>{formatDate(selectedDocument.uploadedDate)}</span>
                      </div>
                      {selectedDocument.expiryDate && (
                        <>
                          <Separator />
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">{t('documents.expiryDate')}</span>
                            <span className={selectedDocument.status !== "active" ? "text-destructive" : ""}>
                              {formatDate(selectedDocument.expiryDate)}
                            </span>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {selectedDocument.tags.length > 0 && (
                    <div className="space-y-2">
                      <Label>{t('documents.tags')}</Label>
                      <div className="flex flex-wrap gap-2">
                        {selectedDocument.tags.map(tag => (
                          <Badge key={tag} variant="outline">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedDocument.notes && (
                    <div className="space-y-2">
                      <Label>{t('common.notes')}</Label>
                      <p className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                        {selectedDocument.notes}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-4">
                    <Button onClick={() => handleView(selectedDocument)} data-testid="button-panel-view">
                      <Eye className="h-4 w-4 mr-2" />
                      {t('common.view')}
                    </Button>
                    <Button variant="outline" onClick={() => handleDownload(selectedDocument)} data-testid="button-panel-download">
                      <Download className="h-4 w-4 mr-2" />
                      {t('common.download')}
                    </Button>
                    {!selectedDocument.isVerified && (
                      <Button 
                        variant="outline" 
                        className="col-span-2"
                        onClick={() => handleVerify(selectedDocument)}
                        data-testid="button-verify"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {t('documents.markVerified')}
                      </Button>
                    )}
                    <Button 
                      variant="destructive" 
                      className="col-span-2"
                      onClick={() => handleDelete(selectedDocument)}
                      data-testid="button-panel-delete"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('documents.deleteDocument')}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="preview" className="mt-4">
                  <div className="bg-muted rounded-lg p-8 min-h-[300px] flex items-center justify-center">
                    {selectedDocument.fileType === "pdf" ? (
                      <div className="text-center">
                        <FileText className="h-16 w-16 mx-auto mb-4 text-red-500" />
                        <p className="font-medium">{selectedDocument.fileName}</p>
                        <p className="text-sm text-muted-foreground mb-4">{formatFileSize(selectedDocument.fileSize)}</p>
                        <Button onClick={() => handleView(selectedDocument)}>
                          <Eye className="h-4 w-4 mr-2" />
                          {t('documents.viewDocument')}
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <FileImage className="h-16 w-16 mx-auto mb-4 text-blue-500" />
                        <p className="font-medium">{selectedDocument.fileName}</p>
                        <p className="text-sm text-muted-foreground mb-4">{formatFileSize(selectedDocument.fileSize)}</p>
                        <Button onClick={() => handleView(selectedDocument)}>
                          <Eye className="h-4 w-4 mr-2" />
                          {t('documents.viewDocument')}
                        </Button>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="history" className="mt-4">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Clock className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{t('documents.version')} {selectedDocument.version} ({t('common.current')})</p>
                        <p className="text-xs text-muted-foreground">
                          {t('documents.uploadedBy')} {selectedDocument.uploadedBy} {t('common.on')} {formatDate(selectedDocument.uploadedDate)}
                        </p>
                      </div>
                    </div>
                    
                    {selectedDocument.previousVersions?.map(version => (
                      <div key={version.version} className="flex items-start gap-3 p-3 border rounded-lg">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <History className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{t('documents.version')} {version.version}</p>
                          <p className="text-xs text-muted-foreground">
                            {version.fileName} - {formatDate(version.uploadedDate)}
                          </p>
                        </div>
                      </div>
                    ))}

                    {!selectedDocument.previousVersions?.length && selectedDocument.version === 1 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {t('documents.originalVersion')}
                      </p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
