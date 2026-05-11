import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useSetAtom } from "jotai";
import { currentUserAtom, userRoleAtom } from "@/lib/store";
import { AuthService } from "@/lib/auth-service";

export default function StudentLoginPage() {
  const navigate = useNavigate();
  const setCurrentUser = useSetAtom(currentUserAtom);
  const setUserRole    = useSetAtom(userRoleAtom);

  const [form, setForm] = useState({ email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors]       = useState<{ email?: string; password?: string }>({});

  function validate(): boolean {
    const newErrors: typeof errors = {};
    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = "Enter a valid email address";
    }
    if (!form.password) {
      newErrors.password = "Password is required";
    } else if (form.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsLoading(true);

    try {
      const result = await AuthService.loginStudent(form.email.trim().toLowerCase(), form.password);

      if (!result.success || !result.user) {
        toast.error(result.error ?? "Invalid email or password. Please try again.");
        return;
      }

      AuthService.saveSession(result.token!, result.user);
      setCurrentUser(result.user);
      setUserRole("student");

      toast.success(`Welcome, ${result.user.name}!`);
      navigate("/student/join");
    } catch (err) {
      toast.error("Login failed. Please check your connection and try again.");
      console.error("Student login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSubmit();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-2xl">
            📚
          </div>
          <CardTitle className="text-2xl">Student Login</CardTitle>
          <p className="text-sm text-muted-foreground">
            Sign in to access your exams
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Email */}
          <div className="space-y-1">
            <label htmlFor="email" className="text-sm font-medium">Email Address</label>
            <Input
              id="email"
              type="email"
              placeholder="student@school.edu"
              value={form.email}
              onChange={(e) => {
                setForm((f) => ({ ...f, email: e.target.value }));
                if (errors.email) setErrors((er) => ({ ...er, email: undefined }));
              }}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium">Password</label>
              <Link to="/student/forgot-password" className="text-xs text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={form.password}
              onChange={(e) => {
                setForm((f) => ({ ...f, password: e.target.value }));
                if (errors.password) setErrors((er) => ({ ...er, password: undefined }));
              }}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password}</p>
            )}
          </div>

          <Button className="w-full" onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? "Signing in…" : "Sign In"}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            New student?{" "}
            <Link to="/student/signup" className="text-primary hover:underline font-medium">
              Create account
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
