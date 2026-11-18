// Pembatas laju permintaan (sliding window) sederhana dan extractor IP klien yang aman

interface RateLimitBucket {
  timestamps: number[];
}

const globalForRateLimit = globalThis as typeof globalThis & {
  __florahubRateLimitBuckets?: Map<string, RateLimitBucket>;
};

const buckets =
  globalForRateLimit.__florahubRateLimitBuckets ??
  (globalForRateLimit.__florahubRateLimitBuckets = new Map());

const MAX_BUCKET_COUNT = 10_000;

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 45);
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp.slice(0, 45);
  return "unknown";
}

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  if (buckets.size > MAX_BUCKET_COUNT) {
    for (const [bucketKey, bucket] of buckets.entries()) {
      if (
        bucket.timestamps.length === 0 ||
        bucket.timestamps[bucket.timestamps.length - 1] <= windowStart
      ) {
        buckets.delete(bucketKey);
      }
    }
  }

  const bucket: RateLimitBucket = buckets.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((ts: number) => ts > windowStart);

  if (bucket.timestamps.length >= maxRequests) {
    const oldest = bucket.timestamps[0] ?? now;
    const retryAfterSec = Math.max(
      1,
      Math.ceil((oldest + windowMs - now) / 1000),
    );
    buckets.set(key, bucket);
    return { allowed: false, retryAfterSec };
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return { allowed: true, retryAfterSec: 0 };
}
