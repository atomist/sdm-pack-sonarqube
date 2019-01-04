/*
 * Copyright © 2018 Atomist, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
    DefaultGoalNameGenerator,
    FulfillableGoal,
    FulfillableGoalDetails,
    getGoalDefinitionFrom,
    Goal,
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
