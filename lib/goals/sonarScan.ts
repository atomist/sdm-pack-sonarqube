import {
  FulfillableGoalDetails,
  Goal,
  getGoalDefinitionFrom,
  DefaultGoalNameGenerator,
  FulfillableGoal,
} from "@atomist/sdm";

export class SonarScan extends FulfillableGoal {
    constructor(private readonly details: FulfillableGoalDetails = {
                    uniqueName: "SonarScan",
                    displayName: "SonarScan",
                    descriptions: {
                        inProcess: "SonarScan in process",
                        failed: "SonarScan failed!",
                        planned: "SonarScan Planned",
                        completed: "SonarScan completed",
                    },
                },
                ...dependsOn: Goal[]) {
        super({
            ...getGoalDefinitionFrom(
                details,
                DefaultGoalNameGenerator.generateName("sonar-scan"),
            ),
        }, ...dependsOn);

        this.addFulfillment({
            name: "@atomist/sonar-scan",
        });
    }
}
