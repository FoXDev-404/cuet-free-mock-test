"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme, type Theme } from "@/components/providers/ThemeProvider";
import {
  Moon, Sun, Monitor, Shield, Bell, Palette, Check, RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Prefs = {
  compactCards: boolean;
  autoNext: boolean;
  lockCorrect: boolean;
  audioFeedback: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
  dailyReminder: boolean;
};

const defaultPrefs: Prefs = {
  compactCards: false,
  autoNext: false,
  lockCorrect: true,
  audioFeedback: false,
  emailNotifications: true,
  pushNotifications: false,
  dailyReminder: false,
};

const STORAGE_KEY = "cuet-settings";

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-900",
        checked ? "bg-primary-600" : "bg-neutral-300 dark:bg-neutral-600"
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-[1.375rem]" : "translate-x-0.5"
        )}
        aria-hidden="true"
      />
    </button>
  );
}

function PrefRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <div className="min-w-0">
        <p className="text-sm font-medium text-neutral-900 dark:text-white">{title}</p>
        <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
      </div>
      <Switch checked={checked} onChange={onChange} label={title} />
    </div>
  );
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setPrefs({ ...defaultPrefs, ...JSON.parse(stored) });
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {}
    setSaved(true);
    const t = setTimeout(() => setSaved(false), 1800);
    return () => clearTimeout(t);
  }, [prefs, loaded]);

  const toggle = (key: keyof Prefs) => setPrefs((p) => ({ ...p, [key]: !p[key] }));

  const themeOptions: { value: Theme; label: string; hint: string; icon: typeof Sun }[] = [
    { value: "light", label: "Light", hint: "Always light mode", icon: Sun },
    { value: "dark", label: "Dark", hint: "Always dark mode", icon: Moon },
    { value: "system", label: "System", hint: "Match system preference", icon: Monitor },
  ];

  return (
    <section className="container-page max-w-3xl py-8 sm:py-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white sm:text-3xl">Settings</h1>
          <p className="mt-1 text-neutral-600 dark:text-neutral-400">Personalise your practice experience.</p>
        </div>
        <span
          className={cn(
            "text-sm font-medium text-secondary-600 transition-opacity dark:text-secondary-400",
            saved ? "opacity-100" : "opacity-0"
          )}
          aria-live="polite"
        >
          Changes saved
        </span>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Palette className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="mb-3 text-sm font-medium text-neutral-900 dark:text-white">Theme</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const active = theme === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTheme(option.value)}
                    aria-pressed={active}
                    className={cn(
                      "relative rounded-xl border-2 p-4 text-left transition-colors",
                      active
                        ? "border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/30"
                        : "border-neutral-200 hover:border-primary-300 dark:border-neutral-700 dark:hover:border-primary-700"
                    )}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <Icon className="h-5 w-5 text-neutral-500 dark:text-neutral-300" />
                      <span className="font-medium text-neutral-900 dark:text-white">{option.label}</span>
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{option.hint}</p>
                    {active && (
                      <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600">
                        <Check className="h-3 w-3 text-white" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-neutral-200 pt-6 dark:border-neutral-800">
            <h3 className="mb-3 text-sm font-medium text-neutral-900 dark:text-white">Layout</h3>
            <PrefRow
              title="Compact cards"
              description="Reduce padding for denser information display"
              checked={prefs.compactCards}
              onChange={() => toggle("compactCards")}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            Exam behaviour
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <PrefRow
            title="Auto next navigation"
            description="Advance automatically after answering"
            checked={prefs.autoNext}
            onChange={() => toggle("autoNext")}
          />
          <PrefRow
            title="Lock correct answers"
            description="Prevent changing an answer once selected"
            checked={prefs.lockCorrect}
            onChange={() => toggle("lockCorrect")}
          />
          <PrefRow
            title="Audio feedback"
            description="Play a sound when you select an answer"
            checked={prefs.audioFeedback}
            onChange={() => toggle("audioFeedback")}
          />
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-primary-600 dark:text-primary-400" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <PrefRow
            title="Email notifications"
            description="Receive updates and reminders by email"
            checked={prefs.emailNotifications}
            onChange={() => toggle("emailNotifications")}
          />
          <PrefRow
            title="Push notifications"
            description="Receive browser push notifications"
            checked={prefs.pushNotifications}
            onChange={() => toggle("pushNotifications")}
          />
          <PrefRow
            title="Daily practice reminder"
            description="A daily nudge to keep your streak going"
            checked={prefs.dailyReminder}
            onChange={() => toggle("dailyReminder")}
          />
        </CardContent>
      </Card>

      <Card className="border-danger-200 dark:border-danger-900/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-danger-600 dark:text-danger-400">
            <Shield className="h-5 w-5" />
            Danger zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Reset all preferences, theme, and locally stored practice progress on this device.
          </p>
          <Button
            variant="danger"
            onClick={() => {
              if (!confirm("Reset all settings and local practice progress? This cannot be undone.")) return;
              localStorage.removeItem(STORAGE_KEY);
              Object.keys(localStorage)
                .filter((k) => k.startsWith("cuet_"))
                .forEach((k) => localStorage.removeItem(k));
              setPrefs(defaultPrefs);
              setTheme("system");
            }}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset preferences
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}
