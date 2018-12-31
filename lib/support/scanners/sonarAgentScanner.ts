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
    logger,
    ProjectReview,
} from "@atomist/automation-client";
import {
    CodeInspection,
    spawnLog,
    StringCapturingProgressLog,
} from "@atomist/sdm";
import { reviewSonarResult } from "../../review/reviewResult";
import { SonarQubeSupportOptions } from "../../sonarQube";

export const sonarAgentScanner: CodeInspection<ProjectReview, SonarQubeSupportOptions> = async (p, pli) => {
    if (!isLocalProject(p)) {
        throw new Error(`Can only perform review on local project: had ${p.id.url}`);
    }

    if (!p.hasFile("sonar-project.properties")) {
        throw new Error(`Cannot perform review on non-maven projects that are missing a sonar.properties file!`);
    }

    const commandArgs: string[] = [];

    if (pli.parameters.url) {
        commandArgs.push(`-Dsonar.host.url=${pli.parameters.url}`);
    }
    if (pli.parameters.org) {
        commandArgs.push(`-Dsonar.organization=${pli.parameters.org}`);
    }
    if (pli.parameters.token) {
        commandArgs.push(`-Dsonar.login=${pli.parameters.token}`);
    }

    // Append sonar-scanner options, if supplied
    if (pli.parameters.sonarScannerArgs) {
        commandArgs.push(...pli.parameters.sonarScannerArgs);
    }

    const log = new StringCapturingProgressLog();
    const sonarScannerCommand = pli.parameters.configuration.sdm.sonar.sonarScannerPath || "sonar-scanner";
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

    const comments = await reviewSonarResult(log.log, pli);
    return {
        repoId: p.id,
        comments,
    };
};
