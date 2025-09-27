import { Button } from "@/components/ui/button";
import { useLocation } from "react-router-dom";
import { Package, LogOut, Settings, Users } from "lucide-react";

interface HeaderProps {
  userRole?: "team" | "admin";
  teamName?: string;
  onLogout?: () => void;
}

export function Header({ userRole = "team", teamName, onLogout }: HeaderProps) {
  const location = useLocation();
  
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
              <Package className="h-4 w-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Robothon Inventory</h1>
              {teamName && (
                <p className="text-xs text-muted-foreground">Team: {teamName}</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {userRole === "admin" && (
            <Button variant="ghost" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          )}
          
          <Button variant="ghost" size="sm" onClick={onLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}