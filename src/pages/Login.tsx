import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Users, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface LoginProps {
  onLogin: (role: "team" | "admin", credentials: any) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>, role: "team" | "admin") => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("username") as string;
    const password = formData.get("password") as string;

    try {
      // For admin login, use default credentials
      if (role === "admin" && email === "admin" && password === "admin123") {
        // Sign up the admin user if doesn't exist, then sign in
        const { error: signUpError } = await supabase.auth.signUp({
          email: "admin@robothon.com",
          password: "admin123",
        });

        if (signUpError && !signUpError.message.includes("already registered")) {
          throw signUpError;
        }

        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: "admin@robothon.com",
          password: "admin123",
        });

        if (signInError) throw signInError;

        // Create or update admin profile
        if (data.user) {
          const { error: profileError } = await supabase
            .from("profiles")
            .upsert({
              user_id: data.user.id,
              username: "admin",
              role: "admin",
            });

          if (profileError && !profileError.message.includes("duplicate key")) {
            console.warn("Profile creation warning:", profileError);
          }
        }

        toast({
          title: "Login successful",
          description: "Welcome Administrator!",
        });
        onLogin(role, { user: data.user, session: data.session });
      } else {
        // Regular user login
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email,
          password: password,
        });

        if (signInError) throw signInError;

        // Get user profile to determine role
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", data.user.id)
          .single();

        if (!profile) {
          throw new Error("User profile not found");
        }

        toast({
          title: "Login successful",
          description: `Welcome ${profile.role === "admin" ? "Administrator" : "Team Member"}!`,
        });
        onLogin(profile.role, { user: data.user, session: data.session, profile });
      }
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-hero p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
              <Package className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">Robothon Inventory</h1>
          <p className="text-muted-foreground">Hardware Reservation System</p>
        </div>

        {/* Login Form */}
        <Card className="shadow-medium">
          <CardHeader className="pb-4">
            <CardTitle className="text-center">Sign In</CardTitle>
            <CardDescription className="text-center">
              Access your inventory dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="team" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="team" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Team
                </TabsTrigger>
                <TabsTrigger value="admin" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Admin
                </TabsTrigger>
              </TabsList>

              <TabsContent value="team" className="space-y-4 mt-6">
                <form onSubmit={(e) => handleSubmit(e, "team")} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="team-username">Email</Label>
                    <Input 
                      id="team-username" 
                      name="username"
                      type="email"
                      placeholder="Enter team email"
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="team-password">Password</Label>
                    <Input 
                      id="team-password" 
                      name="password"
                      type="password" 
                      placeholder="Enter password"
                      required 
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign in as Team"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="admin" className="space-y-4 mt-6">
                <form onSubmit={(e) => handleSubmit(e, "admin")} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="admin-username">Admin Username</Label>
                    <Input 
                      id="admin-username" 
                      name="username"
                      placeholder="admin"
                      defaultValue="admin"
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Password</Label>
                    <Input 
                      id="admin-password" 
                      name="password"
                      type="password" 
                      placeholder="admin123"
                      defaultValue="admin123"
                      required 
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Default admin credentials: admin / admin123
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign in as Admin"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 text-center">
              <Button variant="link" size="sm">
                Forgot password?
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}