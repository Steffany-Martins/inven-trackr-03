import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Package, FileText, Users, ShoppingCart, Sparkles, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Package, label: "Products", path: "/products" },
  { icon: FileText, label: "Invoices", path: "/invoices" },
  { icon: Users, label: "Suppliers", path: "/suppliers" },
  { icon: ShoppingCart, label: "Purchase Orders", path: "/orders" },
  { icon: Sparkles, label: "AI Insights", path: "/insights" },
];

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { signOut, userRole } = useAuth();

  const getRoleBadgeColor = (role: string | null) => {
    switch (role) {
      case "manager":
        return "bg-primary";
      case "supervisor":
        return "bg-warning";
      case "staff":
        return "bg-muted";
      default:
        return "bg-muted";
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-sidebar-foreground">StockFlow</h1>
          <p className="text-sm text-sidebar-foreground/60">Inventory System</p>
        </div>
        <nav className="space-y-1 px-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        
        {/* User section at bottom */}
        <div className="mt-auto p-3 border-t border-sidebar-border space-y-2">
          <div className="px-3">
            <Badge className={getRoleBadgeColor(userRole)}>
              {userRole || "loading..."}
            </Badge>
          </div>
          <Button 
            variant="ghost" 
            className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={signOut}
          >
            <LogOut className="h-5 w-5 mr-3" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">{children}</div>
      </main>
    </div>
  );
};
