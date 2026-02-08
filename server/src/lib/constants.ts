export const taskStatuses = ["open", "in_progress", "blocked", "done"] as const;
export type TaskStatus = (typeof taskStatuses)[number];

export const taskCategories = ["quality", "safety", "progress", "fire_protection", "other"] as const;
export type TaskCategory = (typeof taskCategories)[number];

export const zoneStatuses = ["open", "in_progress", "done"] as const;
export type ZoneStatus = (typeof zoneStatuses)[number];

export const templateCategories = ["dimension", "note", "mark"] as const;
export type TemplateCategory = (typeof templateCategories)[number];
