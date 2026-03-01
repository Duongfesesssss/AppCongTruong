export const taskStatuses = [
  "instruction",
  "rfi",
  "resolved",
  "approved",
  // Legacy statuses kept for backward compatibility with existing data
  "open",
  "in_progress",
  "blocked",
  "done"
] as const;
export type TaskStatus = (typeof taskStatuses)[number];

export const taskCategories = ["quality", "safety", "progress", "fire_protection", "other"] as const;
export type TaskCategory = (typeof taskCategories)[number];

export const zoneStatuses = ["open", "in_progress", "done"] as const;
export type ZoneStatus = (typeof zoneStatuses)[number];

export const templateCategories = ["dimension", "note", "mark"] as const;
export type TemplateCategory = (typeof templateCategories)[number];

export const cmsEntryStatuses = ["draft", "published"] as const;
export type CmsEntryStatus = (typeof cmsEntryStatuses)[number];

export const cmsTagScopes = [
  "project",
  "discipline",
  "originator",
  "building",
  "volume",
  "zone",
  "level",
  "room",
  "content_type",
  "issue_status",
  "file_type",
  "grid_axis",
  "custom"
] as const;
export type CmsTagScope = (typeof cmsTagScopes)[number];
