import { createClient } from "redis";
import config from "../config";

export const redisClient = createClient({
	username: config.redis_user,
	password: config.redis_password,
	socket: {
		host: config.redis_host,
		port: Number(config.redis_port),
		connectTimeout: 10000, // 10 seconds
		reconnectStrategy: (retries) => {
			if (retries > 20) {
				console.error("Too many attempts to reconnect. Redis connection was terminated");
				return new Error("Too many retries.");
			} else {
				const delay = Math.min(retries * 500, 5000);
				console.log(`Reconnecting to Redis in ${delay}ms...`);
				return delay;
			}
		},
	},
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));
redisClient.on("reconnecting", () => console.log("Redis Client Reconnecting"));
redisClient.on("ready", () => console.log("Redis Client Ready"));
