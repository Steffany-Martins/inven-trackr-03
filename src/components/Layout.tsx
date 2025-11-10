import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Package, 
  FileText, 
  Users as UsersIcon, 
  ShoppingCart, 
  Sparkles, 
  LogOut,
  User,
  TrendingUp
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { LanguageSelector } from "./LanguageSelector";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { signOut, profile, user } = useAuth();
  const { t } = useTranslation();

  const navItems = [
    { icon: LayoutDashboard, label: t("common.dashboard"), path: "/" },
    { icon: Package, label: t("common.products"), path: "/products" },
    { icon: FileText, label: t("common.invoices"), path: "/invoices" },
    { icon: UsersIcon, label: t("common.suppliers"), path: "/suppliers" },
    { icon: ShoppingCart, label: t("common.orders"), path: "/orders" },
    { icon: Package, label: "Movimentações", path: "/stock-movements" },
    { icon: Sparkles, label: t("common.insights"), path: "/insights" },
  ];

  if (profile?.role === "manager") {
    navItems.push({ icon: UsersIcon, label: t("common.users"), path: "/users" });
  }

  navItems.push({ icon: User, label: t("common.profile"), path: "/profile" });

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "manager":
        return "bg-primary text-primary-foreground";
      case "supervisor":
        return "bg-secondary text-secondary-foreground";
      case "staff":
        return "bg-muted text-muted-foreground";
      case "pending":
        return "bg-warning text-warning-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-72 bg-gradient-to-b from-sidebar via-sidebar to-sidebar/95 border-r border-sidebar-border/50 flex flex-col shadow-2xl">
        <div className="p-6 border-b border-sidebar-border/30">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
              <Package className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-sidebar-foreground">Zola Inventory</h1>
              <p className="text-xs text-sidebar-foreground/60">Sistema Inteligente</p>
            </div>
          </div>
        </div>
        <nav className="space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
                  isActive
                    ? "bg-gradient-to-r from-primary to-primary/90 text-primary-foreground shadow-lg scale-105"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:translate-x-1"
                )}
              >
                <Icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        
        {/* User section at bottom */}
        <div className="mt-auto p-3 border-t border-sidebar-border space-y-3">
          <div className="flex items-center gap-2">
            <NotificationsDropdown />
            <LanguageSelector />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback>
                      {profile?.full_name?.charAt(0) || profile?.email?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <div className="p-2">
                  <p className="text-sm font-medium">{profile?.full_name || "User"}</p>
                  <p className="text-xs text-muted-foreground">{profile?.email}</p>
                  {profile?.role && (
                    <Badge className={cn("text-xs mt-1", getRoleBadgeColor(profile.role))}>
                      {t(`users.roles.${profile.role}`)}
                    </Badge>
                  )}
                </div>
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  {t("common.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-gradient-to-br from-background via-background to-muted/20">
        <div className="container mx-auto p-8">{children}</div>
      </main>
    </div>
  );
};
