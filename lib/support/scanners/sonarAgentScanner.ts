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
    GitProject,
    isLocalProject,
    ProjectReview,
} from "@atomist/automation-client";
import {
    CodeInspection,
    spawnLog,
    StringCapturingProgressLog,
} from "@atomist/sdm";
import { reviewSonarResult } from "../../review/reviewResult";
import { SonarQubeSupportOptions } from "../../sonarQube";
import { sonarScannerExecuter } from "./scanner";

export const sonarAgentScanner: sonarScannerExecuter = async (p: GitProject, sonarOptions: SonarQubeSupportOptions) => {
    if (!isLocalProject(p)) {
        throw new Error(`Can only perform review on local project`);
    }

    if (!p.hasFile("sonar-project.properties")) {
        throw new Error(`Cannot perform review on non-maven projects that are missing a sonar.properties file!`);
    }

    const commandArgs: string[] = [];
    commandArgs.push(`-Dsonar.host.url=${sonarOptions.url}`);
    commandArgs.push(`-Dsonar.organization=${sonarOptions.org}`);
    commandArgs.push(`-Dsonar.login=${sonarOptions.token}`);
    commandArgs.push(`-Dsonar.analysis.scmRevision=${p.id.sha}`);
    commandArgs.push(`-Dsonar.analysis.scmBranch=${p.id.branch}`);

    // Set the branch name
    if (p.id.branch !== "master") {
        commandArgs.push(`-Dsonar.branch.name=${p.id.branch}`);
    }

    // Append sonar-scanner options, if supplied
    if (sonarOptions.sonarScannerArgs) {
        commandArgs.push(...sonarOptions.sonarScannerArgs);
    }

    const log = new StringCapturingProgressLog();
    const sonarScannerCommand = sonarOptions.sonarScannerPath || "sonar-scanner";
    const spawnResult = await spawnLog(
        sonarScannerCommand,
        commandArgs,
        {
            log,
            cwd: p.baseDir,
        },
    );

    if (spawnResult.code !== 0) {
        throw new Error(
            `Sonar Agent failed to run! Exit code ${spawnResult.code}\n\n` +
            `*Error Log*:\n\n${log.log}`,
        );
    }

    return log.log;
};
