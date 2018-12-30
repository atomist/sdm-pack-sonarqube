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
    logger,
} from "@atomist/automation-client";
import {
    PushImpactResponse,
    ReviewListenerRegistration,
    slackErrorMessage,
    slackInfoMessage,
} from "@atomist/sdm";

export const sonarReviewRegistration: ReviewListenerRegistration = {
    name: "SonarDefaultRegistration",
    listener: async c => {
        if (JSON.parse(configurationValue<string>("sdm.sonar.useDefaultListener", null)) === false) {
            return PushImpactResponse.proceed;
        }

        if (c.review.comments.length > 0) {
            const globalStatus = c.review.comments.filter(tc => tc.category === "globalSonarAnaylsisStatus");
            const details = JSON.parse(globalStatus[0].detail);

            const metricDetail = [];
            c.review.comments.forEach(rc => {
                const commentDetail = JSON.parse(rc.detail) as SonarProjectCondition;
                if (rc.category !== "globalSonarAnaylsisStatus") {
                    let metricComment = "";
                    if (commentDetail.status === "OK") {
                        metricComment = `Result for metric *${rc.category}* was ${commentDetail.status}`;
                    } else {
                        metricComment = `Result for metric *${rc.category}* was ${commentDetail.status}\n` +
                            `\tActual value was ${commentDetail.actualValue} vs error threshold of ${commentDetail.errorThreshold}`;
                    }
                    metricDetail.push(metricComment);
                }
            });

            if (globalStatus[0].severity === "error") {
                c.addressChannels(slackErrorMessage(
                    "SonarQube/SonarCloud Quality Check Failed!",
                    `Find more details <${details.url}|here>\n\n` +
                    "*Metric Detail*\n" +
                    metricDetail.join("\n"),
                    c.context,
                ));
                return PushImpactResponse.failGoals;
            } else {
                c.addressChannels(slackInfoMessage(
                    "SonarQube/SonarCloud Quality Check Passed!",
                    `Find more details <${details.url}|here>\n\n` +
                    "*Metric Detail*\n" +
                    metricDetail.join("\n"),
                ));
                return PushImpactResponse.proceed;
            }
        } else {
            // Pass or fail goals based on the configuration provided
            // If we do not have a viable config (pom for mavne, or for all else
            // a sonar-project.properties file), return proceed or fail
            // default is to fail
            if (JSON.parse(configurationValue<string>("sdm.sonar.failOnMissingViableConfig", null)) !== false) {
                c.addressChannels(slackErrorMessage(
                    "SonarQube/SonarCloud Code Inspection Configuration Error!",
                    `No project configuration could be found.  Pleaes ensure this project is either using maven` +
                    ` (and therefore has a POM file), ` +
                    `or please ensure a ` +
                    `<https://docs.sonarqube.org/display/SCAN/Analyzing+with+SonarQube+Scanner|sonar-project.properties> ` +
                    `file is present on the root of the project.` +
                    `\n\nFailing goals.`,
                    c.context,
                ));
                return PushImpactResponse.failGoals;
            } else {
                return PushImpactResponse.proceed;
            }
        }
    },
};
