import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Truck, Eye, EyeOff, ArrowRight, Phone, Shield, CheckCircle, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import type { UserRole } from "@shared/schema";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  role: z.enum(["shipper", "carrier", "admin"]),
  companyName: z.string().optional(),
  phone: z.string().optional(),
  carrierType: z.enum(["solo", "enterprise"]).optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => {
  if (data.role === "carrier") {
    return !!data.carrierType;
  }
  return true;
}, {
  message: "Carrier type is required for carriers",
  path: ["carrierType"],
}).refine((data) => {
  if (data.role === "carrier") {
    if (!data.phone || data.phone.trim() === "") {
      return false;
    }
    const phoneRegex = /^(\+91[\s-]?)?[6-9]\d{9}$/;
    return phoneRegex.test(data.phone.replace(/[\s-]/g, ""));
  }
  return true;
}, {
  message: "Valid Indian phone number is required for carriers (10 digits starting with 6-9)",
  path: ["phone"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [, navigate] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpId, setOtpId] = useState("");
  const [enteredOtp, setEnteredOtp] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const { login, register } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (otpCountdown > 0) {
      const timer = setTimeout(() => setOtpCountdown(otpCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCountdown]);

  const handleSendOtp = async () => {
    const phone = registerForm.getValues("phone");
    if (!phone || phone.trim() === "") {
      toast({ title: "Phone Required", description: "Please enter your phone number first.", variant: "destructive" });
      return;
    }

    const phoneRegex = /^(\+91[\s-]?)?[6-9]\d{9}$/;
    if (!phoneRegex.test(phone.replace(/[\s-]/g, ""))) {
      toast({ title: "Invalid Phone", description: "Please enter a valid Indian phone number.", variant: "destructive" });
      return;
    }

    setSendingOtp(true);
    try {
      const response = await fetch("/api/otp/registration/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setOtpSent(true);
        setOtpCountdown(60);
        setOtpCode(data.otpCode);
        setOtpId(data.otpId);
        toast({ 
          title: "OTP Sent!", 
          description: `Your verification code is: ${data.otpCode}. This code is displayed here for demo purposes.`,
          duration: 15000,
        });
      } else {
        toast({ title: "Failed to send OTP", description: data.error || "Please try again.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to send OTP. Please try again.", variant: "destructive" });
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpId || enteredOtp.length !== 6) {
      toast({ title: "Invalid OTP", description: "Please enter the 6-digit code.", variant: "destructive" });
      return;
    }

    setVerifyingOtp(true);
    try {
      const response = await fetch("/api/otp/registration/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otpId, otpCode: enteredOtp }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setOtpVerified(true);
        setVerifiedPhone(registerForm.getValues("phone"));
        toast({ title: "Phone Verified!", description: "Your phone number has been verified successfully." });
      } else {
        toast({ title: "Invalid OTP", description: data.error || "The code you entered doesn't match. Please try again.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to verify OTP. Please try again.", variant: "destructive" });
    } finally {
      setVerifyingOtp(false);
    }
  };

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "shipper",
      companyName: "",
      phone: "",
      carrierType: undefined,
    },
  });

  const selectedRole = registerForm.watch("role");
  const watchedPhone = registerForm.watch("phone");

  // Reset OTP verification state when phone number changes
  useEffect(() => {
    if (verifiedPhone && watchedPhone !== verifiedPhone) {
      setOtpVerified(false);
      setOtpSent(false);
      setOtpCode("");
      setOtpId("");
      setEnteredOtp("");
      setVerifiedPhone("");
    }
  }, [watchedPhone, verifiedPhone]);

  const handleLogin = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const success = await login(data.username, data.password);
      if (success) {
        toast({ title: "Welcome back!", description: "You've been logged in successfully." });
        navigate("/");
      } else {
        toast({ title: "Login failed", description: "Invalid username or password.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (data: RegisterFormData) => {
    // Carriers must verify their phone number before registration
    if (data.role === "carrier" && !otpVerified) {
      toast({ 
        title: "Phone Verification Required", 
        description: "Please verify your phone number with OTP before creating your account.", 
        variant: "destructive" 
      });
      return;
    }

    setIsLoading(true);
    try {
      const success = await register({
        username: data.username,
        email: data.email,
        password: data.password,
        role: data.role as UserRole,
        companyName: data.companyName,
        phone: data.phone,
        carrierType: data.carrierType,
        otpId: data.role === "carrier" ? otpId || undefined : undefined,
      });
      if (success) {
        toast({ title: "Account created!", description: "Welcome to FreightFlow." });
        navigate("/");
      } else {
        toast({ title: "Registration failed", description: "Username or email may already exist.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Check if carrier can register (must have verified phone)
  const canCarrierRegister = selectedRole !== "carrier" || otpVerified;

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/80" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-40 h-40 border-4 border-white rounded-full" />
          <div className="absolute bottom-32 right-20 w-60 h-60 border-4 border-white rounded-full" />
          <div className="absolute top-1/2 left-1/3 w-20 h-20 border-4 border-white rounded-full" />
        </div>
        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/20 backdrop-blur">
              <Truck className="h-6 w-6" />
            </div>
            <span className="text-2xl font-bold">FreightFlow</span>
          </div>
          <h1 className="text-4xl font-bold mb-4">
            Digital Freight Marketplace
          </h1>
          <p className="text-lg text-white/80 mb-8 max-w-md">
            Connect with trusted carriers, post loads, track shipments, and manage your logistics operations all in one platform.
          </p>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <ArrowRight className="h-4 w-4" />
              </div>
              <span>Real-time shipment tracking</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <ArrowRight className="h-4 w-4" />
              </div>
              <span>Competitive bidding marketplace</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
                <ArrowRight className="h-4 w-4" />
              </div>
              <span>Secure document management</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex justify-end p-4">
          <ThemeToggle />
        </div>
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4 lg:hidden">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Truck className="h-6 w-6" />
                </div>
              </div>
              <CardTitle className="text-2xl">Welcome to FreightFlow</CardTitle>
              <CardDescription>Sign in to your account or create a new one</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="login">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login" data-testid="tab-login">Sign In</TabsTrigger>
                  <TabsTrigger value="register" data-testid="tab-register">Register</TabsTrigger>
                </TabsList>

                <TabsContent value="login">
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
                      <FormField
                        control={loginForm.control}
                        name="username"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Username</FormLabel>
                            <FormControl>
                              <Input placeholder="Enter your username" {...field} data-testid="input-login-username" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={loginForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showPassword ? "text" : "password"}
                                  placeholder="Enter your password"
                                  {...field}
                                  data-testid="input-login-password"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="absolute right-0 top-0 h-full"
                                  onClick={() => setShowPassword(!showPassword)}
                                >
                                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-login">
                        {isLoading ? "Signing in..." : "Sign In"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>

                <TabsContent value="register">
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4">
                      <FormField
                        control={registerForm.control}
                        name="role"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>I am a</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-role">
                                  <SelectValue placeholder="Select your role" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="shipper">Shipper</SelectItem>
                                <SelectItem value="carrier">Carrier</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {selectedRole === "carrier" && (
                        <FormField
                          control={registerForm.control}
                          name="carrierType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Carrier Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value || ""}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-carrier-type">
                                    <SelectValue placeholder="Select carrier type" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="solo">Solo Driver (Owner-Operator)</SelectItem>
                                  <SelectItem value="enterprise">Fleet / Company</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={registerForm.control}
                          name="username"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Username</FormLabel>
                              <FormControl>
                                <Input placeholder="Username" {...field} data-testid="input-register-username" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="companyName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Company Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Company" {...field} data-testid="input-register-company" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={registerForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="you@company.com" {...field} data-testid="input-register-email" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      {selectedRole === "carrier" && (
                        <div className="space-y-3">
                          <FormField
                            control={registerForm.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Phone Number</FormLabel>
                                <FormControl>
                                  <div className="flex gap-2">
                                    <div className="relative flex-1">
                                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                      <Input 
                                        type="tel" 
                                        placeholder="+91 98765 43210" 
                                        className="pl-10"
                                        disabled={otpVerified}
                                        {...field} 
                                        data-testid="input-register-phone" 
                                      />
                                    </div>
                                    {!otpVerified ? (
                                      <Button 
                                        type="button"
                                        variant="outline"
                                        onClick={handleSendOtp}
                                        disabled={sendingOtp || (otpSent && otpCountdown > 0)}
                                        data-testid="button-send-otp"
                                      >
                                        {sendingOtp ? (
                                          <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : otpSent && otpCountdown > 0 ? (
                                          `${otpCountdown}s`
                                        ) : otpSent ? (
                                          "Resend"
                                        ) : (
                                          "Send OTP"
                                        )}
                                      </Button>
                                    ) : (
                                      <div className="flex items-center gap-1 text-green-600 px-3">
                                        <CheckCircle className="h-4 w-4" />
                                        <span className="text-sm font-medium">Verified</span>
                                      </div>
                                    )}
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          {otpSent && !otpVerified && (
                            <div className="space-y-2">
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    type="text"
                                    placeholder="Enter 6-digit OTP"
                                    className="pl-10 tracking-widest font-mono"
                                    maxLength={6}
                                    value={enteredOtp}
                                    onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, ""))}
                                    data-testid="input-otp-code"
                                  />
                                </div>
                                <Button 
                                  type="button"
                                  onClick={handleVerifyOtp}
                                  disabled={enteredOtp.length !== 6 || verifyingOtp}
                                  data-testid="button-verify-otp"
                                >
                                  {verifyingOtp ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify"}
                                </Button>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                OTP has been displayed in the notification. Enter it above to verify your phone.
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={registerForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Password" {...field} data-testid="input-register-password" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={registerForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirm Password</FormLabel>
                              <FormControl>
                                <Input type="password" placeholder="Confirm" {...field} data-testid="input-register-confirm" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full" 
                        disabled={isLoading || !canCarrierRegister} 
                        data-testid="button-register"
                      >
                        {isLoading ? "Creating account..." : !canCarrierRegister ? "Verify Phone First" : "Create Account"}
                      </Button>
                    </form>
                  </Form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
