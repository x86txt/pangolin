import { Router } from "express";
import config from "@server/lib/config";
import * as site from "./site";
import * as org from "./org";
import * as resource from "./resource";
import * as target from "./target";
import * as user from "./user";
import * as auth from "./auth";
import * as role from "./role";
import * as client from "./client";
import * as accessToken from "./accessToken";
import HttpCode from "@server/types/HttpCode";
import {
    verifyAccessTokenAccess,
    rateLimitMiddleware,
    verifySessionMiddleware,
    verifySessionUserMiddleware,
    verifyOrgAccess,
    verifySiteAccess,
    verifyResourceAccess,
    verifyTargetAccess,
    verifyRoleAccess,
    verifySetResourceUsers,
    verifyUserAccess,
    getUserOrgs,
    verifyClientAccess
} from "@server/middlewares";
import { verifyUserHasAction } from "../middlewares/verifyUserHasAction";
import { ActionsEnum } from "@server/auth/actions";
import { verifyUserIsOrgOwner } from "../middlewares/verifyUserIsOrgOwner";
import { createNewt, getToken } from "./newt";
import rateLimit from "express-rate-limit";
import createHttpError from "http-errors";

// Root routes
export const unauthenticated = Router();

unauthenticated.get("/", (_, res) => {
    res.status(HttpCode.OK).json({ message: "Healthy" });
});

// Authenticated Root routes
export const authenticated = Router();
authenticated.use(verifySessionUserMiddleware);

authenticated.get("/org/checkId", org.checkId);
authenticated.put("/org", getUserOrgs, org.createOrg);
authenticated.get("/orgs", getUserOrgs, org.listOrgs); // TODO we need to check the orgs here
authenticated.get(
    "/org/:orgId",
    verifyOrgAccess,
    verifyUserHasAction(ActionsEnum.getOrg),
    org.getOrg
);
authenticated.post(
    "/org/:orgId",
    verifyOrgAccess,
    verifyUserHasAction(ActionsEnum.updateOrg),
    org.updateOrg
);
authenticated.delete(
    "/org/:orgId",
    verifyOrgAccess,
    verifyUserIsOrgOwner,
    org.deleteOrg
);

authenticated.put(
    "/org/:orgId/site",
    verifyOrgAccess,
    verifyUserHasAction(ActionsEnum.createSite),
    site.createSite
);
authenticated.get(
    "/org/:orgId/sites",
    verifyOrgAccess,
    verifyUserHasAction(ActionsEnum.listSites),
    site.listSites
);
authenticated.get(
    "/org/:orgId/site/:niceId",
    verifyOrgAccess,
    verifyUserHasAction(ActionsEnum.getSite),
    site.getSite
);

authenticated.get(
    "/org/:orgId/pick-site-defaults",
    verifyOrgAccess,
    verifyUserHasAction(ActionsEnum.createSite),
    site.pickSiteDefaults
);
authenticated.get(
    "/site/:siteId",
    verifySiteAccess,
    verifyUserHasAction(ActionsEnum.getSite),
    site.getSite
);

authenticated.get(
    "/site/:siteId/pick-client-defaults",
    verifySiteAccess,
    verifyUserHasAction(ActionsEnum.createClient),
    client.pickClientDefaults
);

authenticated.put(
    "/site/:siteId/client",
    verifySiteAccess,
    verifyUserHasAction(ActionsEnum.createClient),
    client.createClient
);

authenticated.delete(
    "/client/:clientId",
    verifyClientAccess,
    verifyUserHasAction(ActionsEnum.deleteClient),
    client.deleteClient
);


// authenticated.get(
//     "/site/:siteId/roles",
//     verifySiteAccess,
//     verifyUserHasAction(ActionsEnum.listSiteRoles),
//     site.listSiteRoles
// );
authenticated.post(
    "/site/:siteId",
    verifySiteAccess,
    verifyUserHasAction(ActionsEnum.updateSite),
    site.updateSite
);
authenticated.delete(
    "/site/:siteId",
    verifySiteAccess,
    verifyUserHasAction(ActionsEnum.deleteSite),
    site.deleteSite
);

authenticated.put(
    "/org/:orgId/site/:siteId/resource",
    verifyOrgAccess,
    verifyUserHasAction(ActionsEnum.createResource),
    resource.createResource
);

