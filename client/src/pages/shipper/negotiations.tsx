import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Shield,
  MessageSquare,
  FileText,
  Users,
  CheckCircle2,
  Truck,
  Info,
  Mail,
} from "lucide-react";

export default function NegotiationsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Link href="/shipper">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Carrier Negotiations</h1>
          <p className="text-muted-foreground">How carrier selection works on FreightFlow</p>
        </div>
      </div>

      <Card className="border-primary/20 bg-primary/5 dark:bg-primary/10">
        <CardContent className="flex items-start gap-4 pt-6">
          <Shield className="h-6 w-6 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-foreground mb-1">Admin-Managed Negotiations</h3>
            <p className="text-muted-foreground">
              FreightFlow handles all carrier negotiations on your behalf. Our logistics experts 
              evaluate bids, negotiate pricing, and select the most reliable carriers for your 
              freight to ensure the best service at competitive rates.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Why Admin-Managed?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium">Expert Evaluation</span>
                <p className="text-sm text-muted-foreground">Our team evaluates carrier reliability, safety records, and pricing history.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium">Better Rates</span>
                <p className="text-sm text-muted-foreground">We leverage volume and relationships to negotiate competitive pricing.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium">Risk Mitigation</span>
                <p className="text-sm text-muted-foreground">All carriers are verified for insurance, safety compliance, and performance.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium">Time Savings</span>
                <p className="text-sm text-muted-foreground">Focus on your business while we handle carrier selection and negotiations.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              The Process
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">
                1
              </div>
              <div>
                <span className="font-medium">Carriers Submit Bids</span>
                <p className="text-sm text-muted-foreground">Verified carriers review your load and submit their offers.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">
                2
              </div>
              <div>
                <span className="font-medium">Admin Reviews Bids</span>
                <p className="text-sm text-muted-foreground">Our team evaluates each bid for price, reliability, and service quality.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">
                3
              </div>
              <div>
                <span className="font-medium">Negotiations (If Needed)</span>
                <p className="text-sm text-muted-foreground">We negotiate with carriers to get you the best possible deal.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary font-semibold text-sm shrink-0">
                4
              </div>
              <div>
                <span className="font-medium">Carrier Assigned</span>
                <p className="text-sm text-muted-foreground">You're notified when the best carrier is selected and assigned.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Need Special Requirements?
          </CardTitle>
          <CardDescription>
            Contact our team if you have specific carrier preferences or special handling requirements
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            If your freight has special requirements or you need to specify certain carrier attributes, 
            you can include these details when posting your load. Our team will factor these into the 
            carrier selection process.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Link href="/shipper/post-load">
              <Button data-testid="button-post-load">
                <FileText className="h-4 w-4 mr-2" />
                Post a Load
              </Button>
            </Link>
            <Link href="/shipper/loads">
              <Button variant="outline" data-testid="button-view-loads">
                <Truck className="h-4 w-4 mr-2" />
                View My Loads
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
