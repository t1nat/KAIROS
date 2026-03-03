"use client";

import { useState, useMemo, useCallback } from "react";
import { api } from "~/trpc/react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  Zap,
  FolderOpen,
  X,
} from "lucide-react";
import { cn } from "~/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

type CalendarTask = {
  id: number;
  title: string;
  status: string;
  priority: string;
  dueDate: Date | string | null;
  projectId: number;
  projectTitle: string | null;
};

type CalendarEvent = {
  id: number;
  title: string;
  eventDate: Date | string;
  description: string;
};

type CalendarData = {
  tasks: CalendarTask[];
  events: CalendarEvent[];
};

type CalendarItem =
  | { kind: "task"; id: number; title: string; status: string; priority: string; projectTitle: string | null; date: Date }
  | { kind: "event"; id: number; title: string; description?: string; date: Date };

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
}
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// Use a fixed locale to prevent SSR/client hydration mismatch
const LOCALE = "en-US";
function fmtDate(d: Date, opts: Intl.DateTimeFormatOptions) {
  return d.toLocaleDateString(LOCALE, opts);
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const priorityConfig: Record<string, { dot: string; bg: string; border: string; text: string; label: string }> = {
  urgent: { dot: "bg-error", bg: "bg-error/8", border: "border-l-error", text: "text-error", label: "Urgent" },
  high:   { dot: "bg-warning", bg: "bg-warning/8", border: "border-l-warning", text: "text-warning", label: "High" },
  medium: { dot: "bg-accent-primary", bg: "bg-accent-primary/8", border: "border-l-accent-primary", text: "text-accent-primary", label: "Medium" },
  low:    { dot: "bg-info", bg: "bg-info/8", border: "border-l-info", text: "text-info", label: "Low" },
};

const statusIcons: Record<string, typeof CheckCircle2> = {
  completed: CheckCircle2,
  blocked: AlertCircle,
  in_progress: Zap,
  pending: Clock,
};

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function CalendarClient() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [expandedItem, setExpandedItem] = useState<{ kind: string; id: number } | null>(null);

  const from = startOfMonth(currentMonth);
  const to = endOfMonth(currentMonth);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
  const { data, isLoading } = (api as any).task.getForCalendar.useQuery(
    { from, to },
    { staleTime: 1000 * 30 }
  ) as { data: CalendarData | undefined; isLoading: boolean };

  /* ------------ derived grid ------------ */

  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    const firstDay = startOfMonth(currentMonth);
    const startPad = firstDay.getDay(); // 0=Sun

    for (let i = startPad - 1; i >= 0; i--) {
      const d = new Date(firstDay);
      d.setDate(d.getDate() - i - 1);
      days.push(d);
    }

    const last = endOfMonth(currentMonth).getDate();
    for (let d = 1; d <= last; d++) {
      days.push(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), d));
    }

    while (days.length < 42) {
      const d = new Date(days[days.length - 1]!);
      d.setDate(d.getDate() + 1);
      days.push(d);
    }

    return days;
  }, [currentMonth]);

  /* ------------ items per day ------------ */

  const itemsByDate = useMemo(() => {
    const map = new Map<string, CalendarItem[]>();
    const key = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

    for (const t of data?.tasks ?? []) {
      if (!t.dueDate) continue;
      const d = new Date(t.dueDate);
      const k = key(d);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push({
        kind: "task",
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        projectTitle: t.projectTitle,
        date: d,
      });
    }

    for (const e of data?.events ?? []) {
      const d = new Date(e.eventDate);
      const k = key(d);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push({ kind: "event", id: e.id, title: e.title, description: e.description, date: d });
    }

    return map;
  }, [data]);

  const getItems = useCallback(
    (d: Date) => itemsByDate.get(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`) ?? [],
    [itemsByDate]
  );

  /* ------------ all month items for right panel ------------ */

  const allMonthItems = useMemo(() => {
    const items: CalendarItem[] = [];
    for (const t of data?.tasks ?? []) {
      if (!t.dueDate) continue;
      items.push({ kind: "task", id: t.id, title: t.title, status: t.status, priority: t.priority, projectTitle: t.projectTitle, date: new Date(t.dueDate) });
    }
    for (const e of data?.events ?? []) {
      items.push({ kind: "event", id: e.id, title: e.title, description: e.description, date: new Date(e.eventDate) });
    }
    items.sort((a, b) => a.date.getTime() - b.date.getTime());
    return items;
  }, [data]);

  /* ------------ items to show in right panel ------------ */
  const rightPanelItems = selectedDate ? getItems(selectedDate) : allMonthItems;

  /* ------------ navigation ------------ */

  const goToPrev = () => {
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
    setSelectedDate(null);
    setExpandedItem(null);
  };
  const goToNext = () => {
    setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
    setSelectedDate(null);
    setExpandedItem(null);
  };
  const goToToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
    setExpandedItem(null);
  };

  const today = new Date();

  const toggleExpand = (kind: string, id: number) => {
    setExpandedItem((prev) =>
      prev?.kind === kind && prev?.id === id ? null : { kind, id }
    );
  };

  return (
    <div className="w-full px-4 sm:px-6 md:px-8 py-6">
      {/* Header navigation */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={goToPrev}
            className="p-2 rounded-xl text-fg-secondary hover:text-fg-primary hover:bg-bg-secondary transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-xl font-bold text-fg-primary tracking-tight font-display min-w-[180px] text-center" suppressHydrationWarning>
            {fmtDate(currentMonth, { month: "long", year: "numeric" })}
          </h2>
          <button
            onClick={goToNext}
            className="p-2 rounded-xl text-fg-secondary hover:text-fg-primary hover:bg-bg-secondary transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {selectedDate && (
            <button
              onClick={() => { setSelectedDate(null); setExpandedItem(null); }}
              className="px-3 py-2 rounded-xl text-sm font-medium text-fg-secondary hover:text-fg-primary hover:bg-bg-secondary transition-colors"
            >
              Show all
            </button>
          )}
          <button
            onClick={goToToday}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-accent-primary/10 text-accent-primary border border-accent-primary/20 hover:bg-accent-primary/20 transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* Split layout */}
      <div className="flex gap-5 items-start">
        {/* LEFT — Calendar grid */}
        <div className="flex-[3] min-w-0">
          <div className="rounded-2xl border border-white/[0.06] bg-bg-elevated shadow-xl overflow-hidden">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-white/[0.06]">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="py-2.5 text-center text-[10px] font-bold uppercase tracking-wider text-fg-tertiary"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, idx) => {
                const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
                const isToday = isSameDay(day, today);
                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                const dayItems = getItems(day);
                const hasItems = dayItems.length > 0;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => { setSelectedDate(day); setExpandedItem(null); }}
                    className={cn(
                      "relative min-h-[68px] sm:min-h-[80px] p-1.5 text-left border-b border-r border-white/[0.04] transition-all duration-150",
                      !isCurrentMonth && "opacity-35",
                      isSelected
                        ? "bg-accent-primary/10 ring-1 ring-inset ring-accent-primary/30"
                        : "hover:bg-bg-secondary/40",
                    )}
                  >
                    {/* Day number */}
                    <span
                      className={cn(
                        "inline-flex items-center justify-center w-6 h-6 rounded-full text-[12px] font-semibold transition-colors",
                        isToday
                          ? "bg-accent-primary text-white shadow-sm"
                          : isSelected
                            ? "text-accent-primary font-bold"
                            : "text-fg-primary",
                      )}
                    >
                      {day.getDate()}
                    </span>

                    {/* Item dots */}
                    {hasItems && (
                      <div className="mt-0.5 space-y-0.5">
                        {dayItems.slice(0, 2).map((item, i) => (
                          <div
                            key={`${item.kind}-${item.id}-${i}`}
                            className={cn(
                              "flex items-center gap-1 px-1 py-0.5 rounded text-[9px] leading-tight font-medium truncate",
                              item.kind === "task"
                                ? "bg-accent-primary/10 text-accent-primary"
                                : "bg-warning/10 text-warning",
                            )}
                          >
                            {item.kind === "task" ? (
                              <span
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full shrink-0",
                                  priorityConfig[item.priority]?.dot ?? "bg-accent-primary",
                                )}
                              />
                            ) : (
                              <CalendarDays size={8} className="shrink-0" />
                            )}
                            <span className="truncate">{item.title}</span>
                          </div>
                        ))}
                        {dayItems.length > 2 && (
                          <span className="text-[9px] text-fg-tertiary pl-1">
                            +{dayItems.length - 2} more
                          </span>
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT — Task & event banners */}
        <div className="flex-[2] min-w-0 max-h-[calc(100vh-180px)] overflow-y-auto">
          <div className="rounded-2xl border border-white/[0.06] bg-bg-elevated shadow-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[14px] font-bold text-fg-primary">
                {selectedDate
                  ? fmtDate(selectedDate, { weekday: "short", month: "short", day: "numeric" })
                  : "All Tasks & Events"}
              </h3>
              <span className="text-[11px] text-fg-tertiary font-medium">
                {rightPanelItems.length} item{rightPanelItems.length !== 1 ? "s" : ""}
              </span>
            </div>

            {isLoading ? (
              <div className="py-10 text-center text-fg-tertiary text-sm">Loading...</div>
            ) : rightPanelItems.length === 0 ? (
              <div className="py-10 text-center text-fg-tertiary text-sm">
                {selectedDate ? "Nothing scheduled for this day." : "No tasks or events this month."}
              </div>
            ) : (
              <div className="space-y-2">
                {rightPanelItems.map((item) => {
                  const isExpanded = expandedItem?.kind === item.kind && expandedItem?.id === item.id;

                  if (item.kind === "task") {
                    const prio = priorityConfig[item.priority] ?? priorityConfig.medium!;
                    const StatusIcon = statusIcons[item.status] ?? Clock;

                    return (
                      <div key={`task-${item.id}`}>
                        {/* Banner */}
                        <button
                          type="button"
                          onClick={() => toggleExpand("task", item.id)}
                          className={cn(
                            "w-full text-left rounded-xl border-l-[3px] border border-white/[0.06] transition-all duration-150",
                            prio.border,
                            prio.bg,
                            isExpanded
                              ? "ring-1 ring-accent-primary/20 shadow-md"
                              : "hover:shadow-md hover:scale-[1.01]",
                          )}
                        >
                          <div className="flex items-center gap-3 px-3 py-2.5">
                            <div
                              className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                                item.status === "completed"
                                  ? "bg-success/15 text-success"
                                  : item.status === "blocked"
                                    ? "bg-error/15 text-error"
                                    : "bg-accent-primary/15 text-accent-primary",
                              )}
                            >
                              <StatusIcon size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className={cn(
                                  "text-[13px] font-semibold leading-tight truncate",
                                  item.status === "completed"
                                    ? "text-fg-tertiary line-through"
                                    : "text-fg-primary",
                                )}
                              >
                                {item.title}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="flex items-center gap-1 text-[10px]">
                                  <span className={cn("w-1.5 h-1.5 rounded-full", prio.dot)} />
                                  <span className={prio.text}>{prio.label}</span>
                                </span>
                                {!selectedDate && (
                                  <span className="text-[10px] text-fg-tertiary">
                                    {fmtDate(item.date, { month: "short", day: "numeric" })}
                                  </span>
                                )}
                              </div>
                            </div>
                            <span
                              className={cn(
                                "text-[10px] font-medium px-2 py-0.5 rounded-full capitalize shrink-0",
                                item.status === "completed"
                                  ? "bg-success/10 text-success"
                                  : item.status === "blocked"
                                    ? "bg-error/10 text-error"
                                    : item.status === "in_progress"
                                      ? "bg-accent-primary/10 text-accent-primary"
                                      : "bg-fg-quaternary/10 text-fg-secondary",
                              )}
                            >
                              {item.status.replace("_", " ")}
                            </span>
                          </div>
                        </button>

                        {/* Expanded detail card */}
                        {isExpanded && (
                          <div className="mt-1 ml-3 rounded-xl border border-white/[0.06] bg-bg-surface p-4 animate-[popIn_200ms_cubic-bezier(0.34,1.56,0.64,1)]">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-[13px] font-bold text-fg-primary">{item.title}</h4>
                              <button
                                type="button"
                                onClick={() => setExpandedItem(null)}
                                className="p-1 rounded-lg text-fg-tertiary hover:text-fg-primary hover:bg-bg-secondary transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>
                            <div className="space-y-2">
                              {item.projectTitle && (
                                <div className="flex items-center gap-2 text-[12px]">
                                  <FolderOpen size={13} className="text-accent-primary shrink-0" />
                                  <span className="text-fg-secondary">Project:</span>
                                  <span className="text-fg-primary font-medium">{item.projectTitle}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-2 text-[12px]">
                                <StatusIcon size={13} className="text-fg-tertiary shrink-0" />
                                <span className="text-fg-secondary">Status:</span>
                                <span className="text-fg-primary font-medium capitalize">{item.status.replace("_", " ")}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[12px]">
                                <span className={cn("w-2 h-2 rounded-full shrink-0", prio.dot)} />
                                <span className="text-fg-secondary">Priority:</span>
                                <span className={cn("font-medium", prio.text)}>{prio.label}</span>
                              </div>
                              <div className="flex items-center gap-2 text-[12px]">
                                <CalendarDays size={13} className="text-fg-tertiary shrink-0" />
                                <span className="text-fg-secondary">Due:</span>
                                <span className="text-fg-primary font-medium">
                                  {fmtDate(item.date, { weekday: "short", month: "long", day: "numeric", year: "numeric" })}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  }

                  /* ---- Event banner ---- */
                  return (
                    <div key={`event-${item.id}`}>
                      <button
                        type="button"
                        onClick={() => toggleExpand("event", item.id)}
                        className={cn(
                          "w-full text-left rounded-xl border-l-[3px] border-l-warning border border-white/[0.06] bg-warning/8 transition-all duration-150",
                          isExpanded
                            ? "ring-1 ring-warning/20 shadow-md"
                            : "hover:shadow-md hover:scale-[1.01]",
                        )}
                      >
                        <div className="flex items-center gap-3 px-3 py-2.5">
                          <div className="w-7 h-7 rounded-lg bg-warning/15 text-warning flex items-center justify-center shrink-0">
                            <CalendarDays size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-semibold text-fg-primary leading-tight truncate">
                              {item.title}
                            </p>
                            <span className="text-[10px] text-warning font-medium">
                              Event
                              {!selectedDate && (
                                <span className="text-fg-tertiary ml-2">
                                  {fmtDate(item.date, { month: "short", day: "numeric" })}
                                </span>
                              )}
                            </span>
                          </div>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="mt-1 ml-3 rounded-xl border border-white/[0.06] bg-bg-surface p-4 animate-[popIn_200ms_cubic-bezier(0.34,1.56,0.64,1)]">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-[13px] font-bold text-fg-primary">{item.title}</h4>
                            <button
                              type="button"
                              onClick={() => setExpandedItem(null)}
                              className="p-1 rounded-lg text-fg-tertiary hover:text-fg-primary hover:bg-bg-secondary transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-[12px]">
                              <CalendarDays size={13} className="text-warning shrink-0" />
                              <span className="text-fg-secondary">Date:</span>
                              <span className="text-fg-primary font-medium">
                                {fmtDate(item.date, { weekday: "short", month: "long", day: "numeric", year: "numeric" })}
                              </span>
                            </div>
                            {item.description && (
                              <div className="text-[12px] text-fg-secondary mt-2 leading-relaxed">
                                {item.description}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
