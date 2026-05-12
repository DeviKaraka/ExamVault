/**
 * organization-settings.tsx — Admin Dashboard & Organization Management
 *
 * Provides:
 *  - Live platform stats (exams, students, teachers, active exams)
 *  - Institution configuration
 *  - User management table
 *  - Audit log viewer
 *  - Power BI Embedded analytics (scaffold + live iframe)
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";

// ─── Types ───────────────────────────────────────────────────────────────────

interface PlatformStats {
  totalExams: number;
  activeExams: number;
  totalStudents: number;
  totalTeachers: number;
  examsTodayCount: number;
  avgScore: number;
}

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: "student" | "teacher" | "admin";
  status: "active" | "suspended";
  lastLogin: string;
}

interface AuditEntry {
  id: string;
  timestamp: string;
  userId: string;
  action: string;
  details: string;
  severity: "info" | "warning" | "critical";
}

// ─── Mock data (replace with service calls) ──────────────────────────────────

const MOCK_STATS: PlatformStats = {
  totalExams: 48,
  activeExams: 3,
  totalStudents: 312,
  totalTeachers: 18,
  examsTodayCount: 5,
  avgScore: 72.4,
};

const MOCK_USERS: UserRecord[] = [
  { id: "u1", name: "Ananya Sharma", email: "ananya@inst.edu", role: "student", status: "active", lastLogin: "2026-05-11" },
  { id: "u2", name: "Dr. Ramesh Kumar", email: "ramesh@inst.edu", role: "teacher", status: "active", lastLogin: "2026-05-12" },
  { id: "u3", name: "Priya Nair", email: "priya@inst.edu", role: "student", status: "suspended", lastLogin: "2026-05-09" },
  { id: "u4", name: "Vikram Singh", email: "vikram@inst.edu", role: "teacher", status: "active", lastLogin: "2026-05-10" },
];

const MOCK_AUDIT: AuditEntry[] = [
  { id: "a1", timestamp: "2026-05-12 09:14:22", userId: "u2", action: "EXAM_CREATED", details: "Created exam: Data Structures Mid-Term", severity: "info" },
  { id: "a2", timestamp: "2026-05-12 10:02:55", userId: "u3", action: "PROCTORING_VIOLATION", details: "Tab switch detected during exam #EX-042", severity: "warning" },
  { id: "a3", timestamp: "2026-05-11 14:30:01", userId: "u1", action: "EXAM_SUBMITTED", details: "Submitted exam #EX-041, score: 85/100", severity: "info" },
  { id: "a4", timestamp: "2026-05-11 08:00:00", userId: "system", action: "BACKUP_COMPLETED", details: "Daily data backup completed successfully", severity: "info" },
  { id: "a5", timestamp: "2026-05-10 16:45:12", userId: "u3", action: "EXAM_AUTO_TERMINATED", details: "Exam auto-terminated after 3 proctoring violations", severity: "critical" },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function PowerBIEmbed({ reportUrl }: { reportUrl?: string }) {
  // If a real Power BI embed URL is configured, render the iframe.
  // Otherwise render a setup placeholder.
  if (reportUrl) {
    return (
      <div className="w-full rounded-lg overflow-hidden border" style={{ height: 480 }}>
        <iframe
          title="ExamVault Power BI Analytics"
          src={reportUrl}
          allowFullScreen
          className="w-full h-full border-0"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/30 bg-muted/20 p-12 text-center">
      <div className="text-4xl mb-4">📊</div>
      <h3 className="text-lg font-semibold mb-2">Power BI Dashboard</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">
        Connect a Microsoft Power BI Embedded report to visualize cohort performance,
        exam trends, and student outcome forecasts.
      </p>
      <p className="text-xs text-muted-foreground mb-4">
        Set <code className="bg-muted px-1 rounded">VITE_POWERBI_EMBED_URL</code> in your
        environment variables to activate.
      </p>
      <Button variant="outline" size="sm" asChild>
        <a
          href="https://learn.microsoft.com/en-us/power-bi/developer/embedded/embed-sample-for-customers"
          target="_blank"
          rel="noopener noreferrer"
        >
          Power BI Embed Setup Guide →
        </a>
      </Button>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function OrganizationSettings() {
  const [stats, setStats] = useState<PlatformStats>(MOCK_STATS);
  const [users, setUsers] = useState<UserRecord[]>(MOCK_USERS);
  const [audit, setAudit] = useState<AuditEntry[]>(MOCK_AUDIT);
  const [userSearch, setUserSearch] = useState("");
  const [orgName, setOrgName] = useState("ExamVault Institution");
  const [saved, setSaved] = useState(false);

  // TODO: replace with real service calls
  useEffect(() => {
    // examService.getStats().then(setStats);
    // userService.listAll().then(setUsers);
    // auditService.recent(50).then(setAudit);
  }, []);

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  function handleSaveSettings() {
    // TODO: call /api/admin/settings with orgName
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function toggleUserStatus(userId: string) {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, status: u.status === "active" ? "suspended" : "active" }
          : u
      )
    );
  }

  const severityColor: Record<AuditEntry["severity"], string> = {
    info: "default",
    warning: "secondary",
    critical: "destructive",
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Organization Settings</h1>
          <p className="text-sm text-muted-foreground">
            Platform-wide administration and monitoring
          </p>
        </div>
        <Badge variant="outline" className="text-green-600 border-green-600">
          {stats.activeExams} Active Exam{stats.activeExams !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard label="Total Exams" value={stats.totalExams} />
        <StatCard label="Active Now" value={stats.activeExams} sub="in progress" />
        <StatCard label="Students" value={stats.totalStudents} />
        <StatCard label="Teachers" value={stats.totalTeachers} />
        <StatCard label="Exams Today" value={stats.examsTodayCount} />
        <StatCard label="Avg Score" value={`${stats.avgScore}%`} sub="platform-wide" />
      </div>

      <Tabs defaultValue="analytics">
        <TabsList>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Power BI Analytics Tab */}
        <TabsContent value="analytics" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Analytics Dashboard</CardTitle>
            </CardHeader>
            <CardContent>
              <PowerBIEmbed
                reportUrl={
                  typeof import.meta !== "undefined"
                    ? (import.meta as Record<string, Record<string, string>>).env?.VITE_POWERBI_EMBED_URL
                    : undefined
                }
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Management Tab */}
        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Users</CardTitle>
              <Input
                placeholder="Search by name or email…"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-64"
              />
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{u.role}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={u.status === "active" ? "default" : "destructive"}
                        >
                          {u.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{u.lastLogin}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleUserStatus(u.id)}
                        >
                          {u.status === "active" ? "Suspend" : "Reactivate"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit Log</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Severity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {audit.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono text-xs">{entry.timestamp}</TableCell>
                      <TableCell>{entry.userId}</TableCell>
                      <TableCell className="font-mono text-xs">{entry.action}</TableCell>
                      <TableCell className="text-sm">{entry.details}</TableCell>
                      <TableCell>
                        <Badge variant={severityColor[entry.severity] as "default" | "secondary" | "destructive"}>
                          {entry.severity}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Institution Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 max-w-lg">
              <div>
                <label className="text-sm font-medium">Organization Name</label>
                <Input
                  className="mt-1"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Power BI Embed URL</label>
                <Input
                  className="mt-1"
                  placeholder="https://app.powerbi.com/reportEmbed?reportId=..."
                  defaultValue=""
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Paste your Power BI embedded report URL to activate the analytics dashboard.
                </p>
              </div>
              <div>
                <label className="text-sm font-medium">Azure AD Tenant ID</label>
                <Input className="mt-1" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
              </div>
              <Button onClick={handleSaveSettings}>
                {saved ? "✓ Saved" : "Save Settings"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
