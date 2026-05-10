import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSetAtom, useAtomValue } from 'jotai';
import { motion } from 'motion/react';
import { BookOpen, Mail, User, ArrowLeft, KeyRound, Sparkles, ShieldAlert, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  userRoleAtom, 
  studentInfoAtom, 
  type StudentInfo,
  orgSettingsAtom,
  registeredUsersAtom,
  isEmailDomainAllowed,
  getUserRole,
} from '@/lib/store';

export default function StudentLogin() {
  const navigate = useNavigate();
  const setUserRole = useSetAtom(userRoleAtom);
  const setStudentInfo = useSetAtom(studentInfoAtom);
  const orgSettings = useAtomValue(orgSettingsAtom);
  const registeredUsers = useAtomValue(registeredUsersAtom);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!formData.name.trim() || !formData.email.trim()) {
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

    // Check if this email is registered as a teacher
    const existingRole = getUserRole(formData.email, registeredUsers);
    if (existingRole === 'teacher') {
      setError('Access Denied: Invalid Student Credentials');
      return;
    }

    setIsLoading(true);
    
    // Simulate authentication delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const studentInfo: StudentInfo = {
      name: formData.name.trim(),
      email: formData.email.trim(),
    };
    
    setStudentInfo(studentInfo);
    setUserRole('student');
    toast.success(`Welcome, ${studentInfo.name}! Good luck on your exams!`);
    navigate('/student');
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
    toast.success('Password reset instructions sent to your email!');
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/10 flex items-center justify-center p-4">
      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <motion.div 
          className="absolute top-20 right-20 text-accent/20"
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        >
          <Sparkles className="w-32 h-32" />
        </motion.div>
        <motion.div 
          className="absolute bottom-20 left-20 text-primary/10"
          animate={{ rotate: -360 }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        >
          <BookOpen className="w-40 h-40" />
        </motion.div>
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

        <Card className="border-2 border-accent/30 shadow-2xl shadow-accent/10 backdrop-blur-sm bg-card/95">
          <CardHeader className="text-center pb-2">
            <motion.div
              variants={itemVariants}
              className="mx-auto mb-4 p-4 rounded-2xl bg-gradient-to-br from-accent to-accent/80 text-accent-foreground shadow-lg"
            >
              <BookOpen className="w-10 h-10" />
            </motion.div>
            <motion.div variants={itemVariants}>
              <CardTitle className="text-2xl font-bold tracking-tight">
                {showForgotPassword ? 'Reset Password' : 'Student Portal'}
              </CardTitle>
              <CardDescription className="mt-2">
                {showForgotPassword
                  ? 'Enter your email to receive reset instructions'
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
                      placeholder="student@school.edu"
                      value={forgotEmail}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForgotEmail(e.target.value)}
                      className="pl-10 h-12 border-2 focus:border-accent"
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
                    className="flex-1 h-12 bg-gradient-to-r from-accent to-accent/90 hover:from-accent/90 hover:to-accent text-accent-foreground"
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
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                        setFormData(prev => ({ ...prev, name: e.target.value }))
                      }
                      className="pl-10 h-12 border-2 focus:border-accent"
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
                      placeholder="student@school.edu"
                      value={formData.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                        setFormData(prev => ({ ...prev, email: e.target.value }));
                        setError(null);
                      }}
                      className="pl-10 h-12 border-2 focus:border-accent"
                    />
                  </div>
                  {orgSettings.restrictToOrganization && (
                    <p className="text-xs text-muted-foreground">
                      Allowed domains: {orgSettings.allowedDomains.join(', ')}
                    </p>
                  )}
                </motion.div>

                <motion.div variants={itemVariants} className="flex justify-end">
                  <Button
                    type="button"
                    variant="link"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-accent hover:text-accent/80 p-0 h-auto font-medium"
                  >
                    Forgot password?
                  </Button>
                </motion.div>

                <motion.div variants={itemVariants} className="pt-2">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-12 text-base font-semibold bg-gradient-to-r from-accent to-accent/90 hover:from-accent/90 hover:to-accent text-accent-foreground shadow-lg shadow-accent/25 transition-all"
                  >
                    {isLoading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <BookOpen className="w-5 h-5" />
                      </motion.div>
                    ) : (
                      'Join Exam Portal'
                    )}
                  </Button>
                </motion.div>
              </motion.form>
            )}

            <motion.div variants={itemVariants} className="mt-6 pt-6 border-t border-border">
              <p className="text-center text-sm text-muted-foreground">
                Don't have an account?{' '}
                <Link
                  to="/student/signup"
                  className="text-accent-foreground hover:text-accent font-medium transition-colors"
                >
                  Sign up
                </Link>
              </p>
            </motion.div>

            <motion.div variants={itemVariants} className="mt-4">
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium text-foreground text-sm mb-2">Before you start:</h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  <li>• Ensure you have a stable internet connection</li>
                  <li>• Close all other applications</li>
                  <li>• Have your exam code ready</li>
                </ul>
              </div>
            </motion.div>
          </CardContent>
        </Card>

        <motion.p
          variants={itemVariants}
          className="text-center text-xs text-muted-foreground mt-6"
        >
          Anyone can sign up for a student account
        </motion.p>
      </motion.div>
    </div>
  );
}
