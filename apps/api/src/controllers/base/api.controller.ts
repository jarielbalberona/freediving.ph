import { Request, Response } from "express";
import { z } from "zod";

import { ApiResponse } from "@/utils/serviceApi";

type QueryParamsProxy = {
	[key: string]: string | null;
};

export abstract class ApiController {
	protected request: Request;
	protected response: Response;
	protected searchParams: QueryParamsProxy;
	protected apiResponse: ApiResponse;

	protected constructor(req: Request, res: Response) {
		this.request = req;
		this.response = res;
		this.apiResponse = new ApiResponse(res);

		this.searchParams = this.getQueryParam(req);
	}

	getReqBody() {
		return this.request.body;
	}

	getQueryParam(request: Request): QueryParamsProxy {
		const queryParams = request.query;
		const handler = {
			get: (target: Record<string, any>, prop: string) => {
				return target[prop] || null;
			}
		};
		return new Proxy(queryParams, handler) as QueryParamsProxy;
	}

	protected validationError(error: z.ZodError) {
		return this.apiResponse.validationErrorResponse(
			"Validation failed",
			error.errors.map(issue => ({
				field: issue.path.join(".") || "root",
				message: issue.message
			}))
		);
	}
}

export interface ApiCrudController {
	index(): unknown;
	create(): unknown;
	show(id: number | string): unknown;
	update(id: number | string): unknown;
	delete(id: number | string): unknown;
}
