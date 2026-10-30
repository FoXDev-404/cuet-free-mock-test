"use client";

import { QuestionsManager } from "@/app/admin/_components/questions-manager";

export default function QuestionBankPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Question Bank</h1>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
          Versioned question management with tags, topics, workflow status and answer-key audit. Every
          edit snapshots a restorable version before it is applied.
        </p>
      </div>
      <QuestionsManager />
    </div>
  );
}
