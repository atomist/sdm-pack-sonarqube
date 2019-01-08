/*
 * Copyright © 2019 Atomist, Inc.
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

import { configurationValue, logger } from "@atomist/automation-client";
import {
    doWithProject,
    ExecuteGoal,
    slackErrorMessage,
    slackInfoMessage,
} from "@atomist/sdm";
import { SdmGoalState } from "../../typings/types";

export function sonarAgentScanner(): ExecuteGoal {
    return doWithProject(
        async r => {
            logger.info(`SonarScan: Running Sonar Scanner Agent`);

            /**
             * Populate values to raise error if sonar configuration is missing
             */
            const docsUrl =
                    // tslint:disable-next-line:max-line-length
                    `<https://docs.sonarqube.org/display/SCAN/Analyzing+with+SonarQube+Scanner|sonar-project.properties>`;

            const subject = "SonarQube/SonarCloud Code Inspection Configuration Error!";
            const error =
                `No project configuration could be found.  Please ensure this project is either using maven` +
                ` (and therefore has a POM file), ` +
                `or please ensure a ` +
                `${docsUrl} ` +
                `file is present on the root of the project.`;

            // If there is no config, make some noise
            if (!await r.project.hasFile("sonar-project.properties")) {
                if (configurationValue<boolean>("sdm.sonar.warnOnMissingViableConfig", false)) {
                    // If we've configured to just warn on missing config send the message to slack
                    // but set the goal as succeeded so the rest of our goals progress.
                    await r.addressChannels(slackInfoMessage(
                        subject,
                        error,
                    ));

                    return {
                        state: SdmGoalState.success,
                        description: r.goal.successDescription,
                    };
                } else {
                    // Notify the channel of the failure
                    await r.addressChannels(slackErrorMessage(
                        subject,
                        error,
                        r.context,
                    ));

                    return {
                        state: SdmGoalState.failure,
                        description: r.goal.failureDescription,
                        error,
                    };
                }
            }

            /**
             *  Add arguments, note that these are definitely present as they are set to required
             * options in the SDM pack
             */
            const sonarOptions = r.configuration.sdm.sonar;
            const commandArgs: string[] = [];
            commandArgs.push(`-Dsonar.host.url=${sonarOptions.url}`);
            commandArgs.push(`-Dsonar.organization=${sonarOptions.org}`);
            commandArgs.push(`-Dsonar.login=${sonarOptions.token}`);
            commandArgs.push(`-Dsonar.analysis.scmRevision=${r.id.sha}`);
            commandArgs.push(`-Dsonar.analysis.scmBranch=${r.id.branch}`);

            // Append sonar-scanner options, if supplied
            if (sonarOptions.sonarScannerArgs) {
                commandArgs.push(...sonarOptions.sonarScannerArgs);
            }

            // Set the branch name
            if (r.id.branch !== "master") {
                commandArgs.push(`-Dsonar.branch.name=${r.id.branch}`);
            }

            const sonarScannerCommand = sonarOptions.sonarScannerPath || "sonar-scanner";
            const spawnResult = await r.spawn(
                sonarScannerCommand,
                commandArgs,
            );

            if (spawnResult.code !== 0) {
                throw new Error(
                    `Sonar Agent failed to run! Exit code ${spawnResult.code}\n\n` +
                    `*Review Log for details*:`,
                );
            }

            // Retrieve the task ID from the scanner output
            const Pattern = /More about the report processing at ([^\s^[]*)/;
            const parsed = Pattern.exec(r.progressLog.log);
            const taskId = parsed[1].split("?")[1].split("=")[1];

            return {
                state: SdmGoalState.in_process,
                description: r.goal.inProcessDescription,
                data: taskId,
            };
    },
    {
        alwaysDeep: configurationValue<boolean>("sdm.sonar.cloneDeep", true),
        readOnly: true,
    });
}
