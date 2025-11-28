"use client";

import { useEffect, useRef } from "react";
import { api } from "~/trpc/react"; 


export function EventReminderService() {
  const sendReminders = api.event.sendEventReminders.useMutation();
  
  const mutateRef = useRef(sendReminders.mutate);
  
  mutateRef.current = sendReminders.mutate;

  useEffect(() => {
    const checkReminders = () => {
      mutateRef.current();
    };

    checkReminders();

    const interval = setInterval(checkReminders, 5 * 60 * 1000); 

    return () => clearInterval(interval);
  }, []); 

  return null;
}