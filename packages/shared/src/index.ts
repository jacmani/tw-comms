export type BotStatus = "connecting" | "open" | "reconnecting" | "closed";

export interface BotHealthLogRow {
  id?: string;
  status: BotStatus;
  detail: Record<string, unknown>;
  recorded_at: string;
}

// Notice/template types land here in Phase 2 (approval workflow) and Phase 3
// (dashboard compose/templates/history) — kept empty on purpose for now so this
// package doesn't get ahead of work that hasn't been scoped yet.
