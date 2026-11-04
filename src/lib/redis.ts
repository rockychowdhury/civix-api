import { Redis } from "@upstash/redis";
import config from "../config";

const formatRestUrl = (url?: string) => {
	if (!url) return "";
	return url.startsWith("http://") || url.startsWith("https://")
		? url
		: `https://${url}`;
};

export const upstashRedis = new Redis({
	url: formatRestUrl(config.upstash_redis_rest_url),
	token: config.upstash_redis_rest_token || "",
});

/**
 * redisClient adapter compatible with Upstash Redis HTTP REST.
 * Supports both standard Upstash syntax ({ ex: seconds }) and legacy node-redis syntax ({ expiration: { type: "EX", value: seconds } }).
 */
export const redisClient = {
	get: async <T = string>(key: string): Promise<T | null> => {
		try {
			const result = await upstashRedis.get<T>(key);
			return result;
		} catch (error) {
			console.error(`[Upstash Redis] Error getting key "${key}":`, error);
			throw error;
		}
	},

	set: async (
		key: string,
		value: any,
		options?: {
			expiration?: {
				type: "EX" | "PX";
				value: number;
			};
			ex?: number;
			px?: number;
		},
	) => {
		try {
			let exSeconds: number | undefined;

			if (options?.ex !== undefined) {
				exSeconds = options.ex;
			} else if (options?.expiration?.type === "EX") {
				exSeconds = options.expiration.value;
			} else if (options?.expiration?.type === "PX") {
				exSeconds = Math.ceil(options.expiration.value / 1000);
			}

			if (exSeconds !== undefined) {
				return await upstashRedis.set(key, value, { ex: exSeconds });
			}

			return await upstashRedis.set(key, value);
		} catch (error) {
			console.error(`[Upstash Redis] Error setting key "${key}":`, error);
			throw error;
		}
	},

	del: async (...keys: string[]) => {
		try {
			return await upstashRedis.del(...keys);
		} catch (error) {
			console.error(`[Upstash Redis] Error deleting keys:`, error);
			throw error;
		}
	},

	isOpen: true,
};
