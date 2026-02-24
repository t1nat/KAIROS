import {
  EventsPublisherDraftSchema,
} from "~/server/agents/schemas/a4EventsPublisherSchemas";

export type A4ReadToolName = "listEventsPublic" | "getEventDetail";

export type A4WriteToolName =
  | "createEvent"
  | "updateEvent"
  | "deleteEvent"
  | "addEventComment"
  | "deleteEventComment"
  | "setEventRsvp"
  | "toggleEventLike";

export interface EventsPublisherAgentProfile {
  id: "events_publisher";
  name: string;
  description: string;
  outputSchema: typeof EventsPublisherDraftSchema;
  draftToolAllowlist: readonly A4ReadToolName[];
  applyToolAllowlist: readonly A4WriteToolName[];
}

export const a4EventsPublisherProfile: EventsPublisherAgentProfile = {
  id: "events_publisher",
  name: "Events Publisher",
  description:
    "An event-domain agent that helps users create, update, moderate, and manage public events via Draft → Confirm → Apply. Handles RSVP, comments, likes, and event lifecycle.",
  outputSchema: EventsPublisherDraftSchema,
  draftToolAllowlist: ["listEventsPublic", "getEventDetail"],
  applyToolAllowlist: [
    "createEvent",
    "updateEvent",
    "deleteEvent",
    "addEventComment",
    "deleteEventComment",
    "setEventRsvp",
    "toggleEventLike",
  ],
};
