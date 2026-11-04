import app from "./app";
import config from "./config";
import { transporter } from "./lib/nodemailer";
import { prisma } from "./lib/prisma";

const PORT = config.port || 5000;

let isInitialized = false;

export const initServices = async () => {
	if (isInitialized) return;

	try {
		await prisma.$connect();
		console.log("Connected to the database successfully.");

		transporter
			.verify()
			.then(() => {
				console.log("Nodemailer Connected Successfully.");
			})
			.catch((err) => {
				console.warn("Nodemailer Verify Warning:", err?.message || err);
			});

		isInitialized = true;
	} catch (error) {
		console.error("Error starting services:", error);
		if (!process.env.VERCEL) {
			await prisma.$disconnect();
			process.exit(1);
		}
	}
};

// If running in local/standalone environment, start listening
if (!process.env.VERCEL) {
	initServices().then(() => {
		app.listen(PORT, () => {
			console.log(`Server is running on port ${PORT}`);
		});
	});
} else {
	// In Vercel serverless environment, lazily trigger init without blocking
	initServices().catch((err) => {
		console.error("Vercel cold-start initialization error:", err);
	});
}

export default app;
