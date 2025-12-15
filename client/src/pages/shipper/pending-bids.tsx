import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Shield,
  Clock,
  Truck,
  CheckCircle2,
  Info,
  FileText,
  Users,
} from "lucide-react";

export default function PendingBidsPage() {
  const workflowSteps = [
    {
      icon: FileText,
      title: "Post Your Load",
      description: "Submit your freight details including pickup, delivery, weight, and dimensions.",
      status: "You control",
    },
    {
      icon: Shield,
      title: "Admin Review & Pricing",
      description: "Our logistics experts review your load and set competitive market pricing.",
      status: "We handle",
    },
    {
      icon: Users,
      title: "Carrier Bidding",
      description: "Verified carriers review and bid on your load at the admin-set price or negotiate.",
      status: "We handle",
    },
    {
      icon: CheckCircle2,
      title: "Carrier Selection",
      description: "Our team selects the best carrier based on reliability, price, and service quality.",
      status: "We handle",
    },
    {
      icon: Truck,
      title: "Load Assignment",
      description: "You're notified when a carrier is assigned and can track your shipment.",
      status: "You're notified",
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Link href="/shipper">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">How Pricing Works</h1>
          <p className="text-muted-foreground">Understanding our Admin-as-Mediator pricing model</p>
        </div>
      </div>

      <Card className="border-primary/20 bg-primary/5 dark:bg-primary/10">
        <CardContent className="flex items-start gap-4 pt-6">
          <Info className="h-6 w-6 text-primary shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-foreground mb-1">Admin-Managed Pricing</h3>
            <p className="text-muted-foreground">
              FreightFlow uses an admin-as-mediator model to ensure fair, competitive pricing and 
              reliable carrier selection. Our logistics experts handle bid evaluation and carrier 
              selection so you can focus on your business.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        <h2 className="text-lg font-semibold">How It Works</h2>
        <div className="space-y-4">
          {workflowSteps.map((step, index) => (
            <Card key={index} data-testid={`card-workflow-step-${index + 1}`}>
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10 shrink-0">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium">{step.title}</h3>
                    <Badge variant="outline" className="text-xs">
                      {step.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                </div>
                <div className="text-2xl font-bold text-muted-foreground/30 shrink-0">
                  {index + 1}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Track Your Loads
          </CardTitle>
          <CardDescription>
            View the status of all your loads and see when carriers are assigned
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Once you post a load, you can track its progress through the review and assignment 
            process. When a carrier is assigned, you'll receive a notification and can view 
            carrier details and track the shipment in real-time.
          </p>
          <div className="flex gap-2 flex-wrap">
            <Link href="/shipper/loads">
              <Button data-testid="button-view-loads">
                <Truck className="h-4 w-4 mr-2" />
                View My Loads
              </Button>
            </Link>
            <Link href="/shipper/post-load">
              <Button variant="outline" data-testid="button-post-load">
                Post New Load
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Benefits of Admin-Managed Pricing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium">Fair Market Pricing</span>
                <p className="text-sm text-muted-foreground">Our experts ensure you get competitive rates based on current market conditions.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium">Verified Carriers Only</span>
                <p className="text-sm text-muted-foreground">All carriers are pre-screened for reliability, insurance, and safety compliance.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium">Time Savings</span>
                <p className="text-sm text-muted-foreground">Focus on your business while we handle carrier selection and negotiations.</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-medium">Transparent Process</span>
                <p className="text-sm text-muted-foreground">Track your load status and see carrier details once assigned.</p>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
