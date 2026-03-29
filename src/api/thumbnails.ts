import { getBearerToken, validateJWT } from "../auth";
import { respondWithJSON } from "./json";
import { getVideo, updateVideo } from "../db/videos";
import type { ApiConfig } from "../config";
import type { BunRequest } from "bun";
import { BadRequestError, NotFoundError, UserForbiddenError } from "./errors";

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

  const data = await req.formData();
  const thumbnail = data.get("thumbnail");
  if (!(thumbnail instanceof File)) {
    throw new BadRequestError("Thumnail is not a file");
  }
  if (thumbnail.size > cfg.MAX_UPLOAD_SIZE) {
    throw new BadRequestError("File size exceeds 10MB");
  }
  const mediaType = thumbnail.type;
  const buffer = await thumbnail.arrayBuffer();
  const metaData = getVideo(cfg.db, videoId);
  if (metaData?.userID != userID) {
    throw new UserForbiddenError("This is resource is forbidden");
  }
  videoThumbnails.set(metaData.id, {
    data: buffer,
    mediaType: mediaType,
  });
  const thumbnailURL = `http://localhost:${cfg.port}/api/thumbnails/${metaData.id}`;
  updateVideo(cfg.db, {
    ...metaData,
    thumbnailURL,
  });
  return respondWithJSON(200, {
    ...metaData,
    thumbnailURL,
  });
}
