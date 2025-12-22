import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Truck, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Calendar,
  MapPin,
  Package,
  Clock,
  Upload,
  Plus
} from "lucide-react";
import { useLocation } from "wouter";
import { format, differenceInDays } from "date-fns";

interface DocumentAlert {
  documentId: string;
  documentType: string;
  fileName: string;
  expiryDate: string | null;
  daysUntilExpiry: number | null;
  isExpired: boolean;
}

interface TruckData {
  id: string;
  licensePlate: string;
  truckType: string;
  capacity: number;
  capacityUnit: string;
  isAvailable: boolean;
  currentLocation: string | null;
}

interface TruckDocument {
  id: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  expiryDate: string | null;
  isVerified: boolean;
}

const documentTypeLabels: Record<string, string> = {
  rc: "Registration Certificate (RC)",
  insurance: "Vehicle Insurance",
  fitness: "Fitness Certificate",
  license: "Driving License",
  puc: "PUC Certificate",
  permit: "Road Permit",
  other: "Other Document",
};

const getExpiryBadge = (expiryDate: string | null) => {
  if (!expiryDate) return null;
  
  const days = differenceInDays(new Date(expiryDate), new Date());
  
  if (days < 0) {
    return <Badge variant="destructive">Expired</Badge>;
  } else if (days <= 7) {
    return <Badge variant="destructive">Expires in {days} days</Badge>;
  } else if (days <= 30) {
    return <Badge className="bg-amber-500 text-white">Expires in {days} days</Badge>;
  } else {
    return <Badge variant="secondary">Valid until {format(new Date(expiryDate), "dd MMM yyyy")}</Badge>;
  }
};

export default function MyTruckPage() {
  const { user, carrierType } = useAuth();
  const [, navigate] = useLocation();

  const { data, isLoading, error } = useQuery<{
    truck: TruckData | null;
    documents: TruckDocument[];
    documentAlerts: DocumentAlert[];
  }>({
    queryKey: ["/api/carrier/solo/truck"],
    enabled: !!user && user.role === "carrier" && carrierType === "solo",
  });

  if (carrierType === undefined) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-48" data-testid="skeleton-title" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64" data-testid="skeleton-card-1" />
          <Skeleton className="h-64" data-testid="skeleton-card-2" />
        </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64" data-testid="skeleton-card-1" />
          <Skeleton className="h-64" data-testid="skeleton-card-2" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive" data-testid="alert-error">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>Failed to load truck information. Please try again.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const { truck, documents, documentAlerts } = data || { truck: null, documents: [], documentAlerts: [] };

  if (!truck) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">My Truck</h1>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Truck className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Truck Registered</h3>
            <p className="text-muted-foreground text-center mb-4">
              Register your truck to start accepting loads
            </p>
            <Button onClick={() => navigate("/carrier/add-truck")} data-testid="button-add-truck">
              <Plus className="h-4 w-4 mr-2" />
              Add Your Truck
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const expiredCount = documentAlerts.filter(a => a.isExpired).length;
  const expiringSoonCount = documentAlerts.filter(a => !a.isExpired).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" data-testid="text-page-title">My Truck</h1>
        <Button variant="outline" onClick={() => navigate("/carrier/my-documents")} data-testid="button-manage-documents">
          <FileText className="h-4 w-4 mr-2" />
          Manage Documents
        </Button>
      </div>

      {(expiredCount > 0 || expiringSoonCount > 0) && (
        <Alert variant={expiredCount > 0 ? "destructive" : "default"} className={expiredCount === 0 ? "border-amber-500 bg-amber-50 dark:bg-amber-950" : ""}>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>
            {expiredCount > 0 ? "Documents Expired!" : "Documents Expiring Soon"}
          </AlertTitle>
          <AlertDescription>
            {expiredCount > 0 && `${expiredCount} document(s) have expired. `}
            {expiringSoonCount > 0 && `${expiringSoonCount} document(s) are expiring within 30 days.`}
            <Button 
              variant="ghost" 
              className="p-0 h-auto ml-2 underline" 
              onClick={() => navigate("/carrier/my-documents")}
              data-testid="link-view-alerts"
            >
              View details
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Vehicle Details
            </CardTitle>
            <CardDescription>Your registered truck information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">License Plate</p>
                <p className="font-semibold" data-testid="text-license-plate">{truck.licensePlate}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Truck Type</p>
                <p className="font-medium" data-testid="text-truck-type">{truck.truckType}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Capacity</p>
                <p className="font-medium" data-testid="text-capacity">{truck.capacity} {truck.capacityUnit}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={truck.isAvailable ? "default" : "secondary"} data-testid="badge-status">
                  {truck.isAvailable ? "Available" : "On Trip"}
                </Badge>
              </div>
            </div>
            {truck.currentLocation && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  Current Location
                </p>
                <p className="font-medium">{truck.currentLocation}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document Status
            </CardTitle>
            <CardDescription>Track your compliance documents</CardDescription>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="flex flex-col items-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground mb-4">No documents uploaded</p>
                <Button variant="outline" onClick={() => navigate("/carrier/my-documents")} data-testid="button-upload-docs">
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Documents
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map((doc) => (
                  <div 
                    key={doc.id} 
                    className="flex items-center justify-between p-3 rounded-lg border"
                    data-testid={`card-document-${doc.id}`}
                  >
                    <div className="flex items-center gap-3">
                      {doc.isVerified ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : (
                        <Clock className="h-5 w-5 text-amber-500" />
                      )}
                      <div>
                        <p className="font-medium text-sm">
                          {documentTypeLabels[doc.documentType] || doc.documentType}
                        </p>
                        <p className="text-xs text-muted-foreground">{doc.fileName}</p>
                      </div>
                    </div>
                    {getExpiryBadge(doc.expiryDate)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {documentAlerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Document Alerts
            </CardTitle>
            <CardDescription>Documents requiring attention</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {documentAlerts.map((alert) => (
                <div 
                  key={alert.documentId}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    alert.isExpired ? "border-red-200 bg-red-50 dark:bg-red-950/20" : "border-amber-200 bg-amber-50 dark:bg-amber-950/20"
                  }`}
                  data-testid={`alert-document-${alert.documentId}`}
                >
                  <div className="flex items-center gap-3">
                    {alert.isExpired ? (
                      <XCircle className="h-5 w-5 text-red-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-amber-500" />
                    )}
                    <div>
                      <p className="font-medium">
                        {documentTypeLabels[alert.documentType] || alert.documentType}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {alert.isExpired 
                          ? `Expired ${Math.abs(alert.daysUntilExpiry || 0)} days ago` 
                          : `Expires in ${alert.daysUntilExpiry} days`}
                      </p>
                    </div>
                  </div>
                  <Button 
                    variant={alert.isExpired ? "destructive" : "outline"}
                    size="sm"
                    onClick={() => navigate("/carrier/my-documents")}
                    data-testid={`button-renew-${alert.documentId}`}
                  >
                    {alert.isExpired ? "Renew Now" : "Update"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
