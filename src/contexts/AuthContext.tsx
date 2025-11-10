import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "manager" | "supervisor" | "staff" | "pending";
  status: "active" | "pending" | "inactive";
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
      })();
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      console.log('[AuthContext] Fetching profile for user ID:', userId);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("[AuthContext] Error fetching profile:", error);
        setProfile(null);
        return;
      }

      if (!data) {
        console.warn("[AuthContext] Profile not found for user:", userId);
        setProfile(null);
        return;
      }

      if (data.status === "inactive") {
        toast.error("Sua conta está inativa. Entre em contato com o administrador.");
        await signOut();
        return;
      }

      if (data.status === "pending") {
        toast.error("Sua conta está aguardando aprovação de um gerente.");
        await signOut();
        return;
      }

      console.log('[AuthContext] ✅ Profile loaded:', {
        email: data.email,
        role: data.role,
        status: data.status
      });
      setProfile(data as Profile);
    } catch (error) {
      console.error("[AuthContext] Error fetching profile:", error);
      setProfile(null);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      if (!email.endsWith("@zola-pizza.com")) {
        toast.error("Apenas emails @zola-pizza.com são permitidos");
        return { error: new Error("Invalid email domain") };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Email ou senha incorretos");
        } else {
          toast.error(error.message);
        }
        return { error };
      }

      if (data.user) {
        await fetchProfile(data.user.id);
        toast.success("Login realizado com sucesso!");
        navigate("/");
      }

      return { error: null };
    } catch (error: any) {
      toast.error("Erro ao fazer login");
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      if (!email.endsWith("@zola-pizza.com")) {
        toast.error("Apenas emails @zola-pizza.com são permitidos");
        return { error: new Error("Invalid email domain") };
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        toast.error(error.message);
        return { error };
      }

      if (data.user) {
        toast.success("Conta criada com sucesso! Aguarde a aprovação de um gerente para acessar o sistema.");
        await supabase.auth.signOut();
      }

      return { error: null };
    } catch (error: any) {
      toast.error("Erro ao criar conta");
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    navigate("/auth");
  };

  return (
    <AuthContext.Provider
      value={{ user, session, profile, signIn, signUp, signOut, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
