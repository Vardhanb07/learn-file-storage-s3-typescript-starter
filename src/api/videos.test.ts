import { expect, it, describe } from "bun:test";
import { getVideoAspectRatio } from "./videos.ts";

describe("getVideoAspectRatio", () => {
  const portrait = "portrait";
  const landscape = "landscape";
  it("should return portrait", async () => {
    const filePath =
      "/home/vardhanbattula/Workspace/github.com/vardhanb07/learn-file-storage-s3-typescript-starter/samples/boots-video-vertical.mp4";
    const label = await getVideoAspectRatio(filePath);
    expect(label).toBe(portrait);
  });
  it("should return landscape", async () => {
    const filePath =
      "/home/vardhanbattula/Workspace/github.com/vardhanb07/learn-file-storage-s3-typescript-starter/samples/boots-video-horizontal.mp4";
    const label = await getVideoAspectRatio(filePath);
    expect(label).toBe(landscape);
  });
});
