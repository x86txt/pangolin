import db from "@server/db";
import { sql } from "drizzle-orm";

const version = "1.3.0";

export default async function migration() {
    console.log(`Running setup script ${version}...`);

    try {
        db.transaction((trx) => {
            trx.run(
                sql`ALTER TABLE resources ADD stickySession integer DEFAULT false NOT NULL;`
            );
        });

        console.log(`Added new column: stickySession`);
    } catch (e) {
        console.log("Unable to add new column: stickySession");
        throw e;
    }

    console.log(`${version} migration complete`);
}
