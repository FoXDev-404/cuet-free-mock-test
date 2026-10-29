"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHeader, TableRow, TableContainer } from "@/components/ui/table";

export default function MockHistoryPage() {
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/attempts");
        if (!res.ok) throw new Error("Failed to load attempts");
        const data = await res.json();
        setAttempts(data);
      } catch {}
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-primary-50">Mock History</h1>
        <Link href="/mock-tests" className="btn-brand">Start a New Test</Link>
      </div>

      {loading ? (
        <div className="card text-center py-20">
          <p className="text-neutral-600 dark:text-neutral-400">Loading mock history…</p>
        </div>
      ) : attempts.length === 0 ? (
        <div className="card text-center py-20">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">No mock attempts yet</h2>
          <p className="text-neutral-600 dark:text-neutral-400">Take a mock test to see your history here.</p>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Your Mock Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            <TableContainer>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell>Test</TableCell>
                    <TableCell className="text-right">Score</TableCell>
                    <TableCell className="text-right">Accuracy</TableCell>
                    <TableCell className="text-right">Time Taken</TableCell>
                    <TableCell className="text-right">Date</TableCell>
                    <TableCell className="text-right">Action</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attempts.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>{(a.test as any)?.title || "Mock Test"}</TableCell>
                      <TableCell className="text-right">{a.score}/{a.maxScore}</TableCell>
                      <TableCell className="text-right">
                        {a.attemptedCount > 0 ? ((a.correctCount / a.attemptedCount) * 100).toFixed(1) + "%" : "0%"}
                      </TableCell>
                      <TableCell className="text-right">
                        {Math.floor((a.timeSpentSec || 0) / 60)}:{String((a.timeSpentSec || 0) % 60).padStart(2, "0")}
                      </TableCell>
                      <TableCell className="text-right">{new Date(a.startedAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/mock-tests/${a.testId}/result/${a.id}`} className="text-primary-600 hover:underline dark:text-primary-400">
                          View Details
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
