import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Upload,
  Calendar,
  Download,
  Eye,
  Trash2,
  Sparkles,
  File,
  X,
  Loader2
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Document {
  id: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  expiryDate: string | null;
  isVerified: boolean;
  createdAt: string;
}

interface ExpiryData {
  expired: Document[];
  expiringSoon: Document[];
  healthy: Document[];
  summary: {
    totalDocs: number;
    expiredCount: number;
    expiringSoonCount: number;
    healthyCount: number;
  };
}

const documentTypeLabels: Record<string, string> = {
  rc: "Registration Certificate (RC)",
  insurance: "Vehicle Insurance",
  fitness: "Fitness Certificate",
  license: "Driving License",
  puc: "PUC Certificate",
  permit: "Road Permit",
  pan_card: "PAN Card",
  aadhar: "Aadhar Card",
  pod: "Proof of Delivery",
  invoice: "Invoice",
  other: "Other Document",
};

const documentCategories = {
  truck: ["rc", "insurance", "fitness", "puc", "permit"],
  driver: ["license", "pan_card", "aadhar"],
  trip: ["pod", "invoice"],
};

function formatFileSize(bytes?: number): string {
  if (!bytes) return "Unknown size";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export default function MyDocumentsPage() {
  const { user, carrierType } = useAuth();
  const { toast } = useToast();
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [selectedDocType, setSelectedDocType] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [expiryDate, setExpiryDate] = useState("");

  const { data, isLoading, error, refetch } = useQuery<ExpiryData>({
    queryKey: ["/api/carrier/documents/expiring"],
    enabled: !!user && user.role === "carrier",
  });

  const uploadMutation = useMutation({
    mutationFn: async (docData: { documentType: string; fileName: string; fileUrl: string; fileSize: number; expiryDate: string | null }) => {
      return apiRequest("POST", "/api/carrier/documents", docData);
    },
    onSuccess: () => {
      toast({
        title: "Document Uploaded",
        description: "Your document has been uploaded successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/carrier/documents/expiring"] });
      setUploadDialogOpen(false);
      resetUploadForm();
    },
    onError: () => {
      toast({
        title: "Upload Failed",
        description: "Failed to upload document. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      return apiRequest("DELETE", `/api/carrier/documents/${docId}`);
    },
    onSuccess: () => {
      toast({
        title: "Document Deleted",
        description: "The document has been removed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/carrier/documents/expiring"] });
      setPreviewDialogOpen(false);
      setSelectedDocument(null);
    },
    onError: () => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete document. Please try again.",
        variant: "destructive",
      });
    },
  });

  const generateSamplesMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/carrier/documents/generate-samples");
    },
    onSuccess: () => {
      toast({
        title: "Sample Documents Generated",
        description: "AI-generated sample documents have been added to your account for demonstration.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/carrier/documents/expiring"] });
    },
    onError: () => {
      toast({
        title: "Generation Failed",
        description: "Failed to generate sample documents. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetUploadForm = () => {
    setSelectedDocType("");
    setSelectedFile(null);
    setExpiryDate("");
  };

  const handleUpload = async () => {
    if (!selectedDocType || !selectedFile) {
      toast({
        title: "Missing Information",
        description: "Please select a document type and file.",
        variant: "destructive",
      });
      return;
    }

    // Convert file to base64 data URL for persistence
    const reader = new FileReader();
    reader.onload = () => {
      const base64Url = reader.result as string;
      uploadMutation.mutate({
        documentType: selectedDocType,
        fileName: selectedFile.name,
        fileUrl: base64Url,
        fileSize: selectedFile.size,
        expiryDate: expiryDate || null,
      });
    };
    reader.onerror = () => {
      toast({
        title: "File Read Error",
        description: "Failed to read the file. Please try again.",
        variant: "destructive",
      });
    };
    reader.readAsDataURL(selectedFile);
  };

  const handlePreview = (doc: Document) => {
    setSelectedDocument(doc);
    setPreviewDialogOpen(true);
  };

  const handleDelete = (docId: string) => {
    deleteMutation.mutate(docId);
  };

  if (carrierType === undefined) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" data-testid="skeleton-title" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-24" data-testid="skeleton-stat-1" />
          <Skeleton className="h-24" data-testid="skeleton-stat-2" />
          <Skeleton className="h-24" data-testid="skeleton-stat-3" />
          <Skeleton className="h-24" data-testid="skeleton-stat-4" />
        </div>
        <Skeleton className="h-64" data-testid="skeleton-content" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" data-testid="skeleton-title" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-24" data-testid="skeleton-stat-1" />
          <Skeleton className="h-24" data-testid="skeleton-stat-2" />
          <Skeleton className="h-24" data-testid="skeleton-stat-3" />
          <Skeleton className="h-24" data-testid="skeleton-stat-4" />
        </div>
        <Skeleton className="h-64" data-testid="skeleton-content" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive" data-testid="alert-error">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load documents. Please try again.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const { expired, expiringSoon, healthy, summary } = data || { 
    expired: [], 
    expiringSoon: [], 
    healthy: [], 
    summary: { totalDocs: 0, expiredCount: 0, expiringSoonCount: 0, healthyCount: 0 } 
  };

  const allDocuments = [...expired, ...expiringSoon, ...healthy];
  
  const truckDocs = allDocuments.filter(d => documentCategories.truck.includes(d.documentType));
  const driverDocs = allDocuments.filter(d => documentCategories.driver.includes(d.documentType));
  const tripDocs = allDocuments.filter(d => documentCategories.trip.includes(d.documentType));

  const renderDocument = (doc: Document) => {
    const daysUntilExpiry = doc.expiryDate 
      ? differenceInDays(new Date(doc.expiryDate), new Date()) 
      : null;
    
    const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
    const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 30;

    return (
      <div 
        key={doc.id}
        className={`p-4 rounded-lg border cursor-pointer hover-elevate ${
          isExpired 
            ? "border-red-200 bg-red-50 dark:bg-red-950/20" 
            : isExpiringSoon 
              ? "border-amber-200 bg-amber-50 dark:bg-amber-950/20"
              : ""
        }`}
        onClick={() => handlePreview(doc)}
        data-testid={`card-document-${doc.id}`}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {isExpired ? (
                <XCircle className="h-5 w-5 text-red-500" data-testid={`icon-expired-${doc.id}`} />
              ) : doc.isVerified ? (
                <CheckCircle className="h-5 w-5 text-green-500" data-testid={`icon-verified-${doc.id}`} />
              ) : (
                <Clock className="h-5 w-5 text-amber-500" data-testid={`icon-pending-${doc.id}`} />
              )}
            </div>
            <div>
              <p className="font-medium" data-testid={`text-doc-type-${doc.id}`}>
                {documentTypeLabels[doc.documentType] || doc.documentType}
              </p>
              <p className="text-sm text-muted-foreground" data-testid={`text-doc-filename-${doc.id}`}>{doc.fileName}</p>
              {doc.fileSize && (
                <p className="text-xs text-muted-foreground">{formatFileSize(doc.fileSize)}</p>
              )}
              {doc.expiryDate && (
                <p 
                  className={`text-sm mt-1 flex items-center gap-1 ${
                    isExpired 
                      ? "text-red-600" 
                      : isExpiringSoon 
                        ? "text-amber-600"
                        : "text-muted-foreground"
                  }`}
                  data-testid={`text-doc-expiry-${doc.id}`}
                >
                  <Calendar className="h-3 w-3" />
                  {isExpired 
                    ? `Expired ${Math.abs(daysUntilExpiry!)} days ago`
                    : `Expires ${format(new Date(doc.expiryDate), "dd MMM yyyy")}`}
                  {isExpiringSoon && !isExpired && ` (${daysUntilExpiry} days left)`}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isExpired && (
              <Badge variant="destructive" data-testid={`badge-expired-${doc.id}`}>Expired</Badge>
            )}
            {isExpiringSoon && !isExpired && (
              <Badge className="bg-amber-500 text-white no-default-hover-elevate no-default-active-elevate" data-testid={`badge-expiring-${doc.id}`}>Expiring Soon</Badge>
            )}
            {!isExpired && !isExpiringSoon && doc.isVerified && (
              <Badge variant="default" data-testid={`badge-verified-${doc.id}`}>Verified</Badge>
            )}
            {!doc.isVerified && !isExpired && (
              <Badge variant="secondary" data-testid={`badge-pending-${doc.id}`}>Pending</Badge>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => {
                e.stopPropagation();
                window.open(doc.fileUrl, "_blank");
              }}
              data-testid={`button-download-${doc.id}`}
            >
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderDocumentList = (docs: Document[], emptyMessage: string) => (
    docs.length === 0 ? (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>{emptyMessage}</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => setUploadDialogOpen(true)}
          data-testid="button-upload-empty-state"
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>
    ) : (
      <div className="space-y-3">
        {docs.map(renderDocument)}
      </div>
    )
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">My Documents</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => generateSamplesMutation.mutate()}
            disabled={generateSamplesMutation.isPending}
            data-testid="button-generate-samples"
          >
            {generateSamplesMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Generate AI Samples
          </Button>
          <Button onClick={() => setUploadDialogOpen(true)} data-testid="button-upload-document">
            <Upload className="h-4 w-4 mr-2" />
            Upload Document
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-docs">{summary.totalDocs}</p>
                <p className="text-sm text-muted-foreground">Total Documents</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={summary.expiredCount > 0 ? "border-red-200 bg-red-50 dark:bg-red-950/20" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-300" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-expired-count">{summary.expiredCount}</p>
                <p className="text-sm text-muted-foreground">Expired</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={summary.expiringSoonCount > 0 ? "border-amber-200 bg-amber-50 dark:bg-amber-950/20" : ""}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-300" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-expiring-soon-count">{summary.expiringSoonCount}</p>
                <p className="text-sm text-muted-foreground">Expiring Soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-300" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-healthy-count">{summary.healthyCount}</p>
                <p className="text-sm text-muted-foreground">Valid</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {(summary.expiredCount > 0 || summary.expiringSoonCount > 0) && (
        <Alert variant={summary.expiredCount > 0 ? "destructive" : "default"} className={summary.expiredCount === 0 ? "border-amber-500 bg-amber-50 dark:bg-amber-950" : ""}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {summary.expiredCount > 0 ? "Action Required: Documents Expired" : "Warning: Documents Expiring Soon"}
          </AlertTitle>
          <AlertDescription>
            {summary.expiredCount > 0 && `${summary.expiredCount} document(s) have expired and need immediate renewal. `}
            {summary.expiringSoonCount > 0 && `${summary.expiringSoonCount} document(s) will expire within 30 days.`}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all" data-testid="tab-all">All ({allDocuments.length})</TabsTrigger>
          <TabsTrigger value="truck" data-testid="tab-truck">Truck ({truckDocs.length})</TabsTrigger>
          <TabsTrigger value="driver" data-testid="tab-driver">Driver ({driverDocs.length})</TabsTrigger>
          <TabsTrigger value="trip" data-testid="tab-trip">Trip ({tripDocs.length})</TabsTrigger>
          <TabsTrigger value="alerts" data-testid="tab-alerts">
            Alerts ({expired.length + expiringSoon.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>All Documents</CardTitle>
              <CardDescription>View all your uploaded documents</CardDescription>
            </CardHeader>
            <CardContent>
              {renderDocumentList(allDocuments, "No documents uploaded yet")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="truck" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Truck Documents</CardTitle>
              <CardDescription>RC, Insurance, Fitness, PUC, and Permits</CardDescription>
            </CardHeader>
            <CardContent>
              {renderDocumentList(truckDocs, "No truck documents uploaded")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="driver" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Driver Documents</CardTitle>
              <CardDescription>License, PAN Card, and Aadhar</CardDescription>
            </CardHeader>
            <CardContent>
              {renderDocumentList(driverDocs, "No driver documents uploaded")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trip" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Trip Documents</CardTitle>
              <CardDescription>PODs and Invoices from completed trips</CardDescription>
            </CardHeader>
            <CardContent>
              {renderDocumentList(tripDocs, "No trip documents uploaded")}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-5 w-5" />
                Documents Requiring Attention
              </CardTitle>
              <CardDescription>Expired or expiring documents</CardDescription>
            </CardHeader>
            <CardContent>
              {expired.length === 0 && expiringSoon.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                  <p className="font-medium">All documents are valid!</p>
                  <p className="text-sm text-muted-foreground">No documents require attention at this time</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {[...expired, ...expiringSoon].map(renderDocument)}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload your compliance documents. Supported formats: PDF, JPG, PNG
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Document Type</Label>
              <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                <SelectTrigger data-testid="select-document-type">
                  <SelectValue placeholder="Select document type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="license">Driving License</SelectItem>
                  <SelectItem value="rc">Registration Certificate (RC)</SelectItem>
                  <SelectItem value="insurance">Vehicle Insurance</SelectItem>
                  <SelectItem value="fitness">Fitness Certificate</SelectItem>
                  <SelectItem value="permit">Road Permit</SelectItem>
                  <SelectItem value="puc">PUC Certificate</SelectItem>
                  <SelectItem value="pan_card">PAN Card</SelectItem>
                  <SelectItem value="aadhar">Aadhar Card</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>File</Label>
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                {selectedFile ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <File className="h-4 w-4" />
                      <span className="text-sm">{selectedFile.name}</span>
                      <span className="text-xs text-muted-foreground">({formatFileSize(selectedFile.size)})</span>
                    </div>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      onClick={() => setSelectedFile(null)}
                      data-testid="button-remove-file"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer">
                    <div className="flex flex-col items-center gap-2">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Click to browse or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground">
                        PDF, JPG, or PNG up to 10MB
                      </p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      data-testid="input-file-upload"
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Expiry Date (Optional)</Label>
              <Input 
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                data-testid="input-expiry-date"
              />
              <p className="text-xs text-muted-foreground">
                Set an expiry date to receive alerts before renewal is needed
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setUploadDialogOpen(false);
                resetUploadForm();
              }}
              data-testid="button-cancel-upload"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={!selectedDocType || !selectedFile || uploadMutation.isPending}
              data-testid="button-confirm-upload"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          {selectedDocument && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle>
                      {documentTypeLabels[selectedDocument.documentType] || selectedDocument.documentType}
                    </DialogTitle>
                    <DialogDescription>
                      {selectedDocument.fileName}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="py-4">
                <div className="aspect-[4/3] rounded-lg bg-muted flex items-center justify-center mb-4">
                  <div className="text-center text-muted-foreground">
                    <FileText className="h-16 w-16 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Document Preview</p>
                    <p className="text-xs">{selectedDocument.fileName}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">File Size</p>
                    <p className="font-medium">{formatFileSize(selectedDocument.fileSize)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <div className="mt-1">
                      {selectedDocument.isVerified ? (
                        <Badge variant="default">Verified</Badge>
                      ) : (
                        <Badge variant="secondary">Pending Review</Badge>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Uploaded</p>
                    <p className="font-medium">
                      {selectedDocument.createdAt ? format(new Date(selectedDocument.createdAt), "dd MMM yyyy") : "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Expiry Date</p>
                    <p className="font-medium">
                      {selectedDocument.expiryDate 
                        ? format(new Date(selectedDocument.expiryDate), "dd MMM yyyy")
                        : "No expiry date"}
                    </p>
                  </div>
                </div>
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button 
                  variant="destructive" 
                  onClick={() => handleDelete(selectedDocument.id)}
                  disabled={deleteMutation.isPending}
                  data-testid="button-delete-document"
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Delete
                </Button>
                <div className="flex-1" />
                <Button 
                  variant="outline"
                  onClick={() => window.open(selectedDocument.fileUrl, "_blank")}
                  data-testid="button-download-document"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.open(selectedDocument.fileUrl, "_blank")}
                  data-testid="button-view-document"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Full
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
