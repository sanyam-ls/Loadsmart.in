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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  File,
  X,
  Loader2,
  FolderOpen,
  Folder,
  ChevronRight,
  ChevronDown,
  Truck,
  User,
  Package
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

interface ShipmentDocument {
  id: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  status: string;
  createdAt: string;
}

interface ShipmentWithDocs {
  id: string;
  loadNumber: number;
  status: string;
  documents: ShipmentDocument[];
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
  aadhaar: "Aadhaar Card",
  pod: "Proof of Delivery",
  invoice: "Invoice",
  lr_consignment: "LR/Consignment Note",
  eway_bill: "E-Way Bill",
  weighment_slip: "Weighment Slip",
  other: "Other Document",
};

const documentCategories = {
  truck: ["rc", "insurance", "fitness", "puc", "permit"],
  driver: ["license", "pan_card", "aadhar", "aadhaar"],
  trip: ["pod", "invoice", "lr_consignment", "eway_bill", "weighment_slip"],
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
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({
    truck: true,
    driver: false,
    loads: true,
  });
  const [expandedLoads, setExpandedLoads] = useState<Record<string, boolean>>({});
  const [expandedDrivers, setExpandedDrivers] = useState<Record<string, boolean>>({});

  const toggleDriver = (driverId: string) => {
    setExpandedDrivers(prev => ({ ...prev, [driverId]: !prev[driverId] }));
  };

  const { data, isLoading, error } = useQuery<ExpiryData>({
    queryKey: ["/api/carrier/documents/expiring"],
    enabled: !!user && user.role === "carrier",
    staleTime: 5000,
    refetchOnWindowFocus: true,
  });

  const { data: shipmentsData, refetch: refetchShipments } = useQuery<any[]>({
    queryKey: ["/api/shipments/tracking"],
    enabled: !!user && user.role === "carrier",
    staleTime: 2000,
    refetchInterval: 5000, // Poll every 5 seconds for real-time updates
    refetchOnWindowFocus: true,
  });

  // Fetch drivers to get their documents (license, aadhaar images)
  const { data: driversData } = useQuery<any[]>({
    queryKey: ["/api/drivers"],
    enabled: !!user && user.role === "carrier",
    staleTime: 5000,
    refetchOnWindowFocus: true,
  });

  // Fetch trucks to get their documents (RC, insurance, etc.)
  const { data: trucksData } = useQuery<any[]>({
    queryKey: ["/api/trucks"],
    enabled: !!user && user.role === "carrier",
    staleTime: 5000,
    refetchOnWindowFocus: true,
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

  const toggleFolder = (folder: string) => {
    setExpandedFolders(prev => ({ ...prev, [folder]: !prev[folder] }));
  };

  const toggleLoad = (loadId: string) => {
    setExpandedLoads(prev => ({ ...prev, [loadId]: !prev[loadId] }));
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
  
  // Convert driver documents (license, aadhaar images stored on driver records) to Document format
  const driverDocumentsFromDrivers: Document[] = [];
  (driversData || []).forEach((driver: any) => {
    if (driver.licenseImageUrl) {
      driverDocumentsFromDrivers.push({
        id: `driver-license-${driver.id}`,
        documentType: "license",
        fileName: `${driver.name} - Driving License`,
        fileUrl: driver.licenseImageUrl,
        fileSize: undefined,
        expiryDate: driver.licenseExpiry || null,
        isVerified: true,
        createdAt: driver.createdAt || new Date().toISOString(),
      });
    }
    if (driver.aadhaarImageUrl) {
      driverDocumentsFromDrivers.push({
        id: `driver-aadhaar-${driver.id}`,
        documentType: "aadhaar",
        fileName: `${driver.name} - Aadhaar Card${driver.aadhaarNumber ? ` (${driver.aadhaarNumber})` : ''}`,
        fileUrl: driver.aadhaarImageUrl,
        fileSize: undefined,
        expiryDate: null,
        isVerified: true,
        createdAt: driver.createdAt || new Date().toISOString(),
      });
    }
  });

  // Convert truck documents (RC, insurance, etc. stored on truck records) to Document format
  const truckDocumentsFromTrucks: Document[] = [];
  (trucksData || []).forEach((truck: any) => {
    if (truck.rcDocumentUrl) {
      truckDocumentsFromTrucks.push({
        id: `truck-rc-${truck.id}`,
        documentType: "rc",
        fileName: `${truck.registrationNumber} - Registration Certificate`,
        fileUrl: truck.rcDocumentUrl,
        fileSize: undefined,
        expiryDate: truck.rcExpiry || null,
        isVerified: true,
        createdAt: truck.createdAt || new Date().toISOString(),
      });
    }
    if (truck.insuranceDocumentUrl) {
      truckDocumentsFromTrucks.push({
        id: `truck-insurance-${truck.id}`,
        documentType: "insurance",
        fileName: `${truck.registrationNumber} - Insurance`,
        fileUrl: truck.insuranceDocumentUrl,
        fileSize: undefined,
        expiryDate: truck.insuranceExpiry || null,
        isVerified: true,
        createdAt: truck.createdAt || new Date().toISOString(),
      });
    }
    if (truck.fitnessDocumentUrl) {
      truckDocumentsFromTrucks.push({
        id: `truck-fitness-${truck.id}`,
        documentType: "fitness",
        fileName: `${truck.registrationNumber} - Fitness Certificate`,
        fileUrl: truck.fitnessDocumentUrl,
        fileSize: undefined,
        expiryDate: truck.fitnessExpiry || null,
        isVerified: true,
        createdAt: truck.createdAt || new Date().toISOString(),
      });
    }
    if (truck.permitDocumentUrl) {
      truckDocumentsFromTrucks.push({
        id: `truck-permit-${truck.id}`,
        documentType: "permit",
        fileName: `${truck.registrationNumber} - Permit`,
        fileUrl: truck.permitDocumentUrl,
        fileSize: undefined,
        expiryDate: truck.permitExpiry || null,
        isVerified: true,
        createdAt: truck.createdAt || new Date().toISOString(),
      });
    }
    if (truck.pucDocumentUrl) {
      truckDocumentsFromTrucks.push({
        id: `truck-puc-${truck.id}`,
        documentType: "puc",
        fileName: `${truck.registrationNumber} - PUC Certificate`,
        fileUrl: truck.pucDocumentUrl,
        fileSize: undefined,
        expiryDate: truck.pucExpiry || null,
        isVerified: true,
        createdAt: truck.createdAt || new Date().toISOString(),
      });
    }
  });

  // Merge documents from documents table with driver/truck documents
  const truckDocsFromTable = allDocuments.filter(d => documentCategories.truck.includes(d.documentType));
  const driverDocsFromTable = allDocuments.filter(d => documentCategories.driver.includes(d.documentType));
  
  const truckDocs = [...truckDocsFromTable, ...truckDocumentsFromTrucks];
  const driverDocs = [...driverDocsFromTable, ...driverDocumentsFromDrivers];
  const tripDocs = allDocuments.filter(d => documentCategories.trip.includes(d.documentType));

  // Get all carrier shipments - backend already filters by current carrier
  const carrierShipments = shipmentsData || [];

  // Group shipments by load number - show all loads, with or without documents
  const shipmentsByLoad: Record<number, ShipmentWithDocs> = {};
  carrierShipments.forEach((s: any) => {
    // Use shipperLoadNumber from the load object (this is the LD-XXX number)
    const loadNum = s.load?.shipperLoadNumber || s.load?.loadNumber || s.loadNumber;
    if (loadNum) {
      // Only add if not already exists, or if this one has more documents
      const existingDocs = shipmentsByLoad[loadNum]?.documents?.length || 0;
      const newDocs = s.documents?.length || 0;
      if (!shipmentsByLoad[loadNum] || newDocs > existingDocs) {
        shipmentsByLoad[loadNum] = {
          id: s.id,
          loadNumber: loadNum,
          status: s.status,
          documents: s.documents || [],
        };
      }
    }
  });

  const renderDocument = (doc: Document, compact = false) => {
    const daysUntilExpiry = doc.expiryDate 
      ? differenceInDays(new Date(doc.expiryDate), new Date()) 
      : null;
    
    const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
    const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 30;

    return (
      <div 
        key={doc.id}
        className={`p-3 rounded-lg border cursor-pointer hover-elevate ${
          isExpired 
            ? "border-red-200 bg-red-50 dark:bg-red-950/20" 
            : isExpiringSoon 
              ? "border-amber-200 bg-amber-50 dark:bg-amber-950/20"
              : ""
        }`}
        onClick={() => handlePreview(doc)}
        data-testid={`card-document-${doc.id}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="flex-shrink-0">
              {isExpired ? (
                <XCircle className="h-4 w-4 text-red-500" />
              ) : doc.isVerified ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <Clock className="h-4 w-4 text-amber-500" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">
                {documentTypeLabels[doc.documentType] || doc.documentType}
              </p>
              <p className="text-xs text-muted-foreground truncate">{doc.fileName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isExpired && (
              <Badge variant="destructive" className="text-xs">
                Expired {Math.abs(daysUntilExpiry!)} days ago
              </Badge>
            )}
            {isExpiringSoon && !isExpired && (
              <Badge className="bg-amber-500 text-white text-xs no-default-hover-elevate no-default-active-elevate">
                {daysUntilExpiry === 0 ? "Expires today" : `${daysUntilExpiry} days left`}
              </Badge>
            )}
            {!isExpired && !isExpiringSoon && doc.isVerified && (
              <Badge variant="default" className="text-xs">Verified</Badge>
            )}
            {!doc.isVerified && !isExpired && !isExpiringSoon && (
              <Badge variant="secondary" className="text-xs">Pending</Badge>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                window.open(doc.fileUrl, "_blank");
              }}
            >
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const renderShipmentDocument = (doc: ShipmentDocument) => {
    return (
      <div 
        key={doc.id}
        className="p-3 rounded-lg border cursor-pointer hover-elevate"
        onClick={() => {
          setSelectedDocument({
            id: doc.id,
            documentType: doc.documentType,
            fileName: doc.fileName,
            fileUrl: doc.fileUrl,
            fileSize: undefined,
            expiryDate: null,
            isVerified: doc.status === "approved",
            createdAt: doc.createdAt,
          });
          setPreviewDialogOpen(true);
        }}
        data-testid={`card-shipment-doc-${doc.id}`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm truncate">
                {documentTypeLabels[doc.documentType] || doc.documentType}
              </p>
              <p className="text-xs text-muted-foreground truncate">{doc.fileName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Badge 
              variant={doc.status === "approved" ? "default" : "secondary"} 
              className="text-xs capitalize"
            >
              {doc.status}
            </Badge>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                window.open(doc.fileUrl, "_blank");
              }}
            >
              <Download className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const FolderSection = ({ 
    title, 
    icon: Icon, 
    folderId, 
    documents, 
    emptyMessage 
  }: { 
    title: string; 
    icon: any; 
    folderId: string; 
    documents: Document[]; 
    emptyMessage: string;
  }) => {
    // Count expiring and expired documents in this folder
    const expiringCount = documents.filter(d => {
      if (!d.expiryDate) return false;
      const days = differenceInDays(new Date(d.expiryDate), new Date());
      return days >= 0 && days <= 30;
    }).length;
    const expiredCount = documents.filter(d => {
      if (!d.expiryDate) return false;
      return differenceInDays(new Date(d.expiryDate), new Date()) < 0;
    }).length;
    const hasAlerts = expiringCount > 0 || expiredCount > 0;

    return (
      <Collapsible 
        open={expandedFolders[folderId]} 
        onOpenChange={() => toggleFolder(folderId)}
      >
        <CollapsibleTrigger className="w-full">
          <div className={`flex items-center gap-2 p-3 rounded-lg hover-elevate border bg-card ${
            expiredCount > 0 ? "border-red-300 dark:border-red-800" : 
            expiringCount > 0 ? "border-amber-300 dark:border-amber-700" : ""
          }`}>
            {expandedFolders[folderId] ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            {expandedFolders[folderId] ? (
              <FolderOpen className="h-5 w-5 text-amber-500" />
            ) : (
              <Folder className="h-5 w-5 text-amber-500" />
            )}
            <Icon className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{title}</span>
            {hasAlerts && (
              <div className="flex items-center gap-1">
                {expiredCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {expiredCount} expired
                  </Badge>
                )}
                {expiringCount > 0 && (
                  <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs">
                    {expiringCount} expiring
                  </Badge>
                )}
              </div>
            )}
            <Badge variant="secondary" className="ml-auto text-xs">
              {documents.length}
            </Badge>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-6 mt-2 space-y-2 border-l-2 border-muted pl-4">
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">{emptyMessage}</p>
            ) : (
              documents.map(doc => renderDocument(doc, true))
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  const LoadsFolderSection = () => {
    const loadNumbers = Object.keys(shipmentsByLoad).map(Number).sort((a, b) => b - a);
    const totalDocs = Object.values(shipmentsByLoad).reduce((sum, s) => sum + s.documents.length, 0);

    return (
      <Collapsible 
        open={expandedFolders.loads} 
        onOpenChange={() => toggleFolder("loads")}
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center gap-2 p-3 rounded-lg hover-elevate border bg-card">
            {expandedFolders.loads ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            {expandedFolders.loads ? (
              <FolderOpen className="h-5 w-5 text-blue-500" />
            ) : (
              <Folder className="h-5 w-5 text-blue-500" />
            )}
            <Package className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Loads</span>
            <Badge variant="secondary" className="ml-auto text-xs">
              {totalDocs} docs in {loadNumbers.length} loads
            </Badge>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-6 mt-2 space-y-2 border-l-2 border-muted pl-4">
            {loadNumbers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No load documents yet</p>
            ) : (
              loadNumbers.map(loadNum => {
                const shipment = shipmentsByLoad[loadNum];
                const isExpanded = expandedLoads[`load-${loadNum}`];
                return (
                  <Collapsible 
                    key={loadNum}
                    open={isExpanded}
                    onOpenChange={() => toggleLoad(`load-${loadNum}`)}
                  >
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center gap-2 p-2 rounded-lg hover-elevate border bg-muted/50">
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        )}
                        {isExpanded ? (
                          <FolderOpen className="h-4 w-4 text-primary" />
                        ) : (
                          <Folder className="h-4 w-4 text-primary" />
                        )}
                        <span className="font-medium text-sm">LD-{String(loadNum).padStart(3, '0')}</span>
                        <Badge variant="outline" className="text-xs ml-2 capitalize">
                          {shipment.status.replace(/_/g, ' ')}
                        </Badge>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {shipment.documents.length} {shipment.documents.length === 1 ? 'doc' : 'docs'}
                        </Badge>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ml-6 mt-2 space-y-2 border-l border-muted pl-3">
                        {shipment.documents.length === 0 ? (
                          <p className="text-sm text-muted-foreground py-2">No documents uploaded yet</p>
                        ) : (
                          shipment.documents.map(doc => renderShipmentDocument(doc))
                        )}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  // Group driver documents by driver name for hierarchical display
  const driverDocumentsByName: Record<string, { driverId: string; documents: Document[] }> = {};
  (driversData || []).forEach((driver: any) => {
    const driverDocs: Document[] = [];
    if (driver.licenseImageUrl) {
      driverDocs.push({
        id: `driver-license-${driver.id}`,
        documentType: "license",
        fileName: "Driving License",
        fileUrl: driver.licenseImageUrl,
        fileSize: undefined,
        expiryDate: driver.licenseExpiry || null,
        isVerified: true,
        createdAt: driver.createdAt || new Date().toISOString(),
      });
    }
    if (driver.aadhaarImageUrl) {
      driverDocs.push({
        id: `driver-aadhaar-${driver.id}`,
        documentType: "aadhaar",
        fileName: `Aadhaar Card${driver.aadhaarNumber ? ` (${driver.aadhaarNumber})` : ''}`,
        fileUrl: driver.aadhaarImageUrl,
        fileSize: undefined,
        expiryDate: null,
        isVerified: true,
        createdAt: driver.createdAt || new Date().toISOString(),
      });
    }
    if (driverDocs.length > 0) {
      driverDocumentsByName[driver.name] = {
        driverId: driver.id,
        documents: driverDocs
      };
    }
  });

  const DriverFolderSection = () => {
    const driverNames = Object.keys(driverDocumentsByName).sort();
    const totalDriverDocs = Object.values(driverDocumentsByName).reduce(
      (sum, d) => sum + d.documents.length, 0
    );

    return (
      <Collapsible 
        open={expandedFolders.driver} 
        onOpenChange={() => toggleFolder("driver")}
      >
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center gap-2 p-3 rounded-lg hover-elevate border bg-card">
            {expandedFolders.driver ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            {expandedFolders.driver ? (
              <FolderOpen className="h-5 w-5 text-amber-500" />
            ) : (
              <Folder className="h-5 w-5 text-amber-500" />
            )}
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">Driver Documents</span>
            <Badge variant="secondary" className="ml-auto text-xs">
              {totalDriverDocs}
            </Badge>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-6 mt-2 space-y-2 border-l-2 border-muted pl-4">
            {driverNames.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">No driver documents uploaded</p>
            ) : (
              driverNames.map(driverName => {
                const driverData = driverDocumentsByName[driverName];
                const isExpanded = expandedDrivers[`driver-${driverData.driverId}`];
                return (
                  <Collapsible 
                    key={driverData.driverId}
                    open={isExpanded}
                    onOpenChange={() => toggleDriver(`driver-${driverData.driverId}`)}
                  >
                    <CollapsibleTrigger className="w-full">
                      <div className="flex items-center gap-2 p-2 rounded-lg hover-elevate border bg-muted/50">
                        {isExpanded ? (
                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                        )}
                        {isExpanded ? (
                          <FolderOpen className="h-4 w-4 text-primary" />
                        ) : (
                          <Folder className="h-4 w-4 text-primary" />
                        )}
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium text-sm">{driverName}</span>
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {driverData.documents.length} {driverData.documents.length === 1 ? 'doc' : 'docs'}
                        </Badge>
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="ml-6 mt-2 space-y-2 border-l border-muted pl-3">
                        {driverData.documents.map(doc => (
                          <div
                            key={doc.id}
                            className="flex items-center gap-3 p-3 rounded-lg border bg-card hover-elevate"
                            data-testid={`doc-item-${doc.id}`}
                          >
                            <div className="flex-shrink-0">
                              <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                                <FileText className="h-5 w-5 text-muted-foreground" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500" />
                                <p className="font-medium truncate">{doc.fileName}</p>
                              </div>
                              <p className="text-sm text-muted-foreground truncate">
                                {driverName} - {doc.fileName}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="default" className="text-xs">
                                Verified
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (doc.fileUrl) {
                                    window.open(doc.fileUrl, '_blank');
                                  }
                                }}
                                data-testid={`button-download-${doc.id}`}
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
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
        {docs.map(doc => renderDocument(doc))}
      </div>
    )
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">My Documents</h1>
        <Button onClick={() => setUploadDialogOpen(true)} data-testid="button-upload-document">
          <Upload className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900">
                <FileText className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-docs">{summary.totalDocs + driverDocumentsFromDrivers.length + truckDocumentsFromTrucks.length}</p>
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
                <p className="text-2xl font-bold" data-testid="text-healthy-count">{summary.healthyCount + driverDocumentsFromDrivers.length + truckDocumentsFromTrucks.length}</p>
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
            {summary.expiredCount > 0 ? "Action Required: Documents Expired" : "Reminder: Documents Expiring Soon"}
          </AlertTitle>
          <AlertDescription className="space-y-2">
            <p>
              {summary.expiredCount > 0 && `${summary.expiredCount} document(s) have expired and need immediate renewal. `}
              {summary.expiringSoonCount > 0 && `${summary.expiringSoonCount} document(s) will expire within 30 days.`}
            </p>
            <p className="text-sm">
              Please upload updated versions of your truck and driver documents to maintain compliance and continue bidding on loads.
            </p>
            <Button 
              variant={summary.expiredCount > 0 ? "secondary" : "outline"}
              size="sm"
              className="mt-2"
              onClick={() => setUploadDialogOpen(true)}
              data-testid="button-upload-from-alert"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Updated Documents
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="folders" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="folders" data-testid="tab-folders">Folders</TabsTrigger>
          <TabsTrigger value="all" data-testid="tab-all">All ({allDocuments.length})</TabsTrigger>
          <TabsTrigger value="truck" data-testid="tab-truck">Truck ({truckDocs.length})</TabsTrigger>
          <TabsTrigger value="driver" data-testid="tab-driver">Driver ({driverDocs.length})</TabsTrigger>
          <TabsTrigger value="alerts" data-testid="tab-alerts">
            Alerts ({expired.length + expiringSoon.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="folders" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Folders</CardTitle>
              <CardDescription>Organize your documents by category</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-450px)]">
                <div className="space-y-3 pr-4">
                  <FolderSection 
                    title="Truck Documents"
                    icon={Truck}
                    folderId="truck"
                    documents={truckDocs}
                    emptyMessage="No truck documents uploaded"
                  />
                  <DriverFolderSection />
                  <LoadsFolderSection />
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>All Documents</CardTitle>
              <CardDescription>View all your uploaded documents</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[calc(100vh-450px)]">
                <div className="pr-4">
                  {renderDocumentList(allDocuments, "No documents uploaded yet")}
                </div>
              </ScrollArea>
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
              <ScrollArea className="h-[calc(100vh-450px)]">
                <div className="pr-4">
                  {renderDocumentList(truckDocs, "No truck documents uploaded")}
                </div>
              </ScrollArea>
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
              <ScrollArea className="h-[calc(100vh-450px)]">
                <div className="pr-4">
                  {renderDocumentList(driverDocs, "No driver documents uploaded")}
                </div>
              </ScrollArea>
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
              <ScrollArea className="h-[calc(100vh-450px)]">
                <div className="pr-4">
                  {expired.length === 0 && expiringSoon.length === 0 ? (
                    <div className="text-center py-8">
                      <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
                      <p className="font-medium">All documents are valid!</p>
                      <p className="text-sm text-muted-foreground">No documents require attention at this time</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {[...expired, ...expiringSoon].map(doc => renderDocument(doc))}
                    </div>
                  )}
                </div>
              </ScrollArea>
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
                <div className="aspect-[4/3] rounded-lg bg-muted flex items-center justify-center mb-4 overflow-hidden">
                  {selectedDocument.fileUrl?.includes("/assets/generated_images/") || 
                   selectedDocument.fileUrl?.endsWith(".png") || 
                   selectedDocument.fileUrl?.endsWith(".jpg") || 
                   selectedDocument.fileUrl?.endsWith(".jpeg") ||
                   selectedDocument.fileUrl?.startsWith("data:image/") ||
                   selectedDocument.fileUrl?.includes("/objects/") ? (
                    <img 
                      src={selectedDocument.fileUrl} 
                      alt={selectedDocument.fileName}
                      className="w-full h-full object-contain"
                      data-testid="img-document-preview"
                    />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      <FileText className="h-16 w-16 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Document Preview</p>
                      <p className="text-xs">{selectedDocument.fileName}</p>
                    </div>
                  )}
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
                  variant="outline"
                  onClick={() => window.open(selectedDocument.fileUrl, "_blank")}
                  data-testid="button-view-full"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Full Size
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => window.open(selectedDocument.fileUrl, "_blank")}
                  data-testid="button-download-preview"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
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
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
