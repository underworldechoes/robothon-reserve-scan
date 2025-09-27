import { useState } from "react";
import Login from "./Login";
import TeamDashboard from "./TeamDashboard";
import CategoryProducts from "./CategoryProducts";

type AppState = {
  currentView: "login" | "team-dashboard" | "category-products" | "admin-dashboard";
  userRole: "team" | "admin" | null;
  selectedCategoryId: number | null;
  userData: any;
};

const Index = () => {
  const [appState, setAppState] = useState<AppState>({
    currentView: "login",
    userRole: null,
    selectedCategoryId: null,
    userData: null,
  });

  const handleLogin = (role: "team" | "admin", credentials: any) => {
    setAppState({
      currentView: role === "team" ? "team-dashboard" : "admin-dashboard",
      userRole: role,
      selectedCategoryId: null,
      userData: credentials,
    });
  };

  const handleLogout = () => {
    setAppState({
      currentView: "login",
      userRole: null,
      selectedCategoryId: null,
      userData: null,
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
      // TODO: Implement admin dashboard
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <h1 className="mb-4 text-4xl font-bold">Admin Dashboard</h1>
            <p className="text-xl text-muted-foreground mb-4">Coming soon...</p>
            <button 
              onClick={handleLogout}
              className="px-4 py-2 bg-primary text-primary-foreground rounded"
            >
              Logout
            </button>
          </div>
        </div>
      );
    
    default:
      return <Login onLogin={handleLogin} />;
  }
};

export default Index;
