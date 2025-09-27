import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Package, Users, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
    const credentials = {
      username: formData.get("username"),
      password: formData.get("password"),
    };

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
      toast({
        title: "Login successful",
        description: `Welcome ${role === "admin" ? "Administrator" : "Team Member"}!`,
      });
      onLogin(role, credentials);
    }, 1000);
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
                    <Label htmlFor="team-username">Team Username</Label>
                    <Input 
                      id="team-username" 
                      name="username"
                      placeholder="Enter team username"
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
                      placeholder="Enter admin username"
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-password">Password</Label>
                    <Input 
                      id="admin-password" 
                      name="password"
                      type="password" 
                      placeholder="Enter password"
                      required 
                    />
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