import ProfileIcon from "@app/components/ProfileIcon";
import { verifySession } from "@app/lib/auth/verifySession";
import UserProvider from "@app/providers/UserProvider";
import { cache } from "react";
import OrganizationLandingCard from "./OrganizationLandingCard";
import { GetOrgOverviewResponse } from "@server/routers/org/getOrgOverview";
import { internal } from "@app/lib/api";
import { AxiosResponse } from "axios";
import { authCookieHeader } from "@app/lib/api/cookies";
import { redirect } from "next/navigation";

type OrgPageProps = {
    params: Promise<{ orgId: string }>;
};

export default async function OrgPage(props: OrgPageProps) {
    const params = await props.params;
    const orgId = params.orgId;

    const getUser = cache(verifySession);
    const user = await getUser();

    let redirectToSettings = false;
    let overview: GetOrgOverviewResponse | undefined;
    try {
        const res = await internal.get<AxiosResponse<GetOrgOverviewResponse>>(
            `/org/${orgId}/overview`,
            await authCookieHeader()
        );
        overview = res.data.data;

        if (overview.isAdmin || overview.isOwner) {
            redirectToSettings = true;
        }
    } catch (e) {}

    if (redirectToSettings) {
        redirect(`/${orgId}/settings`);
    }

    return (
        <>
            <div className="p-3">
                {user && (
                    <UserProvider user={user}>
                        <ProfileIcon />
                    </UserProvider>
                )}

                {overview && (
                    <div className="w-full max-w-4xl mx-auto md:mt-32 mt-4">
                        <OrganizationLandingCard
                            overview={{
                                orgId: overview.orgId,
                                orgName: overview.orgName,
                                stats: {
                                    users: overview.numUsers,
                                    sites: overview.numSites,
                                    resources: overview.numResources
                                },
                                isAdmin: overview.isAdmin,
                                isOwner: overview.isOwner,
                                userRole: overview.userRoleName
                            }}
                        />
                    </div>
                )}
            </div>
        </>
    );
}
