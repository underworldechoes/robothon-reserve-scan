import { useState, useEffect } from "react";
import { Header } from "@/components/layout/header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Cpu, 
  ChevronRight, 
  Package, 
  Clock,
  CheckCircle2 
} from "lucide-react";

interface Category {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

interface Reservation {
  id: string;
  part_id: number;
  status: string;
  scanned_at: string;
  notes: string | null;
  admin_remarks: string | null;
  parts: {
    name: string;
    categories: {
      name: string;
    };
  };
}

interface TeamDashboardProps {
  onLogout: () => void;
  onSelectCategory: (categoryId: number) => void;
}

export default function TeamDashboard({ onLogout, onSelectCategory }: TeamDashboardProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [teamName, setTeamName] = useState("Team User");
  const { toast } = useToast();

  useEffect(() => {
    loadCategories();
    loadReservations();
    loadProfile();

    // Set up real-time subscriptions with debouncing for better performance
    let partsTimeout: NodeJS.Timeout;
    let reservationsTimeout: NodeJS.Timeout;

    const partsChannel = supabase
      .channel('parts-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'parts'
        },
        () => {
          clearTimeout(partsTimeout);
          partsTimeout = setTimeout(() => {
            console.log('Parts updated, reloading categories');
            loadCategories();
          }, 500);
        }
      )
      .subscribe();

    const reservationsChannel = supabase
      .channel('reservations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_tracking'
        },
        () => {
          clearTimeout(reservationsTimeout);
          reservationsTimeout = setTimeout(() => {
            console.log('Reservations updated, reloading');
            loadReservations();
          }, 500);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(partsTimeout);
      clearTimeout(reservationsTimeout);
      supabase.removeChannel(partsChannel);
      supabase.removeChannel(reservationsChannel);
    };
  }, []);

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) setTeamName(data.username);
    } catch (error: any) {
      console.error("Error loading profile:", error);
    }
  };

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("name");

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading categories",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const loadReservations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get user's profile to get their profile id
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) return;

      const { data, error } = await supabase
        .from("inventory_tracking")
        .select(`
          id,
          part_id,
          status,
          scanned_at,
          notes,
          admin_remarks,
          parts (
            name,
            categories (
              name
            )
          )
        `)
        .eq("team_user_id", profile.id)
        .order("scanned_at", { ascending: false });

      if (error) throw error;
      setReservations(data || []);
    } catch (error: any) {
      toast({
        title: "Error loading reservations",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header 
        userRole="team" 
        teamName={teamName} 
        onLogout={onLogout} 
      />
      
      <main className="container mx-auto px-4 py-6 space-y-8">
        {/* Welcome Section */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Welcome back, {teamName}!</h1>
          <p className="text-muted-foreground">
            Select a category to browse and reserve components for your project.
          </p>
        </div>

        {/* Categories Grid */}
        <section>
          <h2 className="text-2xl font-semibold mb-6">Browse Categories</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {categories.map((category) => (
              <Card 
                key={category.id} 
                className="cursor-pointer transition-all duration-300 hover:shadow-medium hover:scale-105 bg-gradient-card"
                onClick={() => onSelectCategory(category.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary">
                      <Cpu className="h-5 w-5 text-white" />
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-lg">{category.name}</CardTitle>
                  <CardDescription className="text-sm">
                    {category.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex justify-center">
                    <StatusBadge variant="available">
                      Browse Items
                    </StatusBadge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Reservations History */}
        <section>
          <h2 className="text-2xl font-semibold mb-6">Your Checkouts</h2>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Track your checked out components
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reservations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No checkouts yet. Browse categories to get started!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reservations.map((reservation) => (
                    <div 
                      key={reservation.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-gradient-card"
                    >
                      <div className="space-y-1">
                        <h4 className="font-medium">{reservation.parts.name}</h4>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{reservation.parts.categories.name}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(reservation.scanned_at).toLocaleDateString()} at {new Date(reservation.scanned_at).toLocaleTimeString()}
                          </span>
                        </div>
                        {reservation.notes && (
                          <p className="text-sm text-muted-foreground">Note: {reservation.notes}</p>
                        )}
                        {reservation.admin_remarks && (
                          <p className="text-sm text-muted-foreground font-medium">Admin Remarks: {reservation.admin_remarks}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <StatusBadge variant={reservation.status === "reserved" ? "reserved" : reservation.status === "issued" ? "default" : "available"}>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {reservation.status.charAt(0).toUpperCase() + reservation.status.slice(1)}
                        </StatusBadge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}