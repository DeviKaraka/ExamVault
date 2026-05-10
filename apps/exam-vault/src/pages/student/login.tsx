import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, Users, ArrowLeft, ArrowRight } from 'lucide-react';
import { useSetAtom } from 'jotai';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import { userRoleAtom, studentInfoAtom } from '@/lib/store';

export default function StudentLogin() {
  const navigate = useNavigate();
  const setUserRole = useSetAtom(userRoleAtom);
  const setStudentInfo = useSetAtom(studentInfoAtom);

  const [form, setForm] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!form.email.trim()) {
      toast.error('Please enter your email');
      return;
    }
    if (!form.password.trim()) {
      toast.error('Please enter your password');
      return;
    }

    setIsLoading(true);

    // Simulate login validation
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Store student info
    setStudentInfo({
      email: form.email,
      name: form.email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
    });
    setUserRole('student');

    setIsLoading(false);
    toast.success('Welcome! Enter an exam code to begin.');
    navigate('/student/join');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 bg-gradient-to-br from-accent/8 via-background to-primary/5" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-accent/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
      
      {/* Geometric patterns */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/4 w-32 h-32 border border-accent/15 rounded-lg rotate-12" />
        <div className="absolute bottom-1/4 right-1/3 w-24 h-24 border border-primary/10 rounded-full" />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as const }}
          className="w-full max-w-md"
        >
          {/* Back button */}
          <Button
            variant="ghost"
            size="sm"
            className="mb-6"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>

          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" as const }}
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent text-accent-foreground mb-4 shadow-lg"
            >
              <Users className="w-8 h-8" />
            </motion.div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Student Portal</h1>
            <p className="text-muted-foreground">Sign in to access your exams</p>
          </div>

          {/* Login Card */}
          <Card className="border-2 border-border/50 shadow-xl bg-card/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Sign In</CardTitle>
              <CardDescription>
                Enter your credentials to continue
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  onKeyDown={handleKeyDown}
                  placeholder="student@university.edu"
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setForm((prev) => ({ ...prev, password: e.target.value }))
                    }
                    onKeyDown={handleKeyDown}
                    placeholder="••••••••"
                    className="bg-background pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex justify-end">
                <Link
                  to="/student/forgot-password"
                  className="text-sm text-primary hover:text-primary/80 hover:underline transition-colors"
                >
                  Forgot password?
                </Link>
              </div>

              <Button
                className="w-full mt-2"
                size="lg"
                onClick={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Continue to Join Exam
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </CardContent>
            <CardFooter className="justify-center border-t border-border pt-6">
              <p className="text-sm text-muted-foreground">
                Are you a teacher?{' '}
                <Link to="/teacher/login" className="text-primary hover:underline font-medium">
                  Teacher login
                </Link>
              </p>
            </CardFooter>
          </Card>

          {/* Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 p-4 rounded-lg bg-secondary/50 border border-border"
          >
            <p className="text-sm text-muted-foreground text-center">
              After signing in, you&apos;ll enter your exam access code to begin your assessment.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
