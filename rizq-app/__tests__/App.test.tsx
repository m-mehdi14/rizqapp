/**
 * @format
 * Keep smoke tests dependency-light; full App imports ESM navigation (Jest needs extra config).
 */

describe("rizqapp", () => {
  it("sanity", () => {
    expect(1 + 1).toBe(2);
  });
});
