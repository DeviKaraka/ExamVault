import { motion } from 'motion/react';
import { GraduationCap, Users, Building2, ShieldCheck } from 'lucide-react';
import { useSetAtom, useAtomValue } from 'jotai';
import { userRoleAtom, orgSettingsAtom, type UserRole } from '@/lib/store';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

const roleOptions = [
  {
    id: 'teacher' as UserRole,
    title: 'Teacher',
    description: 'Create exams, manage questions, and grade student submissions',
    icon: GraduationCap,
    gradient: 'from-primary/20 to-primary/5',
    borderColor: 'hover:border-primary/50',
  },
  {
    id: 'student' as UserRole,
    title: 'Student',
    description: 'Join exams with access code and complete assessments',
    icon: Users,
    gradient: 'from-accent/20 to-accent/5',
    borderColor: 'hover:border-accent/50',
  },
];

export function RoleSelector() {
  const setUserRole = useSetAtom(userRoleAtom);
  const navigate = useNavigate();
  const orgSettings = useAtomValue(orgSettingsAtom);

  const handleRoleSelect = (role: UserRole) => {
    setUserRole(role);
    if (role === 'teacher') {
      navigate('/teacher/login');
    } else {
      navigate('/student/login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-secondary/30 p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" as const }}
        className="relative z-10 w-full max-w-3xl"
      >
        <div className="text-center mb-12">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <h1 className="text-5xl font-bold tracking-tight mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              ExamVault
            </h1>
            <p className="text-xl text-muted-foreground max-w-md mx-auto">
              Unified assessment platform for secure testing and instant evaluation
            </p>
            
            {/* Organization Badge */}
            {orgSettings.restrictToOrganization && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.4 }}
                className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/80 border border-border"
              >
                <Building2 className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">{orgSettings.organizationName}</span>
                <ShieldCheck className="w-4 h-4 text-accent" />
              </motion.div>
            )}
          </motion.div>
        </div>


        <div className="grid md:grid-cols-2 gap-6">
          {roleOptions.map(({ id, title, description, icon: Icon, gradient, borderColor }, index) => (
            <motion.button
              key={id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.1, duration: 0.5, ease: "easeOut" as const }}
              onClick={() => handleRoleSelect(id)}
              className={cn(
                "relative group p-8 rounded-2xl border-2 border-border bg-card text-left",
                "transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
                borderColor
              )}
            >
              <div className={cn("absolute inset-0 rounded-2xl bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity", gradient)} />
              
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Icon className="w-7 h-7 text-foreground" />
                </div>
                
                <h2 className="text-2xl font-semibold mb-2 text-card-foreground">{title}</h2>
                <p className="text-muted-foreground leading-relaxed">{description}</p>
                
                <div className="mt-6 flex items-center text-sm font-medium text-primary group-hover:translate-x-2 transition-transform">
                  Continue as {title}
                  <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </div>
            </motion.button>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-12"
        >
          <p className="text-sm text-muted-foreground">
            Secure • Proctored • Auto-Evaluated
          </p>
          {orgSettings.restrictToOrganization && (
            <p className="text-xs text-muted-foreground mt-2">
              Access restricted to organization members only
            </p>
          )}
        </motion.div>
      </motion.div>
    </div>
  );
}
