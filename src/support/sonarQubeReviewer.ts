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
import { isLocalProject } from "@atomist/automation-client/project/local/LocalProject";
import { ReviewerRegistration, ToDefaultBranch } from "@atomist/sdm";
import { StringCapturingProgressLog } from "@atomist/sdm/api-helper/log/StringCapturingProgressLog";
import {
    asSpawnCommand,
    spawnAndWatch,
} from "@atomist/sdm/api-helper/misc/spawned";

export interface SonarCubeOptions {
    enabled: boolean;
    url: string;
    org: string;
    token: string;
}

export function sonarQubeReviewer(options: SonarCubeOptions): ReviewerRegistration {
    return {
        name: "SonarQube review",
        pushTest: ToDefaultBranch,
        inspection: async (project, pli) => {
            if (!isLocalProject(project)) {
                throw new Error(`Can only perform review on local project: had ${project.id.url}`);
            }
            const command = ["mvn clean org.jacoco:jacoco-maven-plugin:prepare-agent package sonar:sonar"];

            if (options.url) {
                command.push(`-Dsonar.host.url=${options.url}`);
            }
            if (options.org) {
                command.push(`-Dsonar.organization=${options.org}`);
            }
            if (options.token) {
                command.push(`-Dsonar.login=${options.token}`);
            }

            const log = new StringCapturingProgressLog();
            await spawnAndWatch(
                asSpawnCommand(command.join(" ")),
                {
                    cwd: project.baseDir,
                },
                log,
            );
            await pli.addressChannels(`Code review success`);
            logger.info(log.log);
            const parsed = Pattern.exec(log.log);
            await pli.addressChannels(`Analysis at ${parsed[ 0 ]}`);

            return {
                repoId: project.id,
                comments: [],
            };
        },
    };
}

// ANALYSIS SUCCESSFUL, you can browse https://sonarcloud.io/dashboard/index/com.atomist.springteam:spring-rest-seed
const Pattern = /ANALYSIS SUCCESSFUL, you can browse ([^\s^[]*)/;