authenticated.get(
    "/site/:siteId/resources",
    verifyUserHasAction(ActionsEnum.listResources),
    resource.listResources
);

authenticated.get(
    "/org/:orgId/resources",
    verifyOrgAccess,
    verifyUserHasAction(ActionsEnum.listResources),
    resource.listResources
);

authenticated.post(
    "/org/:orgId/create-invite",
    verifyOrgAccess,
    verifyUserHasAction(ActionsEnum.inviteUser),
    user.inviteUser
); // maybe make this /invite/create instead
unauthenticated.post("/invite/accept", user.acceptInvite); // this is supposed to be unauthenticated

authenticated.get(
    "/resource/:resourceId/roles",
    verifyResourceAccess,
    verifyUserHasAction(ActionsEnum.listResourceRoles),
    resource.listResourceRoles
);

authenticated.get(
    "/resource/:resourceId/users",
    verifyResourceAccess,
    verifyUserHasAction(ActionsEnum.listResourceUsers),
    resource.listResourceUsers
);

authenticated.get(
    "/resource/:resourceId",
    verifyResourceAccess,
    verifyUserHasAction(ActionsEnum.getResource),
    resource.getResource
);
authenticated.post(
    "/resource/:resourceId",
    verifyResourceAccess,
    verifyUserHasAction(ActionsEnum.updateResource),
    resource.updateResource
);
authenticated.delete(
    "/resource/:resourceId",
    verifyResourceAccess,
    verifyUserHasAction(ActionsEnum.deleteResource),
    resource.deleteResource
);

authenticated.put(
    "/resource/:resourceId/target",
    verifyResourceAccess,
    verifyUserHasAction(ActionsEnum.createTarget),
    target.createTarget
);
authenticated.get(
    "/resource/:resourceId/targets",
    verifyResourceAccess,
    verifyUserHasAction(ActionsEnum.listTargets),
    target.listTargets
);

authenticated.put(
    "/resource/:resourceId/rule",
    verifyResourceAccess,
    verifyUserHasAction(ActionsEnum.createResourceRule),
    resource.createResourceRule
);
authenticated.get(
    "/resource/:resourceId/rules",
    verifyResourceAccess,
    verifyUserHasAction(ActionsEnum.listResourceRules),
    resource.listResourceRules
);
authenticated.post(
    "/resource/:resourceId/rule/:ruleId",
    verifyResourceAccess,
    verifyUserHasAction(ActionsEnum.updateResourceRule),
    resource.updateResourceRule
);
authenticated.delete(
    "/resource/:resourceId/rule/:ruleId",
    verifyResourceAccess,
    verifyUserHasAction(ActionsEnum.deleteResourceRule),
    resource.deleteResourceRule
);

authenticated.get(
    "/target/:targetId",
    verifyTargetAccess,
    verifyUserHasAction(ActionsEnum.getTarget),
    target.getTarget
);
authenticated.post(
    "/target/:targetId",
    verifyTargetAccess,
    verifyUserHasAction(ActionsEnum.updateTarget),
    target.updateTarget
);
authenticated.delete(
    "/target/:targetId",
    verifyTargetAccess,
    verifyUserHasAction(ActionsEnum.deleteTarget),
    target.deleteTarget
);


authenticated.put(
    "/org/:orgId/role",
    verifyOrgAccess,
    verifyUserHasAction(ActionsEnum.createRole),
    role.createRole
);
authenticated.get(
    "/org/:orgId/roles",
    verifyOrgAccess,
    verifyUserHasAction(ActionsEnum.listRoles),
    role.listRoles
);
// authenticated.get(
//     "/role/:roleId",
//     verifyRoleAccess,
//     verifyUserInRole,
//     verifyUserHasAction(ActionsEnum.getRole),
//     role.getRole
// );
// authenticated.post(
//     "/role/:roleId",
//     verifyRoleAccess,
//     verifyUserHasAction(ActionsEnum.updateRole),
//     role.updateRole
// );
authenticated.delete(
    "/role/:roleId",
    verifyRoleAccess,
    verifyUserHasAction(ActionsEnum.deleteRole),
    role.deleteRole
);
authenticated.post(
    "/role/:roleId/add/:userId",
    verifyRoleAccess,
    verifyUserAccess,
    verifyUserHasAction(ActionsEnum.addUserRole),
    user.addUserRole
);

