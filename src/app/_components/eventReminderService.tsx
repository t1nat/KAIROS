"use client";

import { useEffect, useRef } from "react";
import { api } from "~/trpc/react"; 

/**
 * Component to periodically send event reminders using a tRPC mutation.
 */
export function EventReminderService() {
  const sendReminders = api.event.sendEventReminders.useMutation();
  
  // Use a ref to store the mutate function to avoid dependency issues
  const mutateRef = useRef(sendReminders.mutate);
  
  // Keep the ref updated with the latest mutate function
  mutateRef.current = sendReminders.mutate;

  useEffect(() => {
    const checkReminders = () => {
      mutateRef.current();
    };

    // Run immediately on mount
    checkReminders();

    // Then run every 5 minutes
    const interval = setInterval(checkReminders, 5 * 60 * 1000); 

    return () => clearInterval(interval);
  }, []); // Empty dependency array - this effect only runs once on mount

  return null;
}