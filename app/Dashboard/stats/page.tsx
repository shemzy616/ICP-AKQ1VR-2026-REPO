import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/auth";
import connectDB from "@/lib/db";
import { Board, Column, JobApplication } from "@/lib/models";

type StatsJob = {
  _id: string;
  createdAt: string;
  columnId?: string;
  customFields?: Array<{ key?: string; value?: string }>;
};

type StatsColumn = {
  _id: string;
  name: string;
  order: number;
};

type WeeklyBucket = {
  label: string;
  count: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysAgo(anchor: Date, days: number) {
  return new Date(anchor.getTime() - days * DAY_MS);
}

function countInRange(dates: Date[], start: Date, endExclusive: Date) {
  return dates.filter((date) => date >= start && date < endExclusive).length;
}

function percentageChange(current: number, previous: number) {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return ((current - previous) / previous) * 100;
}

function formatPercentage(value: number) {
  const rounded = Math.round(value);
  if (rounded > 0) return `+${rounded}%`;
  return `${rounded}%`;
}

function buildWeeklyBuckets(dates: Date[], today: Date): WeeklyBucket[] {
  const windowStart = daysAgo(today, 55);
  return Array.from({ length: 8 }, (_, index) => {
    const bucketStart = new Date(windowStart.getTime() + index * 7 * DAY_MS);
    const bucketEnd = new Date(bucketStart.getTime() + 7 * DAY_MS);
    const label = bucketStart.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

    return {
      label,
      count: countInRange(dates, bucketStart, bucketEnd),
    };
  });
}

export default async function StatsPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/sign-in");
  }

  await connectDB();

  const boardDoc = await Board.findOne({
    userId: session.user.id,
    name: "My Job Applications",
  })
    .select("_id")
    .lean();

  if (!boardDoc?._id) {
    return (
      <div className="min-h-screen bg-white">
        <div className="container mx-auto px-4 py-8">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">Stats</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-black">Application Velocity</h1>
          <p className="mt-4 text-zinc-600">No board found yet. Create your first application to unlock insights.</p>
          <Link href="/Dashboard" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-black underline underline-offset-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const [jobsRaw, columnsRaw] = await Promise.all([
    JobApplication.find({ userId: session.user.id })
      .select("_id createdAt columnId customFields")
      .lean(),
    Column.find({ boardId: boardDoc._id })
      .select("_id name order")
      .sort({ order: 1 })
      .lean(),
  ]);

  const jobs = JSON.parse(JSON.stringify(jobsRaw)) as StatsJob[];
  const columns = JSON.parse(JSON.stringify(columnsRaw)) as StatsColumn[];

  const validDates = jobs
    .map((job) => new Date(job.createdAt))
    .filter((date) => !Number.isNaN(date.getTime()));

  const today = startOfDay(new Date());
  const tomorrow = new Date(today.getTime() + DAY_MS);
  const last7Start = daysAgo(today, 6);
  const prev7Start = daysAgo(today, 13);
  const prev7End = last7Start;
  const last30Start = daysAgo(today, 29);

  const totalApplications = jobs.length;
  const last7Count = countInRange(validDates, last7Start, tomorrow);
  const previous7Count = countInRange(validDates, prev7Start, prev7End);
  const last30Count = countInRange(validDates, last30Start, tomorrow);
  const velocityDelta = percentageChange(last7Count, previous7Count);
  const projected30Days = Math.round((last7Count / 7) * 30);
  const weeklyAverage8Weeks = Math.round((countInRange(validDates, daysAgo(today, 55), tomorrow) / 8) * 10) / 10;
  const weeklyBuckets = buildWeeklyBuckets(validDates, today);
  const maxWeeklyCount = Math.max(...weeklyBuckets.map((bucket) => bucket.count), 1);

  const statusByColumnId = new Map<string, string>(
    columns.map((column) => [column._id, column.name])
  );
  const statusCounts = new Map<string, number>(
    columns.map((column) => [column.name, 0])
  );

  for (const job of jobs) {
    const statusName = statusByColumnId.get(job.columnId || "") || "Uncategorized";
    statusCounts.set(statusName, (statusCounts.get(statusName) || 0) + 1);
  }

  const funnelRows = Array.from(statusCounts.entries())
    .map(([name, count]) => ({
      name,
      count,
      percentage: totalApplications === 0 ? 0 : Math.round((count / totalApplications) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  const customFieldFrequency = new Map<string, { label: string; count: number }>();
  let jobsWithCustomFields = 0;

  for (const job of jobs) {
    const normalized = (job.customFields || [])
      .map((field) => ({
        key: (field.key || "").trim(),
        value: (field.value || "").trim(),
      }))
      .filter((field) => field.key.length > 0);

    if (normalized.length > 0) {
      jobsWithCustomFields += 1;
    }

    for (const field of normalized) {
      const normalizedKey = field.key.toLowerCase();
      const current = customFieldFrequency.get(normalizedKey);
      if (!current) {
        customFieldFrequency.set(normalizedKey, { label: field.key, count: 1 });
      } else {
        current.count += 1;
      }
    }
  }

  const topCustomFields = Array.from(customFieldFrequency.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 border-b border-zinc-200 pb-6">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Stats</p>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold tracking-tight text-black">Application Velocity</h1>
              <p className="mt-2 max-w-2xl text-sm text-zinc-600">
                A factual view of your pace, weekly trend, and stage distribution so you can adjust your search strategy early.
              </p>
            </div>
            <Link
              href="/Dashboard"
              className="inline-flex items-center gap-2 border border-zinc-200 px-3 py-2 text-sm font-medium text-black transition-colors hover:bg-zinc-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
          </div>
        </div>

        {totalApplications === 0 ? (
          <Card className="border-zinc-200 shadow-none">
            <CardContent className="py-10">
              <p className="text-sm uppercase tracking-[0.2em] text-zinc-500">No Data Yet</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-black">Start logging applications</h2>
              <p className="mt-2 text-zinc-600">
                Add your first few applications and this page will show your true weekly pace, funnel health, and custom field usage.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <Card className="border-zinc-200 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase tracking-[0.2em] text-zinc-500">Applications / 7d</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="text-4xl font-bold tracking-tight text-black">{last7Count}</p>
                  <p className="text-sm text-zinc-600">{formatPercentage(velocityDelta)} vs previous 7 days</p>
                </CardContent>
              </Card>
              <Card className="border-zinc-200 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase tracking-[0.2em] text-zinc-500">Applications / 30d</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="text-4xl font-bold tracking-tight text-black">{last30Count}</p>
                  <p className="text-sm text-zinc-600">Projected 30-day pace: {projected30Days}</p>
                </CardContent>
              </Card>
              <Card className="border-zinc-200 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase tracking-[0.2em] text-zinc-500">8-Week Avg</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="text-4xl font-bold tracking-tight text-black">{weeklyAverage8Weeks}</p>
                  <p className="text-sm text-zinc-600">Applications per week (rolling)</p>
                </CardContent>
              </Card>
              <Card className="border-zinc-200 shadow-none">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase tracking-[0.2em] text-zinc-500">Custom Field Coverage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1">
                  <p className="text-4xl font-bold tracking-tight text-black">
                    {Math.round((jobsWithCustomFields / totalApplications) * 100)}%
                  </p>
                  <p className="text-sm text-zinc-600">{jobsWithCustomFields} of {totalApplications} applications</p>
                </CardContent>
              </Card>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[2fr_1fr]">
              <Card className="border-zinc-200 shadow-none">
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-black">Weekly Velocity (Last 8 Weeks)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-8 items-end gap-2">
                    {weeklyBuckets.map((bucket) => (
                      <div key={bucket.label} className="space-y-2 text-center">
                        <div className="h-36 border border-zinc-200 bg-zinc-50 p-1">
                          <div
                            className="mx-auto w-full bg-black"
                            style={{
                              height: `${Math.max(8, Math.round((bucket.count / maxWeeklyCount) * 100))}%`,
                            }}
                          />
                        </div>
                        <p className="text-[10px] font-medium uppercase tracking-wide text-zinc-500">{bucket.label}</p>
                        <p className="text-sm font-semibold text-black">{bucket.count}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="border-zinc-200 shadow-none">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold text-black">Funnel Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {funnelRows.map((row) => (
                      <div key={row.name} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-black">{row.name}</span>
                          <span className="text-zinc-600">{row.count} ({row.percentage}%)</span>
                        </div>
                        <div className="h-2 w-full bg-zinc-100">
                          <div className="h-full bg-black" style={{ width: `${row.percentage}%` }} />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-zinc-200 shadow-none">
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold text-black">Top Custom Fields</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {topCustomFields.length === 0 ? (
                      <p className="text-sm text-zinc-600">No custom fields tracked yet.</p>
                    ) : (
                      topCustomFields.map((field) => (
                        <div key={field.label} className="flex items-center justify-between border-b border-zinc-100 pb-2 text-sm last:border-b-0">
                          <span className="font-medium text-black">{field.label}</span>
                          <span className="text-zinc-600">{field.count}</span>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
