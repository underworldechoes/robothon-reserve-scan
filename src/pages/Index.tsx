import { useState, useEffect } from "react";
import Login from "./Login";
import TeamDashboard from "./TeamDashboard";
import CategoryProducts from "./CategoryProducts";
import AdminDashboard from "./AdminDashboard";
import { supabase } from "@/integrations/supabase/client";
import type { Session } from "@supabase/supabase-js";

type AppState = {
  currentView: "login" | "team-dashboard" | "category-products" | "admin-dashboard";
  userRole: "team" | "admin" | null;
  selectedCategoryId: number | null;
  session: Session | null;
  profile: any;
};

const Index = () => {
  const [appState, setAppState] = useState<AppState>({
    currentView: "login",
    userRole: null,
    selectedCategoryId: null,
    session: null,
    profile: null,
  });

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Get user profile to determine role
        supabase
          .from("profiles")
          .select("*")
          .eq("user_id", session.user.id)
          .maybeSingle()
          .then(({ data: profile, error }) => {
            if (error) {
              console.error("Error fetching profile:", error);
            } else if (profile) {
              setAppState({
                currentView: profile.role === "admin" ? "admin-dashboard" : "team-dashboard",
                userRole: profile.role,
                selectedCategoryId: null,
                session,
                profile,
              });
            } else {
              console.error("No profile found for user");
            }
          });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          setAppState({
            currentView: "login",
            userRole: null,
            selectedCategoryId: null,
            session: null,
            profile: null,
          });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = (role: "team" | "admin", session: Session, profile: any) => {
    setAppState({
      currentView: role === "team" ? "team-dashboard" : "admin-dashboard",
      userRole: role,
      selectedCategoryId: null,
      session,
      profile,
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setAppState({
      currentView: "login",
      userRole: null,
      selectedCategoryId: null,
      session: null,
      profile: null,
    });
  };

  const handleSelectCategory = (categoryId: number) => {
    setAppState({
      ...appState,
      currentView: "category-products",
      selectedCategoryId: categoryId,
    });
  };

  const handleBackToDashboard = () => {
    setAppState({
      ...appState,
      currentView: appState.userRole === "team" ? "team-dashboard" : "admin-dashboard",
      selectedCategoryId: null,
    });
  };

  // Render based on current view
  switch (appState.currentView) {
    case "login":
      return <Login onLogin={handleLogin} />;
    
    case "team-dashboard":
      return (
        <TeamDashboard 
          onLogout={handleLogout}
          onSelectCategory={handleSelectCategory}
        />
      );
    
    case "category-products":
      return (
        <CategoryProducts 
          categoryId={appState.selectedCategoryId!}
          onBack={handleBackToDashboard}
          onLogout={handleLogout}
        />
      );
    
    case "admin-dashboard":
      return (
        <AdminDashboard 
          onLogout={handleLogout}
          userData={{ session: appState.session, profile: appState.profile }}
        />
      );
    
    default:
      return <Login onLogin={handleLogin} />;
  }
};

export default Index;
