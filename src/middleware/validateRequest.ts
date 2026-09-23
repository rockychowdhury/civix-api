import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import type { ZodIssue, ZodObject } from "zod";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const validateRequest = (schema: ZodObject<any>) => {
	return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
		const result = await schema.safeParseAsync({
			body: req.body,
			query: req.query,
			params: req.params,
			cookies: req.cookies,
		});

		if (!result.success) {
			throw result.error;
		}

		// Reassign validated data back to request object to get the sanitized values
		if (result.data.body) req.body = result.data.body;
		if (result.data.query) {
			for (const key in req.query) delete req.query[key];
			Object.assign(req.query, result.data.query);
		}
		if (result.data.params) {
			for (const key in req.params) delete req.params[key];
			Object.assign(req.params, result.data.params);
		}
		if (result.data.cookies) req.cookies = result.data.cookies;

		next();
	});
};
