import { describe, expect, it } from "vitest";

import { formatPinCode, toCode } from "./utils";

describe("utils", () => {
  it("toCode tao code on dinh", () => {
    expect(toCode("Du an A", 3)).toBe("DUA");
    expect(toCode("", 3)).toBe("NA");
  });

  it("formatPinCode dung dinh dang", () => {
    expect(formatPinCode("PJ", "BLD", "FL", "GW", 1)).toBe("PJ-BLD-FL-GW-000001");
  });
});
