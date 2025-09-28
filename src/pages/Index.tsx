import { useState } from "react";
import Login from "./Login";
import TeamDashboard from "./TeamDashboard";
import CategoryProducts from "./CategoryProducts";
import AdminDashboard from "./AdminDashboard";

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
      return (
        <AdminDashboard 
          onLogout={handleLogout}
          userData={appState.userData}
        />
      );
    
    default:
      return <Login onLogin={handleLogin} />;
  }
};

export default Index;
