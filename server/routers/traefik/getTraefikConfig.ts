import { Request, Response } from "express";
import db from "@server/db";
import { and, eq, inArray } from "drizzle-orm";
import logger from "@server/logger";
import HttpCode from "@server/types/HttpCode";
import config from "@server/lib/config";
import { orgs, resources, sites, Target, targets } from "@server/db/schemas";
import { sql } from "drizzle-orm";

export async function traefikConfigProvider(
    _: Request,
    res: Response
): Promise<any> {
    try {
        // Get all resources with related data
        const allResources = await db.transaction(async (tx) => {
            // First query to get resources with site and org info
            const resourcesWithRelations = await tx
                .select({
                    // Resource fields
                    resourceId: resources.resourceId,
                    subdomain: resources.subdomain,
                    fullDomain: resources.fullDomain,
                    ssl: resources.ssl,
                    blockAccess: resources.blockAccess,
                    sso: resources.sso,
                    emailWhitelistEnabled: resources.emailWhitelistEnabled,
                    http: resources.http,
                    proxyPort: resources.proxyPort,
                    protocol: resources.protocol,
                    isBaseDomain: resources.isBaseDomain,
                    domainId: resources.domainId,
                    // Site fields
                    site: {
                        siteId: sites.siteId,
                        type: sites.type,
                        subnet: sites.subnet
                    },
                    // Org fields
                    org: {
                        orgId: orgs.orgId
                    },
                    enabled: resources.enabled,
                    stickySession: resources.stickySession
                })
                .from(resources)
                .innerJoin(sites, eq(sites.siteId, resources.siteId))
                .innerJoin(orgs, eq(resources.orgId, orgs.orgId));

            // Get all resource IDs from the first query
            const resourceIds = resourcesWithRelations.map((r) => r.resourceId);

            // Second query to get all enabled targets for these resources
            const allTargets =
                resourceIds.length > 0
                    ? await tx
                          .select({
                              resourceId: targets.resourceId,
                              targetId: targets.targetId,
                              ip: targets.ip,
                              method: targets.method,
                              port: targets.port,
                              internalPort: targets.internalPort,
                              enabled: targets.enabled
                          })
                          .from(targets)
                          .where(
                              and(
                                  inArray(targets.resourceId, resourceIds),
                                  eq(targets.enabled, true)
                              )
                          )
                    : [];

            // Create a map for fast target lookup by resourceId
            const targetsMap = allTargets.reduce((map, target) => {
                if (!map.has(target.resourceId)) {
                    map.set(target.resourceId, []);
                }
                map.get(target.resourceId).push(target);
                return map;
            }, new Map());

            // Combine the data
            return resourcesWithRelations.map((resource) => ({
                ...resource,
                targets: targetsMap.get(resource.resourceId) || []
            }));
        });

        if (!allResources.length) {
            return res.status(HttpCode.OK).json({});
        }

        const badgerMiddlewareName = "badger";
        const redirectHttpsMiddlewareName = "redirect-to-https";

        const config_output: any = {
            http: {
                middlewares: {
                    [badgerMiddlewareName]: {
                        plugin: {
                            [badgerMiddlewareName]: {
                                apiBaseUrl: new URL(
                                    "/api/v1",
                                    `http://${config.getRawConfig().server.internal_hostname}:${
                                        config.getRawConfig().server
                                            .internal_port
                                    }`
                                ).href,
                                userSessionCookieName:
                                    config.getRawConfig().server
                                        .session_cookie_name,

                                // deprecated
                                accessTokenQueryParam:
                                    config.getRawConfig().server
                                        .resource_access_token_param,

                                resourceSessionRequestParam:
                                    config.getRawConfig().server
                                        .resource_session_request_param
                            }
                        }
                    },
                    [redirectHttpsMiddlewareName]: {
                        redirectScheme: {
                            scheme: "https"
                        }
                    }
                }
            }
        };

        for (const resource of allResources) {
            const targets = resource.targets as Target[];
            const site = resource.site;
            const org = resource.org;

            const routerName = `${resource.resourceId}-router`;
            const serviceName = `${resource.resourceId}-service`;
            const fullDomain = `${resource.fullDomain}`;

            if (!resource.enabled) {
                continue;
            }

            if (resource.http) {
                if (!resource.domainId) {
                    continue;
                }

                if (!resource.fullDomain) {
                    logger.error(
                        `Resource ${resource.resourceId} has no fullDomain`
                    );
                    continue;
                }

                // HTTP configuration remains the same
                if (!resource.subdomain && !resource.isBaseDomain) {
                    continue;
                }

                // add routers and services empty objects if they don't exist
                if (!config_output.http.routers) {
                    config_output.http.routers = {};
                }

                if (!config_output.http.services) {
                    config_output.http.services = {};
                }

                const domainParts = fullDomain.split(".");
                let wildCard;
                if (domainParts.length <= 2) {
                    wildCard = `*.${domainParts.join(".")}`;
                } else {
                    wildCard = `*.${domainParts.slice(1).join(".")}`;
                }

                if (resource.isBaseDomain) {
                    wildCard = resource.fullDomain;
                }

                const configDomain = config.getDomain(resource.domainId);

                if (!configDomain) {
                    logger.error(
                        `Failed to get domain from config for resource ${resource.resourceId}`
                    );
                    continue;
                }

                const tls = {
                    certResolver: configDomain.cert_resolver,
                    ...(configDomain.prefer_wildcard_cert
                        ? {
                              domains: [
                                  {
                                      main: wildCard
                                  }
                              ]
                          }
                        : {})
                };

                const additionalMiddlewares =
                    config.getRawConfig().traefik.additional_middlewares || [];

                config_output.http.routers![routerName] = {
                    entryPoints: [
                        resource.ssl
                            ? config.getRawConfig().traefik.https_entrypoint
                            : config.getRawConfig().traefik.http_entrypoint
                    ],
                    middlewares: [
                        badgerMiddlewareName,
                        ...additionalMiddlewares
                    ],
                    service: serviceName,
                    rule: `Host(\`${fullDomain}\`)`,
                    ...(resource.ssl ? { tls } : {})
                };

                if (resource.ssl) {
                    config_output.http.routers![routerName + "-redirect"] = {
                        entryPoints: [
                            config.getRawConfig().traefik.http_entrypoint
                        ],
                        middlewares: [redirectHttpsMiddlewareName],
                        service: serviceName,
                        rule: `Host(\`${fullDomain}\`)`
                    };
                }

                config_output.http.services![serviceName] = {
                    loadBalancer: {
                        servers: targets
                            .filter((target: Target) => {
                                if (!target.enabled) {
                                    return false;
                                }
                                if (
                                    site.type === "local" ||
                                    site.type === "wireguard"
                                ) {
                                    if (
                                        !target.ip ||
                                        !target.port ||
                                        !target.method
                                    ) {
                                        return false;
                                    }
                                } else if (site.type === "newt") {
                                    if (
                                        !target.internalPort ||
                                        !target.method
                                    ) {
                                        return false;
                                    }
                                }
                                return true;
                            })
                            .map((target: Target) => {
                                if (
                                    site.type === "local" ||
                                    site.type === "wireguard"
                                ) {
                                    return {
                                        url: `${target.method}://${target.ip}:${target.port}`
                                    };
                                } else if (site.type === "newt") {
                                    const ip = site.subnet.split("/")[0];
                                    return {
                                        url: `${target.method}://${ip}:${target.internalPort}`
                                    };
                                }
                            }),
                        ...(resource.stickySession
                            ? {
                                  sticky: {
                                      cookie: {
                                          name: "pangolin_sticky",
                                          secure: resource.ssl,
                                          httpOnly: true
                                      }
                                  }
                              }
                            : {})
                    }
                };
            } else {
                // Non-HTTP (TCP/UDP) configuration
                const protocol = resource.protocol.toLowerCase();
                const port = resource.proxyPort;

                if (!port) {
                    continue;
                }

                if (!config_output[protocol]) {
                    config_output[protocol] = {
                        routers: {},
                        services: {}
                    };
                }

                config_output[protocol].routers[routerName] = {
                    entryPoints: [`${protocol}-${port}`],
                    service: serviceName,
                    ...(protocol === "tcp" ? { rule: "HostSNI(`*`)" } : {})
                };

                config_output[protocol].services[serviceName] = {
                    loadBalancer: {
                        servers: targets
                            .filter((target: Target) => {
                                if (!target.enabled) {
                                    return false;
                                }
                                if (
                                    site.type === "local" ||
                                    site.type === "wireguard"
                                ) {
                                    if (!target.ip || !target.port) {
                                        return false;
                                    }
                                } else if (site.type === "newt") {
                                    if (!target.internalPort) {
                                        return false;
                                    }
                                }
                                return true;
                            })
                            .map((target: Target) => {
                                if (
                                    site.type === "local" ||
                                    site.type === "wireguard"
                                ) {
                                    return {
                                        address: `${target.ip}:${target.port}`
                                    };
                                } else if (site.type === "newt") {
                                    const ip = site.subnet.split("/")[0];
                                    return {
                                        address: `${ip}:${target.internalPort}`
                                    };
                                }
                            }),
                        ...(resource.stickySession
                            ? {
                                  sticky: {
                                      cookie: {
                                          name: "pangolin_sticky",
                                          secure: resource.ssl,
                                          httpOnly: true
                                      }
                                  }
                              }
                            : {})
                    }
                };
            }
        }
        return res.status(HttpCode.OK).json(config_output);
    } catch (e) {
        logger.error(`Failed to build Traefik config: ${e}`);
        return res.status(HttpCode.INTERNAL_SERVER_ERROR).json({
            error: "Failed to build Traefik config"
        });
    }
}
