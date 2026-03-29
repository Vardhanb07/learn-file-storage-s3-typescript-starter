import { respondWithJSON } from "./json";
import { type ApiConfig } from "../config";
import { type BunRequest } from "bun";
import { BadRequestError, UserForbiddenError } from "./errors";
import { getBearerToken, validateJWT } from "../auth";
import { getVideo, updateVideo } from "../db/videos";
import path, { extname } from "node:path";
import { uploadToS3 } from "./s3";

type ProbeOut = {
  streams: {
    width: number;
    height: number;
  }[];
};

export async function getVideoAspectRatio(
  filePath: string,
): Promise<"portrait" | "other" | "landscape"> {
  const proc = Bun.spawn([
    "ffprobe",
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height",
    "-of",
    "json",
    filePath,
  ]);
  const stdoutText = await new Response(proc.stdout).text();
  const stderrText = await new Response(proc.stderr).text();
  const exitStatus = await proc.exited;
  if (exitStatus !== 0) {
    throw new Error(stderrText);
  }
  const { streams } = JSON.parse(stdoutText) as ProbeOut;
  const { height, width } = streams[0];
  const ratio = Math.floor(width / height);
  if (ratio === Math.floor(16 / 9)) {
    return "landscape";
  } else if (ratio === Math.floor(9 / 16)) {
    return "portrait";
  }
  return "other";
}

export async function handlerUploadVideo(cfg: ApiConfig, req: BunRequest) {
  const { videoId } = req.params as { videoId?: string };
  if (!videoId) {
    return new BadRequestError("Invalid video id");
  }
  const token = getBearerToken(req.headers);
  const userID = validateJWT(token, cfg.jwtSecret);
  const metaData = getVideo(cfg.db, videoId);
  if (metaData?.userID !== userID) {
    throw new UserForbiddenError("This is resource is forbidden");
  }
  const video = getVideo(cfg.db, videoId);
  if (video?.userID !== userID) {
    throw new UserForbiddenError("This is resource is forbidden");
  }
  const fromData = await req.formData();
  const file = fromData.get("video");
  if (!(file instanceof File)) {
    throw new BadRequestError("Video is not a file");
  }
  if (file.size > cfg.MAX_VIDEO_UPLOAD_SIZE) {
    throw new BadRequestError("file exceeds 1GB");
  }
  const extName = path.extname(file.name).slice(1);
  const allowedTypes = ["mp4"];
  if (!allowedTypes.includes(extName)) {
    throw new BadRequestError("Invalid file type, only mp4 is allowed");
  }
  const filePath = path.join("/tmp", `${videoId}.${extName}`);
  await Bun.write(filePath, file);
  const prefix = await getVideoAspectRatio(filePath);
  const key = `${prefix}/${videoId}.${extName}`;
  await uploadToS3(cfg, key, filePath, file.type);
  const videoURL = `https://${cfg.s3Bucket}.s3.${cfg.s3Region}.amazonaws.com/${key}`;
  updateVideo(cfg.db, {
    ...video,
    videoURL,
  });
  await Bun.file(filePath).delete();
  return respondWithJSON(200, {
    ...video,
    videoURL,
  });
}
