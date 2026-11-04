import { Client, Receiver } from "@upstash/qstash";
import config from "../config";

export const qstashClient = new Client({
	token: config.qstash_token || "",
	baseUrl: config.qstash_url || undefined,
});

export const qstashReceiver =
	config.qstash_current_signing_key
		? new Receiver({
				currentSigningKey: config.qstash_current_signing_key,
				nextSigningKey: config.qstash_next_signing_key || "",
			})
		: null;

