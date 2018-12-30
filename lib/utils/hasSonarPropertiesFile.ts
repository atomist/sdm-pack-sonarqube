import { PredicatePushTest, predicatePushTest } from "@atomist/sdm";

export const hasSonarPropertiesFile: PredicatePushTest = predicatePushTest(
    "hasSonarPropertiesFile",
    async p => {
        return p.hasFile("sonar-project.properties");
    },
);
