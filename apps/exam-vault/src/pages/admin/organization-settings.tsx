import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  Building2,
  Shield,
  Users,
  Globe,
  Plus,
  X,
  Trash2,
  Save,
  ArrowLeft,
  Check,
  AlertTriangle,
  Mail,
  Clock,
  UserCog,
  Settings,
  Eye,
  EyeOff,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import {
  orgSettingsAtom,
  updateOrgSettingsAtom,
  registeredUsersAtom,
  adminUsersAtom,
  addAdminAtom,
  removeAdminAtom,
  isAdminAtom,
  type OrganizationSettings,
  type RegisteredUser,
} from '@/lib/store';

export default function OrganizationSettingsPage() {
  const navigate = useNavigate();
  const [orgSettings, setOrgSettings] = useAtom(orgSettingsAtom);
  const updateOrgSettings = useSetAtom(updateOrgSettingsAtom);
  const registeredUsers = useAtomValue(registeredUsersAtom);
  const adminUsers = useAtomValue(adminUsersAtom);
  const addAdmin = useSetAtom(addAdminAtom);
  const removeAdmin = useSetAtom(removeAdminAtom);
  const isAdmin = useAtomValue(isAdminAtom);

  const [localSettings, setLocalSettings] = useState<OrganizationSettings>(orgSettings);
  const [newDomain, setNewDomain] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [showRemoveAdminDialog, setShowRemoveAdminDialog] = useState(false);
  const [adminToRemove, setAdminToRemove] = useState<string | null>(null);
  const [searchUsers, setSearchUsers] = useState('');

  useEffect(() => {
    setLocalSettings(orgSettings);
  }, [orgSettings]);

  useEffect(() => {
    const changed =
      localSettings.organizationName !== orgSettings.organizationName ||
      localSettings.restrictToOrganization !== orgSettings.restrictToOrganization ||
      JSON.stringify(localSettings.allowedDomains) !== JSON.stringify(orgSettings.allowedDomains);
    setHasChanges(changed);
  }, [localSettings, orgSettings]);

  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin) {
      toast.error('Access denied. Admin privileges required.');
      navigate('/teacher');
    }
  }, [isAdmin, navigate]);

  const handleAddDomain = () => {
    const domain = newDomain.trim().toLowerCase();
    if (!domain) {
      toast.error('Please enter a domain');
      return;
    }
    if (localSettings.allowedDomains.includes(domain)) {
      toast.error('Domain already exists');
      return;
    }
    if (!/^[a-z0-9][a-z0-9-]*\.[a-z]{2,}$/i.test(domain)) {
      toast.error('Invalid domain format (e.g., school.edu)');
      return;
    }
    setLocalSettings({
      ...localSettings,
      allowedDomains: [...localSettings.allowedDomains, domain],
    });
    setNewDomain('');
    toast.success(`Domain "${domain}" added`);
  };

  const handleRemoveDomain = (domain: string) => {
    if (localSettings.allowedDomains.length === 1) {
      toast.error('At least one domain must remain');
      return;
    }
    setLocalSettings({
      ...localSettings,
      allowedDomains: localSettings.allowedDomains.filter((d: string) => d !== domain),
    });
    toast.success(`Domain "${domain}" removed`);
  };

  const handleSaveSettings = () => {
    if (!localSettings.organizationName.trim()) {
      toast.error('Organization name is required');
      return;
    }
    updateOrgSettings(localSettings);
    toast.success('Organization settings saved successfully');
  };

  const handleAddAdmin = () => {
    const email = newAdminEmail.trim().toLowerCase();
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }
    if (!email.includes('@')) {
      toast.error('Invalid email format');
      return;
    }
    if (adminUsers.includes(email)) {
      toast.error('This user is already an admin');
      return;
    }
    addAdmin(email);
    setNewAdminEmail('');
    toast.success(`Admin access granted to ${email}`);
  };

  const handleRemoveAdmin = () => {
    if (adminToRemove) {
      if (adminUsers.length === 1) {
        toast.error('Cannot remove the last admin');
        setShowRemoveAdminDialog(false);
        setAdminToRemove(null);
        return;
      }
      removeAdmin(adminToRemove);
      toast.success(`Admin access revoked from ${adminToRemove}`);
      setShowRemoveAdminDialog(false);
      setAdminToRemove(null);
    }
  };

  const filteredUsers = registeredUsers.filter((user: RegisteredUser) =>
    searchUsers
      ? user.email.toLowerCase().includes(searchUsers.toLowerCase()) ||
        user.name.toLowerCase().includes(searchUsers.toLowerCase())
      : true
  );

  const teachers = filteredUsers.filter((u: RegisteredUser) => u.role === 'teacher');
  const students = filteredUsers.filter((u: RegisteredUser) => u.role === 'student');

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

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/teacher')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Settings className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Organization Settings</h1>
                <p className="text-sm text-muted-foreground">Manage access control and user administration</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {hasChanges && (
              <Badge variant="outline" className="text-chart-4 border-chart-4/50">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Unsaved changes
              </Badge>
            )}
            <Button onClick={handleSaveSettings} disabled={!hasChanges}>
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-8"
        >
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="general" className="gap-2">
                <Building2 className="h-4 w-4" />
                General
              </TabsTrigger>
              <TabsTrigger value="domains" className="gap-2">
                <Globe className="h-4 w-4" />
                Domains
              </TabsTrigger>
              <TabsTrigger value="admins" className="gap-2">
                <Shield className="h-4 w-4" />
                Administrators
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                Users
              </TabsTrigger>
            </TabsList>

            {/* General Settings Tab */}
            <TabsContent value="general">
              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      Organization Details
                    </CardTitle>
                    <CardDescription>
                      Configure your organization's identity and access settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="orgName">Organization Name</Label>
                      <Input
                        id="orgName"
                        value={localSettings.organizationName}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setLocalSettings({ ...localSettings, organizationName: e.target.value })
                        }
                        placeholder="Enter organization name"
                        className="max-w-md"
                      />
                      <p className="text-sm text-muted-foreground">
                        This name appears on login pages and throughout the application
                      </p>
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <Label htmlFor="restrict" className="text-base font-medium">
                          Restrict Access to Organization
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Only allow users with approved email domains to register and login
                        </p>
                      </div>
                      <Switch
                        id="restrict"
                        checked={localSettings.restrictToOrganization}
                        onCheckedChange={(checked: boolean) =>
                          setLocalSettings({ ...localSettings, restrictToOrganization: checked })
                        }
                      />
                    </div>

                    {!localSettings.restrictToOrganization && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <div className="p-4 bg-chart-4/10 border border-chart-4/30 rounded-lg flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-chart-4 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-card-foreground">Open Registration Enabled</p>
                            <p className="text-sm text-muted-foreground">
                              Anyone with any email address can register. Enable organization restriction for better security.
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Domains Tab */}
            <TabsContent value="domains">
              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      Allowed Email Domains
                    </CardTitle>
                    <CardDescription>
                      Users can only register with email addresses from these domains
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {!localSettings.restrictToOrganization && (
                      <div className="p-4 bg-muted/50 rounded-lg flex items-start gap-3">
                        <EyeOff className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-muted-foreground">
                          Domain restrictions are not enforced because "Restrict Access to Organization" is disabled.
                        </p>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <div className="relative flex-1 max-w-md">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={newDomain}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewDomain(e.target.value)}
                          placeholder="example.edu"
                          className="pl-10"
                          onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleAddDomain()}
                        />
                      </div>
                      <Button onClick={handleAddDomain}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Domain
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <AnimatePresence mode="popLayout">
                        {localSettings.allowedDomains.map((domain: string, index: number) => (
                          <motion.div
                            key={domain}
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: index * 0.05 }}
                            className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-secondary/30 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <Globe className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <span className="font-medium text-card-foreground">@{domain}</span>
                                <p className="text-xs text-muted-foreground">
                                  {registeredUsers.filter(
                                    (u: RegisteredUser) => u.email.endsWith(`@${domain}`)
                                  ).length}{' '}
                                  registered users
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveDomain(domain)}
                              disabled={localSettings.allowedDomains.length === 1}
                            >
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Administrators Tab */}
            <TabsContent value="admins">
              <motion.div variants={itemVariants}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      System Administrators
                    </CardTitle>
                    <CardDescription>
                      Admins have full access to organization settings and user management
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex gap-3">
                      <div className="relative flex-1 max-w-md">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={newAdminEmail}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAdminEmail(e.target.value)}
                          placeholder="admin@school.edu"
                          className="pl-10"
                          onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleAddAdmin()}
                        />
                      </div>
                      <Button onClick={handleAddAdmin}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Admin
                      </Button>
                    </div>

                    <div className="space-y-2">
                      <AnimatePresence mode="popLayout">
                        {adminUsers.map((email: string, index: number) => {
                          const user = registeredUsers.find(
                            (u: RegisteredUser) => u.email.toLowerCase() === email.toLowerCase()
                          );
                          return (
                            <motion.div
                              key={email}
                              layout
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ delay: index * 0.05 }}
                              className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-secondary/30 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-chart-3/10">
                                  <Shield className="h-5 w-5 text-chart-3" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-card-foreground">
                                      {user?.name || email}
                                    </span>
                                    {user?.role && (
                                      <Badge variant="outline" className="text-xs capitalize">
                                        {user.role}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">{email}</p>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setAdminToRemove(email);
                                  setShowRemoveAdminDialog(true);
                                }}
                                disabled={adminUsers.length === 1}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>

                    {adminUsers.length === 1 && (
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        At least one administrator must remain in the system
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Users Tab */}
            <TabsContent value="users">
              <motion.div variants={itemVariants} className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Registered Users
                        </CardTitle>
                        <CardDescription>
                          View all teachers and students registered in the system
                        </CardDescription>
                      </div>
                      <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={searchUsers}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchUsers(e.target.value)}
                          placeholder="Search users..."
                          className="pl-10 w-64"
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-primary/10">
                            <UserCog className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-card-foreground">{teachers.length}</p>
                            <p className="text-sm text-muted-foreground">Teachers</p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 rounded-lg bg-accent/5 border border-accent/20">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-accent/10">
                            <Users className="h-5 w-5 text-accent-foreground" />
                          </div>
                          <div>
                            <p className="text-2xl font-bold text-card-foreground">{students.length}</p>
                            <p className="text-sm text-muted-foreground">Students</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {filteredUsers.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>{searchUsers ? 'No users match your search' : 'No users registered yet'}</p>
                      </div>
                    ) : (
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Role</TableHead>
                              <TableHead>Registered</TableHead>
                              <TableHead>Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredUsers.map((user: RegisteredUser) => (
                              <TableRow key={user.email}>
                                <TableCell className="font-medium">{user.name}</TableCell>
                                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant={user.role === 'teacher' ? 'default' : 'secondary'}
                                    className="capitalize"
                                  >
                                    {user.role}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground">
                                  <span title={format(user.registeredAt, 'PPpp')}>
                                    {formatDistanceToNow(user.registeredAt, { addSuffix: true })}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {adminUsers.includes(user.email.toLowerCase()) ? (
                                    <Badge variant="outline" className="text-chart-3 border-chart-3/50">
                                      <Shield className="h-3 w-3 mr-1" />
                                      Admin
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-muted-foreground">
                                      <Check className="h-3 w-3 mr-1" />
                                      Active
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      {/* Remove Admin Dialog */}
      <AlertDialog open={showRemoveAdminDialog} onOpenChange={setShowRemoveAdminDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Administrator?</AlertDialogTitle>
            <AlertDialogDescription>
              This will revoke admin access for <strong>{adminToRemove}</strong>. They will no longer
              be able to access organization settings or manage users.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveAdmin}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Admin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
