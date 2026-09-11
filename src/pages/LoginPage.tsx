import React, { useState } from "react";
import { useNavigate, useLocation, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Library, AlertCircle, Info } from "lucide-react";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/demo";

const IS_DEMO = import.meta.env.VITE_DEMO === "true";

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const from =
    (location.state as { from?: { pathname: string } })?.from?.pathname || "/";

  const signIn = async (email: string, password: string) => {
    setError("");
    setIsLoading(true);

    try {
      await login(email, password);

      // Navigate to the original destination or default dashboard
      if (from === "/") {
        // Will be redirected to appropriate dashboard by ProtectedRoute
        navigate("/dashboard");
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Login failed";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    signIn(email, password);
  };

  const handleDemoLogin = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    signIn(demoEmail, DEMO_PASSWORD);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Library className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Library Management System</CardTitle>
          <CardDescription>Sign in to your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          {IS_DEMO && (
            <div className="mt-6 space-y-3">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Live demo with sample data — no backend required. Changes
                  reset when you close the tab.
                </AlertDescription>
              </Alert>
              <p className="text-sm text-center text-muted-foreground">
                Sign in instantly as
              </p>
              <div className="grid grid-cols-3 gap-2">
                {DEMO_ACCOUNTS.map((account) => (
                  <Button
                    key={account.email}
                    type="button"
                    variant="outline"
                    disabled={isLoading}
                    onClick={() => handleDemoLogin(account.email)}
                  >
                    {account.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
