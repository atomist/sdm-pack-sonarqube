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
    configurationValue,
    GitCommandGitProject,
    GitHubRepoRef,
    GraphQL,
    OnEvent,
    Success,
} from "@atomist/automation-client";
import {
    EventHandlerRegistration,
    findSdmGoalOnCommit,
    Goal,
    SdmGoalState,
    updateGoal,
} from "@atomist/sdm";
import { SonarQubeSupportOptions } from "../sonarQube";
import { mvnScanner } from "../support/scanners/mvnScanner";
import {
    handleScannerError,
    handleScannerWarn,
} from "../support/scanners/scanner";
import { sonarAgentScanner } from "../support/scanners/sonarAgentScanner";
import {
    SonarScanRequestedGoal,
} from "../typings/types";

export function onRequestedSonarScanHandler(goal: Goal):
    OnEvent<SonarScanRequestedGoal.Subscription> {
        return async (e, ctx) => {
            const sdmGoalData = e.data.SdmGoal[0];
            const repoRef = GitHubRepoRef.from({
                owner: sdmGoalData.push.repo.owner,
                repo: sdmGoalData.push.repo.name,
                sha: sdmGoalData.sha,
                branch: sdmGoalData.branch,
            });

            const sonarQubeOptions = configurationValue<object>("sdm.sonar") as SonarQubeSupportOptions;
            const p = await GitCommandGitProject.cloned(
                {
                    token: configurationValue<string>("token"),
                },
                repoRef,
                {
                    alwaysDeep: configurationValue<boolean>("sdm.sonar.cloneDepth", true),
                    detachHead: true,
                },
            );

            const sdmGoal = await findSdmGoalOnCommit(
                ctx,
                repoRef,
                sdmGoalData.repo.providerId,
                goal,
            );

            /**
             * Set the goal to in progress
             */
            await updateGoal(ctx, sdmGoal, {
                state: SdmGoalState.in_process,
                description: goal.inProcessDescription,
            });

            /** Get the channels linked to this repo */
            const channelDetail = sdmGoalData.push.repo.channels.map(c => c.name);

            let log: string;
            if (await p.hasFile("pom.xml")) {
                log = await mvnScanner(p, sonarQubeOptions)
                    .catch(async error => {
                        const errorString = `Failed to execute Sonar Scan (maven). ${error}`;
                        return handleScannerError(ctx, sdmGoal, goal, errorString, error, channelDetail);
                    });
            } else if (await p.hasFile("sonar-project.properties")) {
                log = await sonarAgentScanner(p, sonarQubeOptions)
                    .catch(async error => {
                        const errorString = `Failed to execute Sonar Scanner Utility. ${error}`;
                        return handleScannerError(ctx, sdmGoal, goal, errorString, error, channelDetail);
                    });
            } else {
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

                if (sonarQubeOptions.warnOnMissingViableConfig) {
                    await handleScannerWarn(ctx, sdmGoal, goal, error, error, channelDetail, subject);
                } else {
                    await handleScannerError(ctx, sdmGoal, goal, error, error, channelDetail, subject);
                }
            }

            // Retrieve the task ID from the scanner output
            const Pattern = /More about the report processing at ([^\s^[]*)/;
            const parsed = Pattern.exec(log);
            const taskId = parsed[1].split("?")[1].split("=")[1];

            await updateGoal(ctx, sdmGoal, {
                state: SdmGoalState.in_process,
                description: goal.inProcessDescription,
                data: taskId,
            });

            return Success;
        };
    }

export function onRequestedSonarScan(goal: Goal): EventHandlerRegistration<SonarScanRequestedGoal.Subscription> {
    return {
        name: "OnRequestedSonarScan",
        subscription: GraphQL.subscription("SonarScanRequestedGoal"),
        listener: onRequestedSonarScanHandler(goal),
    };
}
