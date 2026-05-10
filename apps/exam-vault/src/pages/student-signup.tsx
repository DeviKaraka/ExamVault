import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSetAtom, useAtomValue } from 'jotai';
import { motion } from 'motion/react';
import { BookOpen, Mail, User, Lock, ArrowLeft, UserPlus, GraduationCap, CheckCircle, ShieldAlert, Building2 } from 'lucide-react';
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
  registerUserAtom,
  isEmailDomainAllowed,
  getUserRole,
} from '@/lib/store';

export default function StudentSignup() {
  const navigate = useNavigate();
  const setUserRole = useSetAtom(userRoleAtom);
  const setStudentInfo = useSetAtom(studentInfoAtom);
  const registerUser = useSetAtom(registerUserAtom);
  const orgSettings = useAtomValue(orgSettingsAtom);
  const registeredUsers = useAtomValue(registeredUsersAtom);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    studentId: '',
    password: '',
    confirmPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!formData.email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Check if email domain is allowed (organization restriction)
    if (!isEmailDomainAllowed(formData.email, orgSettings)) {
      setError(`Access denied. Only members of ${orgSettings.organizationName} can register. Your email domain is not authorized.`);
      return;
    }

    // Check if this email is already registered as a teacher
    const existingRole = getUserRole(formData.email, registeredUsers);
    if (existingRole === 'teacher') {
      setError('Access Denied: Invalid Student Credentials. This email is registered as a Teacher account.');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    
    // Simulate registration delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const studentInfo: StudentInfo = {
      name: formData.name.trim(),
      email: formData.email.trim(),
    };

    // Register user as student
    registerUser({
      email: formData.email.trim(),
      name: formData.name.trim(),
      role: 'student',
    });
    
    setStudentInfo(studentInfo);
    setUserRole('student');
    toast.success('Account created! You can now join exams.');
    navigate('/student');
    setIsLoading(false);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
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
          className="absolute top-1/4 right-1/4 text-accent/10"
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          <BookOpen className="w-48 h-48" />
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
                Create Student Account
              </CardTitle>
              <CardDescription className="mt-2">
                Register with your organization email
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

            <motion.form
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <motion.div variants={itemVariants} className="space-y-2">
                <Label htmlFor="name" className="text-foreground font-medium">
                  Full Name <span className="text-destructive">*</span>
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
                  Organization Email <span className="text-destructive">*</span>
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

              <motion.div variants={itemVariants} className="space-y-2">
                <Label htmlFor="studentId" className="text-foreground font-medium">
                  Student ID (Optional)
                </Label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="studentId"
                    type="text"
                    placeholder="STU2024001"
                    value={formData.studentId}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      setFormData(prev => ({ ...prev, studentId: e.target.value }))
                    }
                    className="pl-10 h-12 border-2 focus:border-accent"
                  />
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="space-y-2">
                <Label htmlFor="password" className="text-foreground font-medium">
                  Password <span className="text-destructive">*</span>
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
                    className="pl-10 h-12 border-2 focus:border-accent"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Minimum 8 characters</p>
              </motion.div>

              <motion.div variants={itemVariants} className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-foreground font-medium">
                  Confirm Password <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <CheckCircle className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                      setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))
                    }
                    className="pl-10 h-12 border-2 focus:border-accent"
                  />
                </div>
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
                      <UserPlus className="w-5 h-5" />
                    </motion.div>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5 mr-2" />
                      Create Account
                    </>
                  )}
                </Button>
              </motion.div>
            </motion.form>

            <motion.div variants={itemVariants} className="mt-6 pt-6 border-t border-border">
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link
                  to="/student/login"
                  className="text-accent-foreground hover:text-accent font-medium transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </motion.div>
          </CardContent>
        </Card>

        <motion.p
          variants={itemVariants}
          className="text-center text-xs text-muted-foreground mt-6"
        >
          Student registration requires an authorized organization email
        </motion.p>
      </motion.div>
    </div>
  );
}
