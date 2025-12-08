import { useState, useMemo } from "react";
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

export default function DocumentsPage() {
  const { toast } = useToast();
  const { getActiveLoads } = useMockData();
  const {
    documents,
    templates,
    uploadDocument,
    deleteDocument,
    verifyDocument,
    replaceDocument,
    getExpiringDocuments,
    getExpiredDocuments,
  } = useDocumentVault();
  
  const activeLoads = getActiveLoads();

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
    loadId: "",
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
      const matchesSearch = 
        doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.loadId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesType = typeFilter === "all" || doc.category === typeFilter;
      const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
      const matchesLoad = loadFilter === "all" || doc.loadId === loadFilter;
      return matchesSearch && matchesType && matchesStatus && matchesLoad;
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
      loadId: uploadForm.loadId || undefined,
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
      loadId: "",
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
          <h1 className="text-2xl font-bold">Document Vault</h1>
          <p className="text-muted-foreground">Manage shipment documents, compliance files, and certificates.</p>
        </div>
        <Button onClick={() => setUploadDialogOpen(true)} data-testid="button-upload-document">
          <Upload className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      {(expiringDocs.length > 0 || expiredDocs.length > 0) && (
        <Card className="mb-6 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  {expiredDocs.length > 0 && `${expiredDocs.length} expired`}
                  {expiredDocs.length > 0 && expiringDocs.length > 0 && " and "}
                  {expiringDocs.length > 0 && `${expiringDocs.length} expiring soon`}
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Review and renew your documents to avoid service interruptions.
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setStatusFilter("expiring_soon")}
                data-testid="button-view-expiring"
              >
                View Documents
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
              placeholder="Search by name, load, or tags..."
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
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(documentCategoryLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as DocumentStatus | "all")}>
            <SelectTrigger className="w-full sm:w-40" data-testid="select-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-4 flex-wrap justify-between">
          <div className="flex items-center gap-2">
            <Select value={loadFilter} onValueChange={setLoadFilter}>
              <SelectTrigger className="w-40" data-testid="select-load-filter">
                <Link2 className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Load" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Loads</SelectItem>
                {linkedLoads.map(loadId => (
                  <SelectItem key={loadId} value={loadId}>{loadId}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Showing {filteredAndSortedDocs.length} of {documents.length} documents
            </p>
          </div>
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger className="w-40" data-testid="select-sort">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="expiring">Soonest Expiring</SelectItem>
              <SelectItem value="largest">Largest Size</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredAndSortedDocs.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents found"
          description="Upload your first document to get started. You can store PODs, invoices, insurance certificates, and more."
          actionLabel="Upload Document"
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
                      {documentCategoryLabels[doc.category]}
                    </Badge>
                    {getStatusBadge(doc.status)}
                  </div>
                  {doc.loadId && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Load</span>
                      <span className="font-medium">{doc.loadId}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Uploaded</span>
                    <span>{formatDate(doc.uploadedDate)}</span>
                  </div>
                  {doc.expiryDate && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Expires</span>
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
                    View
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleDownload(doc)}
                    data-testid={`button-download-${doc.documentId}`}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
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
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Add a new document to your vault. Select a template for quick setup.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Quick Templates</Label>
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
              <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
              <p className="text-xs text-muted-foreground">PDF, JPG, or PNG up to 10MB</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fileName">File Name</Label>
                <Input
                  id="fileName"
                  placeholder="Enter file name..."
                  value={uploadForm.fileName}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, fileName: e.target.value }))}
                  data-testid="input-file-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fileType">File Type</Label>
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
                <Label htmlFor="category">Document Type</Label>
                <Select 
                  value={uploadForm.category} 
                  onValueChange={(v) => setUploadForm(prev => ({ ...prev, category: v as DocumentCategory }))}
                >
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(documentCategoryLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="loadId">Link to Load (Optional)</Label>
                <Select 
                  value={uploadForm.loadId} 
                  onValueChange={(v) => setUploadForm(prev => ({ ...prev, loadId: v }))}
                >
                  <SelectTrigger data-testid="select-load-link">
                    <SelectValue placeholder="Select load..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No Load</SelectItem>
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
              <Label htmlFor="expiryDate">Expiry Date (Optional)</Label>
              <Input
                id="expiryDate"
                type="date"
                value={uploadForm.expiryDate}
                onChange={(e) => setUploadForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                data-testid="input-expiry-date"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="tags"
                  placeholder="Add tags separated by commas..."
                  value={uploadForm.tags}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, tags: e.target.value }))}
                  data-testid="input-tags"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this document..."
                value={uploadForm.notes}
                onChange={(e) => setUploadForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
                data-testid="input-notes"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} data-testid="button-confirm-upload">
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
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
              Download
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
                    <p>Category: {documentCategoryLabels[selectedDocument.category]}</p>
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
                  Document Details
                </SheetTitle>
                <SheetDescription>
                  View and manage document information
                </SheetDescription>
              </SheetHeader>

              <Tabs defaultValue="overview" className="mt-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="overview" data-testid="tab-overview">
                    <Info className="h-4 w-4 mr-1" />
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="preview" data-testid="tab-preview">
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </TabsTrigger>
                  <TabsTrigger value="history" data-testid="tab-history">
                    <History className="h-4 w-4 mr-1" />
                    History
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                  <Card>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">File Name</span>
                        <span className="font-medium text-right max-w-48 truncate">{selectedDocument.fileName}</span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Type</span>
                        <Badge variant="secondary">{documentCategoryLabels[selectedDocument.category]}</Badge>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">File Size</span>
                        <span>{formatFileSize(selectedDocument.fileSize)}</span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Version</span>
                        <span>v{selectedDocument.version}</span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Status</span>
                        {getStatusBadge(selectedDocument.status)}
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Verified</span>
                        {selectedDocument.isVerified ? (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 no-default-hover-elevate">Verified</Badge>
                        ) : (
                          <Badge variant="outline">Pending</Badge>
                        )}
                      </div>
                      {selectedDocument.loadId && (
                        <>
                          <Separator />
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Linked Load</span>
                            <span className="font-medium">{selectedDocument.loadId}</span>
                          </div>
                        </>
                      )}
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Uploaded By</span>
                        <span>{selectedDocument.uploadedBy}</span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Uploaded Date</span>
                        <span>{formatDate(selectedDocument.uploadedDate)}</span>
                      </div>
                      {selectedDocument.expiryDate && (
                        <>
                          <Separator />
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Expiry Date</span>
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
                      <Label>Tags</Label>
                      <div className="flex flex-wrap gap-2">
                        {selectedDocument.tags.map(tag => (
                          <Badge key={tag} variant="outline">{tag}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedDocument.notes && (
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <p className="text-sm text-muted-foreground p-3 bg-muted rounded-md">
                        {selectedDocument.notes}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2 pt-4">
                    <Button onClick={() => handleView(selectedDocument)} data-testid="button-panel-view">
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button variant="outline" onClick={() => handleDownload(selectedDocument)} data-testid="button-panel-download">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    {!selectedDocument.isVerified && (
                      <Button 
                        variant="outline" 
                        className="col-span-2"
                        onClick={() => handleVerify(selectedDocument)}
                        data-testid="button-verify"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Mark as Verified
                      </Button>
                    )}
                    <Button 
                      variant="destructive" 
                      className="col-span-2"
                      onClick={() => handleDelete(selectedDocument)}
                      data-testid="button-panel-delete"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Document
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
                          Open Full Viewer
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <FileImage className="h-16 w-16 mx-auto mb-4 text-blue-500" />
                        <p className="font-medium">{selectedDocument.fileName}</p>
                        <p className="text-sm text-muted-foreground mb-4">{formatFileSize(selectedDocument.fileSize)}</p>
                        <Button onClick={() => handleView(selectedDocument)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Open Full Viewer
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
                        <p className="font-medium text-sm">Version {selectedDocument.version} (Current)</p>
                        <p className="text-xs text-muted-foreground">
                          Uploaded by {selectedDocument.uploadedBy} on {formatDate(selectedDocument.uploadedDate)}
                        </p>
                      </div>
                    </div>
                    
                    {selectedDocument.previousVersions?.map(version => (
                      <div key={version.version} className="flex items-start gap-3 p-3 border rounded-lg">
                        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          <History className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Version {version.version}</p>
                          <p className="text-xs text-muted-foreground">
                            {version.fileName} - {formatDate(version.uploadedDate)}
                          </p>
                        </div>
                      </div>
                    ))}

                    {!selectedDocument.previousVersions?.length && selectedDocument.version === 1 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        This is the original version of this document.
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
