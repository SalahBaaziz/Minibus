import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSetup, setIsSetup] = useState(false);
  const [setupKey, setSetupKey] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        // Check if admin
        supabase.rpc("has_role", { _user_id: session.user.id, _role: "admin" }).then(({ data }) => {
          if (data) navigate("/admin");
        });
      }
    });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "admin",
      });

      if (!isAdmin) {
        await supabase.auth.signOut();
        throw new Error("Not an admin account");
      }

      navigate("/admin");
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-admin", {
        body: { email, password, setupKey },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Admin created!", description: "You can now log in." });
      setIsSetup(false);
    } catch (err: any) {
      toast({ title: "Setup failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-dark flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gold/20">
            <Lock className="h-6 w-6 text-gold" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-primary-foreground">Admin Access</h1>
          <p className="text-sm text-primary-foreground/50 mt-1">Academy Minibus</p>
        </div>

        <form onSubmit={isSetup ? handleSetup : handleLogin} className="space-y-4">
          <div>
            <Label className="text-primary-foreground/70">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-navy-light/30 border-navy-light/40 text-primary-foreground placeholder:text-primary-foreground/30"
              placeholder="admin@email.com"
            />
          </div>
          <div>
            <Label className="text-primary-foreground/70">Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-navy-light/30 border-navy-light/40 text-primary-foreground placeholder:text-primary-foreground/30"
              placeholder="••••••••"
            />
          </div>

          {isSetup && (
            <div>
              <Label className="text-primary-foreground/70">Setup Key</Label>
              <Input
                type="password"
                value={setupKey}
                onChange={(e) => setSetupKey(e.target.value)}
                required
                className="bg-navy-light/30 border-navy-light/40 text-primary-foreground placeholder:text-primary-foreground/30"
                placeholder="Enter setup key"
              />
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gold text-navy hover:bg-gold-light font-semibold"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : isSetup ? "Create Admin" : "Sign In"}
          </Button>
        </form>

        <button
          onClick={() => setIsSetup(!isSetup)}
          className="mt-4 w-full text-xs text-primary-foreground/30 hover:text-primary-foreground/50 transition-colors"
        >
          {isSetup ? "Back to login" : "First time? Set up admin"}
        </button>

        <a href="/" className="block mt-6 text-center text-xs text-primary-foreground/30 hover:text-gold transition-colors">
          ← Back to website
        </a>
      </div>
    </div>
  );
};

export default AdminLogin;
