import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSetAtom, useAtomValue } from 'jotai';
import { motion } from 'motion/react';
import { GraduationCap, Mail, User, Lock, ArrowLeft, KeyRound, ShieldAlert, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  userRoleAtom, 
  teacherInfoAtom, 
  type TeacherInfo,
  orgSettingsAtom,
  registeredUsersAtom,
  isEmailDomainAllowed,
  getUserRole,
} from '@/lib/store';

export default function TeacherLogin() {
  const navigate = useNavigate();
  const setUserRole = useSetAtom(userRoleAtom);
  const setTeacherInfo = useSetAtom(teacherInfoAtom);
  const orgSettings = useAtomValue(orgSettingsAtom);
  const registeredUsers = useAtomValue(registeredUsersAtom);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    if (!formData.email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Check if email domain is allowed (organization restriction)
    if (!isEmailDomainAllowed(formData.email, orgSettings)) {
      setError(`Access denied. Only members of ${orgSettings.organizationName} can access this portal. Your email domain is not authorized.`);
      return;
    }

    // Check if this email is registered as a student
    const existingRole = getUserRole(formData.email, registeredUsers);
    if (existingRole === 'student') {
      setError('Access Denied: Invalid Teacher Credentials');
      return;
    }

    setIsLoading(true);
    
    // Simulate authentication delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const teacherInfo: TeacherInfo = {
      name: formData.name.trim(),
      email: formData.email.trim(),
    };
    
    setTeacherInfo(teacherInfo);
    setUserRole('teacher');
    toast.success(`Welcome back, ${teacherInfo.name}!`);
    navigate('/teacher');
    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!forgotEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    toast.success('Password reset link sent to your email!');
    setShowForgotPassword(false);
    setForgotEmail('');
    setIsLoading(false);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  } as const;

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] as const } },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-primary/5 to-transparent rounded-full" />
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="w-full max-w-md relative z-10"
      >
        {/* Back button */}
        <motion.div variants={itemVariants} className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to role selection
          </Button>
        </motion.div>

        {/* Organization Badge */}
        {orgSettings.restrictToOrganization && (
          <motion.div variants={itemVariants} className="mb-4">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg py-2 px-4">
              <Building2 className="w-4 h-4" />
              <span>{orgSettings.organizationName}</span>
            </div>
          </motion.div>
        )}

        <Card className="border-2 border-primary/20 shadow-2xl shadow-primary/10 backdrop-blur-sm bg-card/95">
          <CardHeader className="text-center pb-2">
            <motion.div
              variants={itemVariants}
              className="mx-auto mb-4 p-4 rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg"
            >
              <GraduationCap className="w-10 h-10" />
            </motion.div>
            <motion.div variants={itemVariants}>
              <CardTitle className="text-2xl font-bold tracking-tight">
                {showForgotPassword ? 'Reset Password' : 'Faculty Portal'}
              </CardTitle>
              <CardDescription className="mt-2">
                {showForgotPassword
                  ? 'Enter your email to receive a reset link'
                  : 'Sign in with your organization credentials'
                }
              </CardDescription>
            </motion.div>
          </CardHeader>

          <CardContent className="pt-6">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4"
              >
                <Alert variant="destructive">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              </motion.div>
            )}

            {showForgotPassword ? (
              <motion.form
                key="forgot-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handleForgotPassword}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="forgot-email" className="text-foreground font-medium">
                    Email Address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="teacher@school.edu"
                      value={forgotEmail}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForgotEmail(e.target.value)}
                      className="pl-10 h-12 border-2 focus:border-primary"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForgotPassword(false)}
                    className="flex-1 h-12"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 h-12 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary"
                  >
                    {isLoading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <KeyRound className="w-5 h-5" />
                      </motion.div>
                    ) : (
                      'Send Reset Link'
                    )}
                  </Button>
                </div>
              </motion.form>
            ) : (
              <motion.form
                key="login-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                <motion.div variants={itemVariants} className="space-y-2">
                  <Label htmlFor="name" className="text-foreground font-medium">
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="Dr. Jane Smith"
                      value={formData.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        setFormData(prev => ({ ...prev, name: e.target.value }))
                      }
                      className="pl-10 h-12 border-2 focus:border-primary"
                    />
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-2">
                  <Label htmlFor="email" className="text-foreground font-medium">
                    Organization Email
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="teacher@school.edu"
                      value={formData.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setFormData(prev => ({ ...prev, email: e.target.value }));
                        setError(null);
                      }}
                      className="pl-10 h-12 border-2 focus:border-primary"
                    />
                  </div>
                  {orgSettings.restrictToOrganization && (
                    <p className="text-xs text-muted-foreground">
                      Allowed domains: {orgSettings.allowedDomains.join(', ')}
                    </p>
                  )}
                </motion.div>

                <motion.div variants={itemVariants} className="space-y-2">
                  <Label htmlFor="password" className="text-foreground font-medium">
                    Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        setFormData(prev => ({ ...prev, password: e.target.value }))
                      }
                      className="pl-10 h-12 border-2 focus:border-primary"
                    />
                  </div>
                </motion.div>

                <motion.div variants={itemVariants} className="flex justify-end">
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-primary hover:text-primary/80 p-0 h-auto font-medium"
                  >
                    Forgot password?
                  </Button>
                </motion.div>

                <motion.div variants={itemVariants} className="pt-2">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 transition-all"
                  >
                    {isLoading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Lock className="w-5 h-5" />
                      </motion.div>
                    ) : (
                      'Sign In to Dashboard'
                    )}
                  </Button>
                </motion.div>
              </motion.form>
            )}

            <motion.div variants={itemVariants} className="mt-6 pt-6 border-t border-border">
              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link
                  to="/teacher/signup"
                  className="text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  Sign up
                </Link>
              </p>
            </motion.div>
          </CardContent>
        </Card>

        <motion.p
          variants={itemVariants}
          className="text-center text-xs text-muted-foreground mt-6"
        >
          Anyone can sign up for a faculty account
        </motion.p>
      </motion.div>
    </div>
  );
}
