import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Mail, Bell, Send, Settings, Check, ChevronRight, Inbox, Clock, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import {
  getEmailSettings,
  saveEmailSettings,
  getSentEmails,
  type EmailSettings,
  type SentEmail,
} from '@/lib/email-service';
import { formatDistanceToNow } from 'date-fns';

export default function TeacherEmailSettings() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<EmailSettings>(getEmailSettings());
  const [sentEmails, setSentEmails] = useState<SentEmail[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setSentEmails(getSentEmails());
  }, []);

  const handleSettingChange = <K extends keyof EmailSettings>(
    key: K,
    value: EmailSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveEmailSettings(settings);
    setHasChanges(false);
    toast.success('Email settings saved successfully');
  };

  const getEmailTypeIcon = (type: SentEmail['type']) => {
    switch (type) {
      case 'submission':
        return <Send className="h-4 w-4" />;
      case 'grade_release':
        return <Check className="h-4 w-4" />;
      case 'progress':
        return <FileText className="h-4 w-4" />;
    }
  };

  const getEmailTypeColor = (type: SentEmail['type']) => {
    switch (type) {
      case 'submission':
        return 'text-primary';
      case 'grade_release':
        return 'text-accent-foreground';
      case 'progress':
        return 'text-chart-4';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/teacher/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Email Notifications</h1>
              <p className="text-sm text-muted-foreground">Configure automatic email notifications for students</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={!hasChanges}>
            <Check className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Main Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" as const }}
        >
          <Card className={settings.enabled ? 'border-primary/30 bg-primary/5' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${settings.enabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    <Mail className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Email Notifications</h3>
                    <p className="text-sm text-muted-foreground">
                      {settings.enabled
                        ? 'Students will receive email notifications automatically'
                        : 'Email notifications are currently disabled'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.enabled}
                  onCheckedChange={(checked: boolean) => handleSettingChange('enabled', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Notification Types */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" as const }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Types
              </CardTitle>
              <CardDescription>
                Choose when students should receive email notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className={`flex items-center justify-between p-4 rounded-lg border ${settings.enabled ? 'bg-card' : 'bg-muted/50 opacity-60'}`}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Send className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">Exam Submission</h4>
                    <p className="text-sm text-muted-foreground">
                      Send when a student submits an exam with auto-graded results
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.sendOnSubmission}
                  onCheckedChange={(checked: boolean) => handleSettingChange('sendOnSubmission', checked)}
                  disabled={!settings.enabled}
                />
              </div>

              <div className={`flex items-center justify-between p-4 rounded-lg border ${settings.enabled ? 'bg-card' : 'bg-muted/50 opacity-60'}`}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Check className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">Grade Release</h4>
                    <p className="text-sm text-muted-foreground">
                      Send when final grades are released after manual grading
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.sendOnGradeRelease}
                  onCheckedChange={(checked: boolean) => handleSettingChange('sendOnGradeRelease', checked)}
                  disabled={!settings.enabled}
                />
              </div>

              <div className={`flex items-center justify-between p-4 rounded-lg border ${settings.enabled ? 'bg-card' : 'bg-muted/50 opacity-60'}`}>
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-chart-4/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-chart-4" />
                  </div>
                  <div>
                    <h4 className="font-medium text-foreground">Progress Updates</h4>
                    <p className="text-sm text-muted-foreground">
                      Send weekly progress summaries to students
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.sendProgressUpdates}
                  onCheckedChange={(checked: boolean) => handleSettingChange('sendProgressUpdates', checked)}
                  disabled={!settings.enabled}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Email Content Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" as const }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Content Settings
              </CardTitle>
              <CardDescription>
                Customize what information is included in emails
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className={`flex items-center justify-between ${!settings.enabled && 'opacity-60'}`}>
                <div>
                  <Label htmlFor="detailed-scores" className="font-medium">Include Detailed Scores</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Show exact scores and percentages in notification emails
                  </p>
                </div>
                <Switch
                  id="detailed-scores"
                  checked={settings.includeDetailedScores}
                  onCheckedChange={(checked: boolean) => handleSettingChange('includeDetailedScores', checked)}
                  disabled={!settings.enabled}
                />
              </div>

              <Separator />

              <div className={!settings.enabled ? 'opacity-60' : ''}>
                <Label htmlFor="signature">Custom Email Signature (Optional)</Label>
                <Textarea
                  id="signature"
                  value={settings.customSignature || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    handleSettingChange('customSignature', e.target.value)
                  }
                  placeholder="Add a custom signature to appear at the end of all notification emails..."
                  rows={3}
                  className="mt-2"
                  disabled={!settings.enabled}
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Sent Emails */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3, ease: "easeOut" as const }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Inbox className="h-5 w-5" />
                Recent Email Activity
              </CardTitle>
              <CardDescription>
                View recently sent notification emails
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sentEmails.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No emails sent yet</p>
                  <p className="text-sm mt-1">Emails will appear here once students start taking exams</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sentEmails.slice(0, 10).map((email, index) => (
                    <motion.div
                      key={email.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03, duration: 0.2 }}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-secondary/30 transition-colors"
                    >
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center ${getEmailTypeColor(email.type)}`}>
                        {getEmailTypeIcon(email.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">
                            {email.toName || email.to}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {email.type === 'submission' ? 'Submission' :
                             email.type === 'grade_release' ? 'Grade' : 'Progress'}
                          </Badge>
                          {email.status === 'sent' && (
                            <Badge variant="secondary" className="text-xs bg-accent/10 text-accent-foreground">
                              Sent
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {email.subject}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(email.sentAt, { addSuffix: true })}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4, ease: "easeOut" as const }}
        >
          <Card className="bg-secondary/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-foreground mb-2">How Email Notifications Work</h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Students automatically receive emails when they submit exams with their auto-graded scores</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>When you finish grading manually, students get a notification with their final grades</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Progress updates summarize recent exam performance and trends</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>In-app notifications are always sent alongside emails for students who prefer the portal</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
