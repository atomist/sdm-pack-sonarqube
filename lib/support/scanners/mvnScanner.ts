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
    isLocalProject,
    GitProject,
    logger,
} from "@atomist/automation-client";
import {
    spawnLog,
    StringCapturingProgressLog,
} from "@atomist/sdm";
import { SonarQubeSupportOptions } from "../../sonarQube";
import { sonarScannerExecuter } from "./scanner";

export const mvnScanner: sonarScannerExecuter = async (project: GitProject, sonarOptions: SonarQubeSupportOptions) => {
    if (!isLocalProject(project)) {
        throw new Error(`Can only perform review on local project!`);
    }
    const commandArgs = ["clean", "package", "sonar:sonar"];

    /**
     *  Add arguments, note that these are definitely present as they are set to required
     * options in the SDM pack
     */
    commandArgs.push(`-Dsonar.host.url=${sonarOptions.url}`);
    commandArgs.push(`-Dsonar.organization=${sonarOptions.org}`);
    commandArgs.push(`-Dsonar.login=${sonarOptions.token}`);
    commandArgs.push(`-Dsonar.analysis.scmRevision=${project.id.sha}`);
    commandArgs.push(`-Dsonar.analysis.scmBranch=${project.id.branch}`);

    // Append sonar-scanner options, if supplied
    if (sonarOptions.mvnSonarArgs) {
        commandArgs.push(...sonarOptions.mvnSonarArgs);
    }

    // Set the branch name
    if (project.id.branch !== "master") {
        commandArgs.push(`-Dsonar.branch.name=${project.id.branch}`);
    }

    const log = new StringCapturingProgressLog();
    const result = await spawnLog(
        "mvn",
        commandArgs,
        {
            log,
            cwd: project.baseDir,
        },
    );

    if (result.code !== 0) {
        logger.error(`Error running Maven Sonar Scan (exit code ${result.code}).  Error [${result.stdout}]`);
        throw new Error(`Error running Maven Sonar Scan, exit code ${result.code}!`);
    }

    return log.log;
};
