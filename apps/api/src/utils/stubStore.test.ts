import { describe, it, expect } from "vitest";
import { putStub, getStub, replaceStub, deleteStub } from "./stubStore.js";

const pdfFile = (text: string) =>
  new File([Buffer.from(text)], "a.pdf", { type: "application/pdf" });

describe("stubStore", () => {
  it("returns the stored bytes and a url ending in the key", async () => {
    const { url, key } = await putStub(pdfFile("hello"));
    expect(url.endsWith(`/pdf/file?url=${key}`)).toBe(true);
    expect(getStub(key)?.toString()).toBe("hello");
  });

  it("replaceStub returns false for an unknown key", () => {
    expect(replaceStub("nope", Buffer.from("x"))).toBe(false);
  });

  it("replaceStub overwrites bytes for a known key", async () => {
    const { key } = await putStub(pdfFile("old"));
    expect(replaceStub(key, Buffer.from("new"))).toBe(true);
    expect(getStub(key)?.toString()).toBe("new");
  });

  it("deleteStub removes the entry", async () => {
    const { key } = await putStub(pdfFile("bye"));
    expect(deleteStub(key)).toBe(true);
    expect(getStub(key)).toBeUndefined();
    expect(deleteStub(key)).toBe(false);
  });
});
