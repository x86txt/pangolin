import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@server/db";
import {
    domains,
    Org,
    orgDomains,
    orgs,
    Resource,
    resources
} from "@server/db/schemas";
import { eq, and } from "drizzle-orm";
import response from "@server/lib/response";
import HttpCode from "@server/types/HttpCode";
import createHttpError from "http-errors";
import logger from "@server/logger";
import { fromError } from "zod-validation-error";
import config from "@server/lib/config";
import { subdomainSchema } from "@server/lib/schemas";
import { registry } from "@server/openApi";
import { OpenAPITags } from "@server/openApi";

const updateResourceParamsSchema = z
    .object({
        resourceId: z
            .string()
            .transform(Number)
            .pipe(z.number().int().positive())
    })
    .strict();

const updateHttpResourceBodySchema = z
    .object({
        name: z.string().min(1).max(255).optional(),
        subdomain: subdomainSchema
            .optional()
            .transform((val) => val?.toLowerCase()),
        ssl: z.boolean().optional(),
        sso: z.boolean().optional(),
        blockAccess: z.boolean().optional(),
        emailWhitelistEnabled: z.boolean().optional(),
        isBaseDomain: z.boolean().optional(),
        applyRules: z.boolean().optional(),
        domainId: z.string().optional(),
        enabled: z.boolean().optional(),
        stickySession: z.boolean().optional()
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided for update"
    })
    .refine(
        (data) => {
            if (data.subdomain) {
                return subdomainSchema.safeParse(data.subdomain).success;
            }
            return true;
        },
        { message: "Invalid subdomain" }
    )
    .refine(
        (data) => {
            if (!config.getRawConfig().flags?.allow_base_domain_resources) {
                if (data.isBaseDomain) {
                    return false;
                }
            }
            return true;
        },
        {
            message: "Base domain resources are not allowed"
        }
    );

export type UpdateResourceResponse = Resource;

const updateRawResourceBodySchema = z
    .object({
        name: z.string().min(1).max(255).optional(),
        proxyPort: z.number().int().min(1).max(65535).optional(),
        enabled: z.boolean().optional()
    })
    .strict()
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field must be provided for update"
    })
    .refine(
        (data) => {
            if (!config.getRawConfig().flags?.allow_raw_resources) {
                if (data.proxyPort !== undefined) {
                    return false;
                }
            }
            return true;
        },
        { message: "Cannot update proxyPort" }
    );

registry.registerPath({
    method: "post",
    path: "/resource/{resourceId}",
    description: "Update a resource.",
    tags: [OpenAPITags.Resource],
    request: {
        params: updateResourceParamsSchema,
        body: {
            content: {
                "application/json": {
                    schema: updateHttpResourceBodySchema.and(
                        updateRawResourceBodySchema
                    )
                }
            }
        }
    },
    responses: {}
});

