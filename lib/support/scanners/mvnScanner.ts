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

import { isLocalProject, logger, ProjectReview } from "@atomist/automation-client";
import { CodeInspection, spawnLog, StringCapturingProgressLog } from "@atomist/sdm";
import { SonarQubeSupportOptions } from "../../sonarQube";

export const mvnScanner: CodeInspection<ProjectReview, SonarQubeSupportOptions> = async (project, pli) => {
    if (!isLocalProject(project)) {
        throw new Error(`Can only perform review on local project: had ${project.id.url}`);
    }
    const commandArgs = ["clean", "org.jacoco:jacoco-maven-plugin:prepare-agent", "package", "sonar:sonar"];

    if (pli.parameters.url) {
        commandArgs.push(`-Dsonar.host.url=${pli.parameters.url}`);
    }
    if (pli.parameters.org) {
        commandArgs.push(`-Dsonar.organization=${pli.parameters.org}`);
    }
    if (pli.parameters.token) {
        commandArgs.push(`-Dsonar.login=${pli.parameters.token}`);
    }

    const log = new StringCapturingProgressLog();
    await spawnLog(
        "mvn",
        commandArgs,
        {
            log,
            cwd: project.baseDir,
        },
    );
    await pli.addressChannels(`Code review success`);
    logger.info(log.log);

    const Pattern = /ANALYSIS SUCCESSFUL, you can browse ([^\s^[]*)/;
    const parsed = Pattern.exec(log.log);
    await pli.addressChannels(`Analysis at ${parsed[ 0 ]}`);

    return {
        repoId: project.id,
        comments: [],
    };
};
