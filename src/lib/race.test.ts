import { describe, expect, it } from "vitest";

/**
 * Regression for a bug found in the browser: `list = [...list, ...(await fetch())]`
 * copies `list` BEFORE the await, so concurrent fetches overwrite each other and
 * roles vanish. The fix reads the list after the await.
 */
describe("concurrent accumulation", () => {
  const delays = [30, 5, 15];
  const fetchSim = (n: number, ms: number) => new Promise<number[]>((r) => setTimeout(() => r([n]), ms));

  it("the broken pattern loses results", async () => {
    let list: number[] = [];
    await Promise.all(delays.map(async (ms, i) => { list = [...list, ...(await fetchSim(i, ms))]; }));
    expect(list.length).toBeLessThan(3);
  });
  it("the fixed pattern keeps every result", async () => {
    let list: number[] = [];
    await Promise.all(delays.map(async (ms, i) => { const got = await fetchSim(i, ms); list = [...list, ...got]; }));
    expect(list.sort()).toEqual([0, 1, 2]);
  });
});