export async function updateResource(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<any> {
    try {
        const parsedParams = updateResourceParamsSchema.safeParse(req.params);
        if (!parsedParams.success) {
            return next(
                createHttpError(
                    HttpCode.BAD_REQUEST,
                    fromError(parsedParams.error).toString()
                )
            );
        }

        const { resourceId } = parsedParams.data;

        const [result] = await db
            .select()
            .from(resources)
            .where(eq(resources.resourceId, resourceId))
            .leftJoin(orgs, eq(resources.orgId, orgs.orgId));

        const resource = result.resources;
        const org = result.orgs;

        if (!resource || !org) {
            return next(
                createHttpError(
                    HttpCode.NOT_FOUND,
                    `Resource with ID ${resourceId} not found`
                )
            );
        }

        if (resource.http) {
            // HANDLE UPDATING HTTP RESOURCES
            return await updateHttpResource(
                {
                    req,
                    res,
                    next
                },
                {
                    resource,
                    org
                }
            );
        } else {
            // HANDLE UPDATING RAW TCP/UDP RESOURCES
            return await updateRawResource(
                {
                    req,
                    res,
                    next
                },
                {
                    resource,
                    org
                }
            );
        }
    } catch (error) {
        logger.error(error);
        return next(
            createHttpError(HttpCode.INTERNAL_SERVER_ERROR, "An error occurred")
        );
    }
}

async function updateHttpResource(
    route: {
        req: Request;
        res: Response;
        next: NextFunction;
    },
    meta: {
        resource: Resource;
        org: Org;
    }
) {
    const { next, req, res } = route;
    const { resource, org } = meta;

    const parsedBody = updateHttpResourceBodySchema.safeParse(req.body);
    if (!parsedBody.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedBody.error).toString()
            )
        );
    }

    const updateData = parsedBody.data;

    if (updateData.domainId) {
        const [existingDomain] = await db
            .select()
            .from(orgDomains)
            .where(
                and(
                    eq(orgDomains.orgId, org.orgId),
                    eq(orgDomains.domainId, updateData.domainId)
                )
            )
            .leftJoin(domains, eq(orgDomains.domainId, domains.domainId));

        if (!existingDomain) {
            return next(
                createHttpError(HttpCode.NOT_FOUND, `Domain not found`)
            );
        }
    }

    const domainId = updateData.domainId || resource.domainId!;
    const subdomain = updateData.subdomain || resource.subdomain;

    const [domain] = await db
        .select()
        .from(domains)
        .where(eq(domains.domainId, domainId));

    const isBaseDomain =
        updateData.isBaseDomain !== undefined
            ? updateData.isBaseDomain
            : resource.isBaseDomain;

    let fullDomain: string | null = null;
    if (isBaseDomain) {
        fullDomain = domain.baseDomain;
    } else if (subdomain && domain) {
        fullDomain = `${subdomain}.${domain.baseDomain}`;
    }

    if (fullDomain) {
        const [existingDomain] = await db
            .select()
            .from(resources)
            .where(eq(resources.fullDomain, fullDomain));

        if (
            existingDomain &&
            existingDomain.resourceId !== resource.resourceId
        ) {
            return next(
                createHttpError(
                    HttpCode.CONFLICT,
                    "Resource with that domain already exists"
                )
            );
        }
    }

    const updatePayload = {
        ...updateData,
        fullDomain
    };

    const updatedResource = await db
        .update(resources)
        .set(updatePayload)
        .where(eq(resources.resourceId, resource.resourceId))
        .returning();

    if (updatedResource.length === 0) {
        return next(
            createHttpError(
                HttpCode.NOT_FOUND,
                `Resource with ID ${resource.resourceId} not found`
            )
        );
    }

    return response(res, {
        data: updatedResource[0],
        success: true,
        error: false,
        message: "HTTP resource updated successfully",
        status: HttpCode.OK
    });
}

async function updateRawResource(
    route: {
        req: Request;
        res: Response;
        next: NextFunction;
    },
    meta: {
        resource: Resource;
        org: Org;
    }
) {
    const { next, req, res } = route;
    const { resource } = meta;

    const parsedBody = updateRawResourceBodySchema.safeParse(req.body);
    if (!parsedBody.success) {
        return next(
            createHttpError(
                HttpCode.BAD_REQUEST,
                fromError(parsedBody.error).toString()
            )
        );
    }

    const updateData = parsedBody.data;

    if (updateData.proxyPort) {
        const proxyPort = updateData.proxyPort;
        const existingResource = await db
            .select()
            .from(resources)
            .where(
                and(
                    eq(resources.protocol, resource.protocol),
                    eq(resources.proxyPort, proxyPort!)
                )
            );

        if (
            existingResource.length > 0 &&
            existingResource[0].resourceId !== resource.resourceId
        ) {
            return next(
                createHttpError(
                    HttpCode.CONFLICT,
                    "Resource with that protocol and port already exists"
                )
            );
        }
    }

    const updatedResource = await db
        .update(resources)
        .set(updateData)
        .where(eq(resources.resourceId, resource.resourceId))
        .returning();

    if (updatedResource.length === 0) {
        return next(
            createHttpError(
                HttpCode.NOT_FOUND,
                `Resource with ID ${resource.resourceId} not found`
            )
        );
    }

    return response(res, {
        data: updatedResource[0],
        success: true,
        error: false,
        message: "Non-http Resource updated successfully",
        status: HttpCode.OK
    });
}
