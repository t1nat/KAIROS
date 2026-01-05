"use client";

import { useEffect, useRef } from "react";
import { api } from "~/trpc/react"; 


class IntervalScheduler {
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly run: () => void,
    private readonly intervalMs: number
  ) {}

  start({ runImmediately }: { runImmediately: boolean }) {
    this.stop();
    if (runImmediately) this.run();
    this.intervalId = setInterval(this.run, this.intervalMs);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}


export function EventReminderService() {
  const sendReminders = api.event.sendEventReminders.useMutation();
  
  const mutateRef = useRef(sendReminders.mutate);
  
  mutateRef.current = sendReminders.mutate;

  useEffect(() => {
    const scheduler = new IntervalScheduler(() => mutateRef.current(), 5 * 60 * 1000);
    scheduler.start({ runImmediately: true });
    return () => scheduler.stop();
  }, []); 

  return null;
}