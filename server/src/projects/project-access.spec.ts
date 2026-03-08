import { describe, expect, it } from "vitest";

import { buildProjectAccessFilter, ensureProjectRole, getProjectRole, canDeleteResource } from "./project-access";

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

  describe("canDeleteResource", () => {
    it("allows admin to delete any resource", () => {
      // Admin (project owner) can delete resource created by anyone
      expect(canDeleteResource(baseProject, "owner-user-id", "tech-user-id")).toBe(true);
      expect(canDeleteResource(baseProject, "owner-user-id", "other-user-id")).toBe(true);
    });

    it("allows creator to delete their own resource", () => {
      // Technician can delete their own resource
      expect(canDeleteResource(baseProject, "tech-user-id", "tech-user-id")).toBe(true);
    });

    it("throws forbidden when non-admin tries to delete others' resource", () => {
      // Technician cannot delete resource created by others
      expect(() => canDeleteResource(baseProject, "tech-user-id", "owner-user-id")).toThrowError(/chi nguoi tao/i);
      expect(() => canDeleteResource(baseProject, "tech-user-id", "other-user-id")).toThrowError(/chi nguoi tao/i);
    });

    it("throws not found when user is not in project", () => {
      // User not in project cannot delete any resource
      expect(() => canDeleteResource(baseProject, "unknown-user-id", "tech-user-id")).toThrowError(
        /khong co quyen|khong ton tai/i
      );
    });

    it("throws not found when project is null", () => {
      expect(() => canDeleteResource(null, "owner-user-id", "tech-user-id")).toThrowError(
        /khong co quyen|khong ton tai/i
      );
    });

    it("handles ObjectId-like creator IDs", () => {
      const creatorId = { toString: () => "tech-user-id" };
      expect(canDeleteResource(baseProject, "tech-user-id", creatorId)).toBe(true);
      expect(() => canDeleteResource(baseProject, "owner-user-id-2", creatorId)).toThrowError(
        /khong co quyen|khong ton tai/i
      );
    });
  });
});