// authenticated.put(
//     "/role/:roleId/site",
//     verifyRoleAccess,
//     verifyUserInRole,
//     verifyUserHasAction(ActionsEnum.addRoleSite),
//     role.addRoleSite
// );
// authenticated.delete(
//     "/role/:roleId/site",
//     verifyRoleAccess,
//     verifyUserInRole,
//     verifyUserHasAction(ActionsEnum.removeRoleSite),
//     role.removeRoleSite
// );
// authenticated.get(
//     "/role/:roleId/sites",
//     verifyRoleAccess,
//     verifyUserInRole,
//     verifyUserHasAction(ActionsEnum.listRoleSites),
//     role.listRoleSites
// );

authenticated.post(
    "/resource/:resourceId/roles",
    verifyResourceAccess,
    verifyRoleAccess,
    verifyUserHasAction(ActionsEnum.setResourceRoles),
    resource.setResourceRoles
);

authenticated.post(
    "/resource/:resourceId/users",
    verifyResourceAccess,
    verifySetResourceUsers,
    verifyUserHasAction(ActionsEnum.setResourceUsers),
    resource.setResourceUsers
);

authenticated.post(
    `/resource/:resourceId/password`,
    verifyResourceAccess,
    verifyUserHasAction(ActionsEnum.setResourcePassword),
    resource.setResourcePassword
);

authenticated.post(
    `/resource/:resourceId/pincode`,
    verifyResourceAccess,
    verifyUserHasAction(ActionsEnum.setResourcePincode),
    resource.setResourcePincode
);

authenticated.post(
    `/resource/:resourceId/whitelist`,
    verifyResourceAccess,
    verifyUserHasAction(ActionsEnum.setResourceWhitelist),
    resource.setResourceWhitelist
);

authenticated.get(
    `/resource/:resourceId/whitelist`,
    verifyResourceAccess,
    verifyUserHasAction(ActionsEnum.getResourceWhitelist),
    resource.getResourceWhitelist
);

authenticated.post(
    `/resource/:resourceId/transfer`,
    verifyResourceAccess,
    verifyUserHasAction(ActionsEnum.updateResource),
    resource.transferResource
);

authenticated.post(
    `/resource/:resourceId/access-token`,
    verifyResourceAccess,
    verifyUserHasAction(ActionsEnum.generateAccessToken),
    accessToken.generateAccessToken
);

authenticated.delete(
    `/access-token/:accessTokenId`,
    verifyAccessTokenAccess,
    verifyUserHasAction(ActionsEnum.deleteAcessToken),
    accessToken.deleteAccessToken
);

authenticated.get(
    `/org/:orgId/access-tokens`,
    verifyOrgAccess,
    verifyUserHasAction(ActionsEnum.listAccessTokens),
    accessToken.listAccessTokens
);

authenticated.get(
    `/resource/:resourceId/access-tokens`,
    verifyResourceAccess,
    verifyUserHasAction(ActionsEnum.listAccessTokens),
    accessToken.listAccessTokens
);

authenticated.get(`/org/:orgId/overview`, verifyOrgAccess, org.getOrgOverview);

unauthenticated.get("/resource/:resourceId/auth", resource.getResourceAuthInfo);

// authenticated.get(
//     "/role/:roleId/resources",
//     verifyRoleAccess,
//     verifyUserInRole,
//     verifyUserHasAction(ActionsEnum.listRoleResources),
//     role.listRoleResources
// );
// authenticated.put(
//     "/role/:roleId/action",
//     verifyRoleAccess,
//     verifyUserInRole,
//     verifyUserHasAction(ActionsEnum.addRoleAction),
//     role.addRoleAction
// );
// authenticated.delete(
//     "/role/:roleId/action",
//     verifyRoleAccess,
//     verifyUserInRole,
//     verifyUserHasAction(ActionsEnum.removeRoleAction),
//     role.removeRoleAction
// );
// authenticated.get(
//     "/role/:roleId/actions",
//     verifyRoleAccess,
//     verifyUserInRole,
//     verifyUserHasAction(ActionsEnum.listRoleActions),
//     role.listRoleActions
// );

unauthenticated.get("/user", verifySessionMiddleware, user.getUser);

