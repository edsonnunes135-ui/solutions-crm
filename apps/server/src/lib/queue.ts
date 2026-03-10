import dotenv from "dotenv";
dotenv.config();

import { Queue, JobsOptions } from "bullmq";
import type { RedisOptions } from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const url = new URL(redisUrl);

export const redisConnection: RedisOptions = {
  host: url.hostname,
  port: Number(url.port || 6379),
  password: url.password || undefined,
};

export const eventsQueue = new Queue("events", { connection: redisConnection });

export async function enqueueEvent(eventId: string) {
  // jobId = eventId evita duplicar
  const opts: JobsOptions = { jobId: eventId, removeOnComplete: true, attempts: 3 };
  await eventsQueue.add("event", { eventId }, opts);
}
