import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Mail, ArrowLeft, Send, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';

export default function TeacherForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      toast.error('Please enter your email');
      return;
    }

    if (!email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    // Simulate sending reset email
    await new Promise((resolve) => setTimeout(resolve, 1200));

    setIsLoading(false);
    setIsSent(true);
    toast.success('Password reset email sent!');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Decorative background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-background to-secondary/10" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/8 rounded-full blur-3xl" />

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
            onClick={() => navigate('/teacher/login')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Button>

          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.4, ease: "easeOut" as const }}
              className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 shadow-lg ${
                isSent 
                  ? 'bg-chart-3 text-card' 
                  : 'bg-primary text-primary-foreground'
              }`}
            >
              {isSent ? <CheckCircle className="w-8 h-8" /> : <Mail className="w-8 h-8" />}
            </motion.div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {isSent ? 'Check Your Email' : 'Forgot Password'}
            </h1>
            <p className="text-muted-foreground">
              {isSent 
                ? 'We\'ve sent you a password reset link'
                : 'Enter your email to reset your password'
              }
            </p>
          </div>

          {/* Form Card */}
          <Card className="border-2 border-border/50 shadow-xl bg-card/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>{isSent ? 'Email Sent!' : 'Reset Password'}</CardTitle>
              <CardDescription>
                {isSent 
                  ? `We've sent a password reset link to ${email}`
                  : 'Enter the email associated with your account'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isSent ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email Address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="teacher@school.edu"
                      className="bg-background"
                    />
                  </div>

                  <Button
                    className="w-full mt-2"
                    size="lg"
                    onClick={handleSubmit}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                        Sending...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Send className="w-4 h-4" />
                        Send Reset Link
                      </span>
                    )}
                  </Button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-lg bg-chart-3/10 border border-chart-3/20">
                    <p className="text-sm text-foreground">
                      If an account exists for <strong>{email}</strong>, you will receive a password reset link shortly.
                    </p>
                  </div>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => navigate('/teacher/login')}
                  >
                    Return to Login
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => {
                      setIsSent(false);
                      setEmail('');
                    }}
                  >
                    Try a different email
                  </Button>
                </div>
              )}
            </CardContent>
            <CardFooter className="justify-center border-t border-border pt-6">
              <p className="text-sm text-muted-foreground">
                Remember your password?{' '}
                <Link to="/teacher/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
