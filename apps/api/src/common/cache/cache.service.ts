import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Redis } from '@upstash/redis';

@Injectable()
export class CacheService implements OnModuleInit {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis | null = null;
  private readonly fallback = new Map<
    string,
    { data: string; expiresAt: number }
  >();

  onModuleInit() {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (url && token) {
      this.redis = new Redis({ url, token });
      this.logger.log('Upstash Redis connected');
    } else {
      this.logger.warn(
        'UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — using in-memory fallback cache',
      );
    }
  }

  get isRedis(): boolean {
    return this.redis !== null;
  }

  private versionKey(tenantId: string): string {
    return `cacheVer:${tenantId}`;
  }

  async getTenantCacheVersion(tenantId: string): Promise<number> {
    const version = await this.get<number>(this.versionKey(tenantId));
    return version ?? 1;
  }

  async bumpTenantVersion(tenantId: string): Promise<void> {
    const current = await this.getTenantCacheVersion(tenantId);
    await this.set(this.versionKey(tenantId), current + 1, 60 * 60 * 24 * 30);
  }

  async tenantScopedKey(tenantId: string, key: string): Promise<string> {
    const version = await this.getTenantCacheVersion(tenantId);
    return `v${version}:${key}`;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      if (this.redis) {
        const raw = await this.redis.get<string>(key);
        if (raw === null || raw === undefined) return null;
        return (typeof raw === 'string' ? JSON.parse(raw) : raw) as T;
      }
      const entry = this.fallback.get(key);
      if (!entry || entry.expiresAt < Date.now()) {
        if (entry) this.fallback.delete(key);
        return null;
      }
      return JSON.parse(entry.data) as T;
    } catch (err) {
      this.logger.warn(`Cache get error for key "${key}": ${err}`);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      if (this.redis) {
        await this.redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
        return;
      }
      this.fallback.set(key, {
        data: JSON.stringify(value),
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
    } catch (err) {
      this.logger.warn(`Cache set error for key "${key}": ${err}`);
    }
  }

  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    try {
      if (this.redis) {
        await this.redis.del(...keys);
        return;
      }
      for (const key of keys) {
        this.fallback.delete(key);
      }
    } catch (err) {
      this.logger.warn(`Cache del error: ${err}`);
    }
  }

  async invalidatePrefix(prefix: string): Promise<void> {
    try {
      if (this.redis) {
        // Prefer SCAN over KEYS — KEYS blocks / is discouraged on managed Redis.
        let cursor = '0';
        do {
          const [next, keys] = await this.redis.scan(cursor, {
            match: `${prefix}*`,
            count: 100,
          });
          cursor = String(next);
          if (keys.length > 0) {
            await this.redis.del(...keys);
          }
        } while (cursor !== '0');
        return;
      }
      for (const key of this.fallback.keys()) {
        if (key.startsWith(prefix)) {
          this.fallback.delete(key);
        }
      }
    } catch (err) {
      this.logger.warn(`Cache invalidatePrefix error for "${prefix}": ${err}`);
    }
  }

  async stats(): Promise<{ backend: 'redis' | 'memory'; keyCount: number }> {
    if (this.redis) {
      const info = await this.redis.dbsize();
      return { backend: 'redis', keyCount: info };
    }
    let count = 0;
    const now = Date.now();
    for (const entry of this.fallback.values()) {
      if (entry.expiresAt > now) count++;
    }
    return { backend: 'memory', keyCount: count };
  }
}
