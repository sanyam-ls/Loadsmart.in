import { useState } from "react";
import { FileText, Upload, Search, Filter, Download, Eye, Trash2, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/empty-state";

interface Document {
  id: string;
  name: string;
  type: string;
  loadId?: string;
  size: string;
  uploadedAt: Date;
  expiryDate?: Date;
  isVerified: boolean;
}

const mockDocuments: Document[] = [
  {
    id: "d1",
    name: "Bill_of_Lading_1234.pdf",
    type: "pod",
    loadId: "1234",
    size: "245 KB",
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2),
    isVerified: true,
  },
  {
    id: "d2",
    name: "Invoice_March_2024.pdf",
    type: "invoice",
    size: "128 KB",
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
    isVerified: true,
  },
  {
    id: "d3",
    name: "Insurance_Certificate.pdf",
    type: "insurance",
    size: "512 KB",
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30),
    expiryDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10),
    isVerified: true,
  },
  {
    id: "d4",
    name: "POD_Load_1235.pdf",
    type: "pod",
    loadId: "1235",
    size: "198 KB",
    uploadedAt: new Date(Date.now() - 1000 * 60 * 60 * 24),
    isVerified: false,
  },
];

const documentTypeLabels: Record<string, string> = {
  pod: "Proof of Delivery",
  invoice: "Invoice",
  insurance: "Insurance",
  rc: "Registration Certificate",
  fitness: "Fitness Certificate",
  license: "License",
  other: "Other",
};

function isExpiringSoon(date?: Date): boolean {
  if (!date) return false;
  const daysUntilExpiry = (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
}

function isExpired(date?: Date): boolean {
  if (!date) return false;
  return date.getTime() < Date.now();
}

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

  const filteredDocuments = mockDocuments.filter((doc) => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || doc.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const expiringDocs = mockDocuments.filter((d) => isExpiringSoon(d.expiryDate));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-muted-foreground">Manage your shipment documents and compliance files.</p>
        </div>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-upload-document">
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Document</DialogTitle>
              <DialogDescription>
                Upload a new document to your vault. Supported formats: PDF, JPG, PNG.
              </DialogDescription>
            </DialogHeader>
            <div className="py-6">
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover-elevate cursor-pointer">
                <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm font-medium mb-1">Click to upload or drag and drop</p>
                <p className="text-xs text-muted-foreground">PDF, JPG, or PNG up to 10MB</p>
              </div>
              <div className="mt-4">
                <Select>
                  <SelectTrigger data-testid="select-document-type">
                    <SelectValue placeholder="Select document type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pod">Proof of Delivery</SelectItem>
                    <SelectItem value="invoice">Invoice</SelectItem>
                    <SelectItem value="insurance">Insurance</SelectItem>
                    <SelectItem value="rc">Registration Certificate</SelectItem>
                    <SelectItem value="fitness">Fitness Certificate</SelectItem>
                    <SelectItem value="license">License</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                Cancel
              </Button>
              <Button data-testid="button-confirm-upload">Upload</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {expiringDocs.length > 0 && (
        <Card className="mb-6 border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  {expiringDocs.length} document{expiringDocs.length !== 1 ? "s" : ""} expiring soon
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Review and renew your documents to avoid service interruptions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-documents"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-48" data-testid="select-type-filter">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Document type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="pod">Proof of Delivery</SelectItem>
            <SelectItem value="invoice">Invoice</SelectItem>
            <SelectItem value="insurance">Insurance</SelectItem>
            <SelectItem value="rc">Registration Certificate</SelectItem>
            <SelectItem value="fitness">Fitness Certificate</SelectItem>
            <SelectItem value="license">License</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredDocuments.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents found"
          description="Upload your first document to get started. You can store PODs, invoices, insurance certificates, and more."
          actionLabel="Upload Document"
          onAction={() => setUploadDialogOpen(true)}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((doc) => (
            <Card key={doc.id} className="hover-elevate" data-testid={`document-card-${doc.id}`}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary flex-shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{doc.size}</p>
                  </div>
                  {doc.isVerified ? (
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Type</span>
                    <Badge variant="secondary">
                      {documentTypeLabels[doc.type] || doc.type}
                    </Badge>
                  </div>
                  {doc.loadId && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Load</span>
                      <span className="font-medium">#{doc.loadId}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Uploaded</span>
                    <span>{doc.uploadedAt.toLocaleDateString()}</span>
                  </div>
                  {doc.expiryDate && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Expires</span>
                      <Badge
                        variant={isExpired(doc.expiryDate) ? "destructive" : isExpiringSoon(doc.expiryDate) ? "default" : "secondary"}
                        className={isExpiringSoon(doc.expiryDate) && !isExpired(doc.expiryDate) 
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 no-default-hover-elevate no-default-active-elevate" 
                          : "no-default-hover-elevate no-default-active-elevate"
                        }
                      >
                        {isExpired(doc.expiryDate) ? "Expired" : doc.expiryDate.toLocaleDateString()}
                      </Badge>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1" data-testid={`button-view-${doc.id}`}>
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" data-testid={`button-download-${doc.id}`}>
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                  <Button variant="ghost" size="icon" data-testid={`button-delete-${doc.id}`}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
