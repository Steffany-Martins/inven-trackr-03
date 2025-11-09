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
  const { signOut, userRole, user } = useAuth();
  const { t } = useTranslation();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  const navItems = [
    { icon: LayoutDashboard, label: t("common.dashboard"), path: "/" },
    { icon: Package, label: t("common.products"), path: "/products" },
    { icon: FileText, label: t("common.invoices"), path: "/invoices" },
    { icon: UsersIcon, label: t("common.suppliers"), path: "/suppliers" },
    { icon: ShoppingCart, label: t("common.orders"), path: "/orders" },
    { icon: Package, label: "Movimentações", path: "/stock-movements" },
    { icon: Sparkles, label: t("common.insights"), path: "/insights" },
  ];

  if (userRole === "manager") {
    navItems.push({ icon: UsersIcon, label: t("common.users"), path: "/users" });
  }

  navItems.push({ icon: User, label: t("common.profile"), path: "/profile" });

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
          <h1 className="text-2xl font-bold text-sidebar-foreground">Zola Inventory AI</h1>
          <p className="text-sm text-sidebar-foreground/60">Sistema Inteligente</p>
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
                  <Badge className={cn("text-xs mt-1", getRoleBadgeColor(userRole))}>
                    {t(`users.roles.${userRole}`)}
                  </Badge>
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
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-6">{children}</div>
      </main>
    </div>
  );
};
