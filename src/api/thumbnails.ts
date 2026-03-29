import { getBearerToken, validateJWT } from "../auth";
import { respondWithJSON } from "./json";
import { getVideo, updateVideo } from "../db/videos";
import type { ApiConfig } from "../config";
import { type BunRequest } from "bun";
import { BadRequestError, NotFoundError, UserForbiddenError } from "./errors";
import path from "node:path";
import { randomBytes } from "node:crypto";

type Thumbnail = {
  data: ArrayBuffer;
  mediaType: string;
};

const videoThumbnails: Map<string, Thumbnail> = new Map();

export async function handlerGetThumbnail(cfg: ApiConfig, req: BunRequest) {
  const { videoId } = req.params as { videoId?: string };
  if (!videoId) {
    throw new BadRequestError("Invalid video ID");
  }

  const video = getVideo(cfg.db, videoId);
  if (!video) {
    throw new NotFoundError("Couldn't find video");
  }

  const thumbnail = videoThumbnails.get(videoId);
  if (!thumbnail) {
    throw new NotFoundError("Thumbnail not found");
  }

  return new Response(thumbnail.data, {
    headers: {
      "Content-Type": thumbnail.mediaType,
      "Cache-Control": "no-store",
    },
  });
}

export async function handlerUploadThumbnail(cfg: ApiConfig, req: BunRequest) {
  const { videoId } = req.params as { videoId?: string };
  if (!videoId) {
    throw new BadRequestError("Invalid video ID");
  }

  const token = getBearerToken(req.headers);
  const userID = validateJWT(token, cfg.jwtSecret);

  console.log("uploading thumbnail for video", videoId, "by user", userID);

  const formData = await req.formData();
  const thumbnail = formData.get("thumbnail");
  if (!(thumbnail instanceof File)) {
    throw new BadRequestError("Thumbnail is not a file");
  }
  if (thumbnail.size > cfg.MAX_THUMBNAIL_UPLOAD_SIZE) {
    throw new BadRequestError("File size exceeds 10MB");
  }
  const metaData = getVideo(cfg.db, videoId);
  if (metaData?.userID !== userID) {
    throw new UserForbiddenError("This is resource is forbidden");
  }
  const mediaType = thumbnail.type;
  const extName = path.extname(thumbnail.name).slice(1);
  const allowedTypes = ["png", "jpeg"];
  if (!allowedTypes.includes(extName)) {
    throw new BadRequestError(
      `files apart from images are not allowed, file type: ${extName}`,
    );
  }
  const fileName = randomBytes(32).toString("base64url");
  const filePath = path.join(cfg.assetsRoot, `${fileName}.${extName}`);
  await Bun.write(filePath, thumbnail);
  const data = await thumbnail.arrayBuffer();
  videoThumbnails.set(videoId, {
    data,
    mediaType,
  });
  const thumbnailURL = `http://localhost:${cfg.port}/${filePath}`;
  updateVideo(cfg.db, {
    ...metaData,
    thumbnailURL,
  });
  return respondWithJSON(200, {
    ...metaData,
    thumbnailURL,
  });
}