authenticated.get("/org/:orgId/user/:userId", verifyOrgAccess, user.getOrgUser);
authenticated.get(
    "/org/:orgId/users",
    verifyOrgAccess,
    verifyUserHasAction(ActionsEnum.listUsers),
    user.listUsers
);
authenticated.delete(
    "/org/:orgId/user/:userId",
    verifyOrgAccess,
    verifyUserAccess,
    verifyUserHasAction(ActionsEnum.removeUser),
    user.removeUserOrg
);

// authenticated.put(
//     "/user/:userId/site",
//     verifySiteAccess,
//     verifyUserAccess,
//     verifyUserHasAction(ActionsEnum.addRoleSite),
//     role.addRoleSite
// );
// authenticated.delete(
//     "/user/:userId/site",
//     verifySiteAccess,
//     verifyUserAccess,
//     verifyUserHasAction(ActionsEnum.removeRoleSite),
//     role.removeRoleSite
// );
// authenticated.put(
//     "/org/:orgId/user/:userId/action",
//     verifyOrgAccess,
//     verifyUserAccess,
//     verifyUserHasAction(ActionsEnum.addRoleAction),
//     role.addRoleAction
// );
// authenticated.delete(
//     "/org/:orgId/user/:userId/action",
//     verifyOrgAccess,
//     verifyUserAccess,
//     verifyUserHasAction(ActionsEnum.removeRoleAction),
//     role.removeRoleAction
// );

authenticated.put("/newt", createNewt);

// Auth routes
export const authRouter = Router();
unauthenticated.use("/auth", authRouter);
authRouter.use(
    rateLimitMiddleware({
        windowMin:
            config.getRawConfig().rate_limits.auth?.window_minutes ||
            config.getRawConfig().rate_limits.global.window_minutes,
        max:
            config.getRawConfig().rate_limits.auth?.max_requests ||
            config.getRawConfig().rate_limits.global.max_requests,
        type: "IP_AND_PATH"
    })
);

authRouter.put("/signup", auth.signup);
authRouter.post("/login", auth.login);
authRouter.post("/logout", auth.logout);
authRouter.post("/newt/get-token", getToken);

authRouter.post("/2fa/enable", verifySessionUserMiddleware, auth.verifyTotp);
authRouter.post(
    "/2fa/request",
    verifySessionUserMiddleware,
    auth.requestTotpSecret
);
authRouter.post("/2fa/disable", verifySessionUserMiddleware, auth.disable2fa);
authRouter.post("/verify-email", verifySessionMiddleware, auth.verifyEmail);

authRouter.post(
    "/verify-email/request",
    verifySessionMiddleware,
    rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 3,
        keyGenerator: (req) => `requestEmailVerificationCode:${req.body.email}`,
        handler: (req, res, next) => {
            const message = `You can only request an email verification code ${3} times every ${15} minutes. Please try again later.`;
            return next(createHttpError(HttpCode.TOO_MANY_REQUESTS, message));
        }
    }),
    auth.requestEmailVerificationCode
);

// authRouter.post(
//     "/change-password",
//     verifySessionUserMiddleware,
//     auth.changePassword
// );

authRouter.post(
    "/reset-password/request",
    rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 3,
        keyGenerator: (req) => `requestPasswordReset:${req.body.email}`,
        handler: (req, res, next) => {
            const message = `You can only request a password reset ${3} times every ${15} minutes. Please try again later.`;
            return next(createHttpError(HttpCode.TOO_MANY_REQUESTS, message));
        }
    }),
    auth.requestPasswordReset
);

authRouter.post("/reset-password/", auth.resetPassword);

authRouter.post("/resource/:resourceId/password", resource.authWithPassword);
authRouter.post("/resource/:resourceId/pincode", resource.authWithPincode);

authRouter.post(
    "/resource/:resourceId/whitelist",
    rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 10,
        keyGenerator: (req) => `authWithWhitelist:${req.body.email}`,
        handler: (req, res, next) => {
            const message = `You can only request an email OTP ${10} times every ${15} minutes. Please try again later.`;
            return next(createHttpError(HttpCode.TOO_MANY_REQUESTS, message));
        }
    }),
    resource.authWithWhitelist
);

authRouter.post(
    "/resource/:resourceId/access-token",
    resource.authWithAccessToken
);
