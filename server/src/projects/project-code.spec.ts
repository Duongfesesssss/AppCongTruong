import { describe, expect, it } from "vitest";

import { buildUniqueProjectCode, getProjectCodeBase } from "./project-code";

describe("project-code", () => {
  it("tao ma mac dinh tu ten project", () => {
    expect(getProjectCodeBase({ name: "Cong trinh A" })).toBe("CON");
  });

  it("giu custom code toi da 10 ky tu", () => {
    expect(getProjectCodeBase({ name: "x", code: "PCCC-Block-A1" })).toBe("PCCCBLOCKA");
  });

  it("tu dong them hau to khi ma bi trung", () => {
    expect(buildUniqueProjectCode({ name: "Cong trinh moi" }, ["CON", "CON1", "CON2"])).toBe(
      "CON3"
    );
  });

  it("cat gon ma nen de nhuong cho hau to", () => {
    expect(
      buildUniqueProjectCode({ name: "x", code: "ABCDEFGHIJ" }, ["ABCDEFGHIJ", "ABCDEFGHI1"])
    ).toBe("ABCDEFGHI2");
  });
});
