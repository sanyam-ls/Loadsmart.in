import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Upload,
  Calendar,
  Download
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface Document {
  id: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
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

export default function MyDocumentsPage() {
  const { user, carrierType } = useAuth();

  const { data, isLoading, error } = useQuery<ExpiryData>({
    queryKey: ["/api/carrier/documents/expiring"],
    enabled: !!user && user.role === "carrier" && carrierType === "solo",
  });

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

  if (carrierType !== "solo") {
    return (
      <div className="p-6">
        <Alert data-testid="alert-access-restricted">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Access Restricted</AlertTitle>
          <AlertDescription>This page is only available for solo carriers.</AlertDescription>
        </Alert>
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
  const otherDocs = allDocuments.filter(d => 
    !documentCategories.truck.includes(d.documentType) && 
    !documentCategories.driver.includes(d.documentType) && 
    !documentCategories.trip.includes(d.documentType)
  );

  const renderDocument = (doc: Document) => {
    const daysUntilExpiry = doc.expiryDate 
      ? differenceInDays(new Date(doc.expiryDate), new Date()) 
      : null;
    
    const isExpired = daysUntilExpiry !== null && daysUntilExpiry < 0;
    const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry >= 0 && daysUntilExpiry <= 30;

    return (
      <div 
        key={doc.id}
        className={`p-4 rounded-lg border ${
          isExpired 
            ? "border-red-200 bg-red-50 dark:bg-red-950/20" 
            : isExpiringSoon 
              ? "border-amber-200 bg-amber-50 dark:bg-amber-950/20"
              : ""
        }`}
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
              <Badge className="bg-amber-500 text-white" data-testid={`badge-expiring-${doc.id}`}>Expiring Soon</Badge>
            )}
            {!isExpired && !isExpiringSoon && doc.isVerified && (
              <Badge variant="default" data-testid={`badge-verified-${doc.id}`}>Verified</Badge>
            )}
            {!doc.isVerified && !isExpired && (
              <Badge variant="secondary" data-testid={`badge-pending-${doc.id}`}>Pending</Badge>
            )}
            <Button variant="ghost" size="icon" asChild data-testid={`button-download-${doc.id}`}>
              <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4" />
              </a>
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
      </div>
    ) : (
      <div className="space-y-3">
        {docs.map(renderDocument)}
      </div>
    )
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">My Documents</h1>
        <Button data-testid="button-upload-document">
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
    </div>
  );
}
