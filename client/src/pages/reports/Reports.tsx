import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RefreshCw, ShieldAlert, ShieldCheck, Play, Code2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/axiosinstance";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Row = Record<string, string | number | null>;

interface Report {
  key: string;
  title: string;
  source: string;
  concept: string;
  chart: { x: string; bars: string[] } | null;
  sql: string;
  rows: Row[];
}

interface ReportsResponse {
  totals: Record<string, string>;
  reports: Report[];
}

interface Scenario {
  key: string;
  title: string;
  rule: string;
  kind: string;
  note: string | null;
  sql: string[];
}

interface LabResult {
  rejected: boolean;
  dataChanged: boolean;
  sqlstate?: string;
  constraint?: string | null;
  table?: string | null;
  message?: string;
  detail?: string | null;
}

const BAR_COLORS = ["#2563eb", "#16a34a", "#f59e0b"];

function ReportCard({ report }: { report: Report }) {
  const [showSql, setShowSql] = useState(false);
  const columns = report.rows.length ? Object.keys(report.rows[0]) : [];

  // recharts needs numbers; node-pg returns COUNT/SUM as strings
  const chartData = report.chart
    ? report.rows.map((row) => {
        const point: Record<string, string | number> = {
          [report.chart!.x]: String(row[report.chart!.x]),
        };
        report.chart!.bars.forEach((bar) => (point[bar] = Number(row[bar])));
        return point;
      })
    : [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{report.title}</CardTitle>
            <CardDescription className="mt-1">
              <span className="font-medium">Reads:</span> {report.source}
              <br />
              <span className="font-medium">Concept:</span> {report.concept}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSql((v) => !v)}
            className="shrink-0"
          >
            <Code2 className="h-4 w-4 mr-1" />
            {showSql ? "Hide SQL" : "Show SQL"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showSql && (
          <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto whitespace-pre-wrap">
            {report.sql}
          </pre>
        )}

        {report.chart && chartData.length > 0 && (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey={report.chart.x} tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <ChartTooltip />
                <Legend />
                {report.chart.bars.map((bar, i) => (
                  <Bar
                    key={bar}
                    dataKey={bar}
                    fill={BAR_COLORS[i % BAR_COLORS.length]}
                    radius={[3, 3, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columns.map((c) => (
                  <TableHead key={c} className="whitespace-nowrap capitalize">
                    {c.replace(/_/g, " ")}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {report.rows.length === 0 ? (
                <TableRow>
                  <TableCell className="text-center text-muted-foreground">
                    No rows
                  </TableCell>
                </TableRow>
              ) : (
                report.rows.map((row, i) => (
                  <TableRow key={i}>
                    {columns.map((c) => (
                      <TableCell key={c} className="whitespace-nowrap">
                        {row[c] === null ? "-" : String(row[c])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function IntegrityLab() {
  const [results, setResults] = useState<Record<string, LabResult>>({});
  const [running, setRunning] = useState<string | null>(null);

  const { data: scenarios = [], isLoading } = useQuery<Scenario[]>({
    queryKey: ["integrityLabScenarios"],
    queryFn: async () => (await api.get("/reports/integrity-lab")).data,
    refetchOnWindowFocus: false,
  });

  const run = async (key: string) => {
    setRunning(key);
    try {
      const res = await api.post("/reports/integrity-lab/run", {
        scenario: key,
      });
      setResults((prev) => ({ ...prev, [key]: res.data }));
    } catch {
      toast.error("Could not run the scenario");
    } finally {
      setRunning(null);
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Each scenario tries to break one rule. It runs inside a transaction that
        is <strong>always rolled back</strong>, so no data changes. The
        rejection below comes from the database itself (constraint or
        trigger), not from application code.
      </p>
      <div className="grid gap-4 md:grid-cols-2">
        {scenarios.map((sc) => {
          const result = results[sc.key];
          return (
            <Card key={sc.key}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">{sc.title}</CardTitle>
                  <Badge variant="secondary">{sc.kind}</Badge>
                </div>
                <CardDescription>{sc.rule}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {sc.note && (
                  <p className="text-xs text-muted-foreground">{sc.note}</p>
                )}
                <pre className="rounded-md bg-muted p-2 text-xs overflow-x-auto whitespace-pre-wrap">
                  {sc.sql.join(";\n")}
                </pre>
                <Button
                  size="sm"
                  onClick={() => run(sc.key)}
                  disabled={running === sc.key}
                >
                  <Play className="h-4 w-4 mr-1" />
                  {running === sc.key ? "Running…" : "Run it"}
                </Button>

                {result && (
                  <div
                    className={`rounded-md border p-3 text-sm ${
                      result.rejected
                        ? "border-green-600/40 bg-green-50 dark:bg-green-950/30"
                        : "border-red-600/40 bg-red-50 dark:bg-red-950/30"
                    }`}
                  >
                    <div className="flex items-center gap-2 font-medium">
                      {result.rejected ? (
                        <ShieldCheck className="h-4 w-4 text-green-600" />
                      ) : (
                        <ShieldAlert className="h-4 w-4 text-red-600" />
                      )}
                      {result.rejected
                        ? "Rejected by the database"
                        : "Accepted (rule not enforced!)"}
                    </div>
                    {result.rejected && (
                      <div className="mt-2 space-y-1 text-xs">
                        <p>
                          <span className="font-medium">SQLSTATE:</span>{" "}
                          {result.sqlstate}
                          {result.constraint && (
                            <>
                              {" · "}
                              <span className="font-medium">Constraint:</span>{" "}
                              {result.constraint}
                            </>
                          )}
                        </p>
                        <p className="break-words">{result.message}</p>
                        {result.detail && (
                          <p className="break-words text-muted-foreground">
                            {result.detail}
                          </p>
                        )}
                        <p className="text-muted-foreground">
                          Data changed: {result.dataChanged ? "yes" : "no"}{" "}
                          (rolled back)
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default function Reports() {
  const { data, isLoading, isFetching, error, refetch } =
    useQuery<ReportsResponse>({
      queryKey: ["adminReports"],
      queryFn: async () => (await api.get("/reports")).data,
      refetchOnWindowFocus: false,
    });

  const totals: [string, string][] = data
    ? [
        ["Users", data.totals.users],
        ["Posts", data.totals.posts],
        ["Comments", data.totals.comments],
        ["Likes", data.totals.likes],
        ["Subscriptions", data.totals.subscriptions],
        ["Pending requests", data.totals.pending_requests],
      ]
    : [];

  return (
    <div className="w-full space-y-6 p-4 md:p-0">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Live analytics computed by PostgreSQL views and queries.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw
            className={`h-4 w-4 mr-1 ${isFetching ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="reports">
        <TabsList>
          <TabsTrigger value="reports">Analytics</TabsTrigger>
          <TabsTrigger value="lab">Integrity Lab</TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="space-y-6 mt-4">
          {isLoading && (
            <p className="text-sm text-muted-foreground">Loading reports…</p>
          )}
          {error ? (
            <p className="text-sm text-red-600">Failed to load reports.</p>
          ) : null}
          {data && (
            <>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
                {totals.map(([label, value]) => (
                  <Card key={label}>
                    <CardContent className="p-4">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="text-2xl font-semibold">{value}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <div className="grid gap-4 xl:grid-cols-2">
                {data.reports.map((r) => (
                  <ReportCard key={r.key} report={r} />
                ))}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="lab" className="mt-4">
          <IntegrityLab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
