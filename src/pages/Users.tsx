import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { toast } from "sonner";
import { UserPermissionsDialog } from "@/components/UserPermissionsDialog";

type UserRole = "manager" | "supervisor" | "staff" | "pending";
type UserStatus = "active" | "pending" | "inactive";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  role: UserRole;
  status: UserStatus;
}

export default function Users() {
  const { profile, user } = useAuth();
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  if (profile?.role !== "manager") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Acesso negado. Apenas gerentes podem acessar esta página.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as UserProfile[];
    },
  });

  const pendingUsers = users?.filter((u) => u.status === "pending");

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, updates }: { userId: string; updates: Partial<UserProfile> }) => {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success(t("users.userUpdated"));
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const getRoleBadgeVariant = (role: UserRole): "default" | "secondary" | "outline" | "destructive" => {
    switch (role) {
      case "manager":
        return "default";
      case "supervisor":
        return "secondary";
      case "staff":
        return "outline";
      case "pending":
        return "outline";
    }
  };

  const getStatusBadgeVariant = (status: UserStatus): "default" | "secondary" | "outline" | "destructive" => {
    switch (status) {
      case "active":
        return "default";
      case "inactive":
        return "destructive";
      case "pending":
        return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t("users.title")}</h1>
        <p className="text-muted-foreground">{t("users.description")}</p>
      </div>

      {pendingUsers && pendingUsers.length > 0 && (
        <Card className="border-orange-500">
          <CardHeader>
            <CardTitle>Usuários Pendentes de Aprovação</CardTitle>
            <CardDescription>
              {pendingUsers.length} usuário(s) aguardando aprovação
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={u.avatar_url || undefined} />
                      <AvatarFallback>
                        {u.full_name?.charAt(0) || u.email.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{u.full_name || "Sem nome"}</p>
                      <p className="text-sm text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Select
                      value={u.role}
                      onValueChange={(value: UserRole) =>
                        updateUserMutation.mutate({
                          userId: u.id,
                          updates: { role: value, status: 'active' }
                        })
                      }
                    >
                      <SelectTrigger className="w-[150px]">
                        <SelectValue placeholder="Aprovar como..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manager">
                          {t("users.roles.manager")}
                        </SelectItem>
                        <SelectItem value="supervisor">
                          {t("users.roles.supervisor")}
                        </SelectItem>
                        <SelectItem value="staff">
                          {t("users.roles.staff")}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
          <CardDescription>Gerencie permissões e funções dos usuários</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-muted-foreground">{t("common.loading")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>{t("users.email")}</TableHead>
                  <TableHead>{t("users.role")}</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>{t("users.createdAt")}</TableHead>
                  <TableHead>{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users?.map((userItem) => (
                  <TableRow key={userItem.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={userItem.avatar_url || undefined} />
                          <AvatarFallback>
                            {userItem.full_name?.charAt(0) || userItem.email.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{userItem.full_name || "Sem nome"}</span>
                      </div>
                    </TableCell>
                    <TableCell>{userItem.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(userItem.role)}>
                        {t(`users.roles.${userItem.role}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(userItem.status)}>
                        {t(`users.statuses.${userItem.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(userItem.created_at), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      {userItem.id !== user?.id && (
                        <div className="flex gap-2">
                          <Select
                            value={userItem.role}
                            onValueChange={(value: UserRole) =>
                              updateUserMutation.mutate({
                                userId: userItem.id,
                                updates: { role: value }
                              })
                            }
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="manager">
                                {t("users.roles.manager")}
                              </SelectItem>
                              <SelectItem value="supervisor">
                                {t("users.roles.supervisor")}
                              </SelectItem>
                              <SelectItem value="staff">
                                {t("users.roles.staff")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <Select
                            value={userItem.status}
                            onValueChange={(value: UserStatus) =>
                              updateUserMutation.mutate({
                                userId: userItem.id,
                                updates: { status: value }
                              })
                            }
                          >
                            <SelectTrigger className="w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">
                                {t("users.statuses.active")}
                              </SelectItem>
                              <SelectItem value="inactive">
                                {t("users.statuses.inactive")}
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <UserPermissionsDialog
                            userId={userItem.id}
                            userName={userItem.full_name || userItem.email}
                          />
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
