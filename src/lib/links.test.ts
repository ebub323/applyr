import { afterEach, describe, expect, it, vi } from "vitest";
import { openExternal, safeHttpUrl } from "./links";

describe("safeHttpUrl", () => {
  it("keeps http and https links", () => {
    expect(safeHttpUrl("https://boards.greenhouse.io/acme/jobs/1")).toBe("https://boards.greenhouse.io/acme/jobs/1");
    expect(safeHttpUrl("http://example.com/job")).toBe("http://example.com/job");
  });

  it("rejects other schemes and junk", () => {
    expect(safeHttpUrl("javascript:alert(1)")).toBeNull();
    expect(safeHttpUrl(" JavaScript:alert(1)")).toBeNull();
    expect(safeHttpUrl("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeHttpUrl("vbscript:msgbox(1)")).toBeNull();
    expect(safeHttpUrl("file:///etc/passwd")).toBeNull();
    expect(safeHttpUrl("/relative/path")).toBeNull();
    expect(safeHttpUrl("not a url")).toBeNull();
    expect(safeHttpUrl("")).toBeNull();
    expect(safeHttpUrl(undefined)).toBeNull();
  });
});

describe("openExternal", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("opens http(s) links in a new tab without opener or referrer", () => {
    const open = vi.fn();
    vi.stubGlobal("window", { open });
    expect(openExternal("https://jobs.lever.co/acme/1")).toBe(true);
    expect(open).toHaveBeenCalledWith("https://jobs.lever.co/acme/1", "_blank", "noopener,noreferrer");
  });

  it("refuses to open anything else", () => {
    const open = vi.fn();
    vi.stubGlobal("window", { open });
    expect(openExternal("javascript:alert(document.domain)")).toBe(false);
    expect(open).not.toHaveBeenCalled();
  });
});
