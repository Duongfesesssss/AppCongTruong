import { describe, expect, it } from "vitest";

import { buildProjectAccessFilter, ensureProjectRole, getProjectRole } from "./project-access";

describe("project-access", () => {
  const baseProject = {
    userId: "owner-user-id",
    members: [
      {
        userId: "tech-user-id",
        role: "technician" as const
      }
    ]
  };

  it("returns admin role for project owner", () => {
    expect(getProjectRole(baseProject, "owner-user-id")).toBe("admin");
  });

  it("returns technician role for member", () => {
    expect(getProjectRole(baseProject, "tech-user-id")).toBe("technician");
  });

  it("throws not found when user is not in project", () => {
    expect(() => ensureProjectRole(baseProject, "unknown-user-id", "technician")).toThrowError(
      /khong co quyen|khong ton tai/i
    );
  });

  it("throws forbidden when technician tries to use admin-only action", () => {
    const run = () => ensureProjectRole(baseProject, "tech-user-id", "admin");
    expect(run).toThrowError(/khong co quyen/i);
  });

  it("builds filter for owner and project members", () => {
    expect(buildProjectAccessFilter("user-x")).toEqual({
      $or: [{ userId: "user-x" }, { "members.userId": "user-x" }]
    });
  });
});
