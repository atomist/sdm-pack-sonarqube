import {projectUtils} from "@atomist/automation-client";
import { microgrammar } from "@atomist/microgrammar";
import {PredicatePushTest, predicatePushTest} from "@atomist/sdm";

export const sonarIsMaven = predicatePushTest(
    "mavenProject",
    async p => {
        return p.hasFile("pom.xml");
    },
);

/**
 * Microgrammar to extract TargetFramework from a .csproj file
 */
export const dotnetCoreGrammar = microgrammar<{ target: string }>({
    // tslint:disable-next-line:no-invalid-template-strings
    phrase: "<TargetFramework>${target}</TargetFramework>",
    terms: {
        target: /[a-zA-Z_\.0-9\-]+/,
    },
});

export const sonarIsDotNetCore: PredicatePushTest = predicatePushTest(
    "isDotNetCore",
    async p => {
        const csprojFiles = await projectUtils.gatherFromFiles(p, "*.csproj", async f => f);
        if (!csprojFiles || csprojFiles.length === 0) {
            return false;
        }
        const csproj = await csprojFiles[0].getContent();
        const targetMatch = dotnetCoreGrammar.firstMatch(csproj);
        if (!targetMatch) {
            return false;
        }
        if (!!targetMatch.target && targetMatch.target.startsWith("netcoreapp")) {
            return true;
        }

        return false;
    },
);
