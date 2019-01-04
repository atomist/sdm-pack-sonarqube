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
    HandlerContext,
    logger,
    ReviewComment,
} from "@atomist/automation-client";
import {
    PushImpactResponse,
    slackErrorMessage,
    slackInfoMessage,
} from "@atomist/sdm";
import * as types from "../typings/types";

export const determineSonarAnalysisResult = async (
    c: ReviewComment[],
    ctx: HandlerContext,
    channels: string[],
    ): Promise<PushImpactResponse> => {
        if (!configurationValue<boolean>("sdm.sonar.useDefaultListener", true)) {
            return PushImpactResponse.proceed;
        }

        const globalStatus = c.filter(tc => tc.category === "globalSonarAnaylsisStatus");
        const details = JSON.parse(globalStatus[0].detail);
        logger.debug(`Sonar Report Global Status: ${JSON.stringify(globalStatus)}`);

        const metricDetail = [];
        c.forEach(rc => {
            const commentDetail = JSON.parse(rc.detail) as types.SonarScanCompleted.Conditions;
            if (rc.category !== "globalSonarAnaylsisStatus") {
                let metricComment = "";
                if (commentDetail.status === "OK") {
                    metricComment = `Result for metric *${rc.category}* was ${commentDetail.status}`;
                } else {
                    metricComment = `Result for metric *${rc.category}* was ${commentDetail.status}\n` +
                        `\tActual value was ${commentDetail.value} vs error threshold of ` +
                        `${commentDetail.errorThreshold}`;
                }
                metricDetail.push(metricComment);
            }
        });

        if (globalStatus[0].severity === "error") {
            await ctx.messageClient.addressChannels(slackErrorMessage(
                "SonarQube/SonarCloud Quality Gate Failed!",
                `Find more details <${details.url}|here>\n\n` +
                "*Metric Detail*\n" +
                metricDetail.join("\n"),
                ctx,
            ), channels);
            return PushImpactResponse.failGoals;
        } else {
            await ctx.messageClient.addressChannels(slackInfoMessage(
                "SonarQube/SonarCloud Quality Gate Passed!",
                `Find more details <${details.url}|here>\n\n` +
                "*Metric Detail*\n" +
                metricDetail.join("\n"),
            ), channels);
            return PushImpactResponse.proceed;
        }
    };
