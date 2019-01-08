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

import { logger } from "@atomist/automation-client";
import {
    ExecuteGoal,
    GoalInvocation,
    spawnLog,
    updateGoal,
} from "@atomist/sdm";
import { SdmGoalState } from "../../typings/types";

export const sonarAgentScanner: ExecuteGoal = async (r: GoalInvocation) => {
    logger.info(`SonarScan: Running Sonar Scanner Agent`);

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

    await r.configuration.sdm.projectLoader.doWithProject({
        credentials: r.credentials,
        context: r.context,
        id: r.id,
        cloneOptions: {
            alwaysDeep: r.configuration.sdm.sonar.cloneDepth,
            detachHead: true,
        },
        readOnly: true,
    }, async project => {
        const sonarScannerCommand = sonarOptions.sonarScannerPath || "sonar-scanner";
        const spawnResult = await spawnLog(
            sonarScannerCommand,
            commandArgs,
            {
                log: r.progressLog,
                cwd: project.baseDir,
            },
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

        await updateGoal(r.context, r.goalEvent, {
            state: SdmGoalState.in_process,
            description: r.goal.inProcessDescription,
            data: taskId,
        });

        return {
            state: SdmGoalState.in_process,
            description: r.goal.inProcessDescription,
        };
    });
};
