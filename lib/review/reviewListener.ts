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
        if (!configurationValue<boolean>("sdm.sonar.useDefaultListener", true)) {
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
                            `\tActual value was ${commentDetail.actualValue} vs error threshold of ` +
                            `${commentDetail.errorThreshold}`;
                    }
                    metricDetail.push(metricComment);
                }
            });

            if (globalStatus[0].severity === "error") {
                await c.addressChannels(slackErrorMessage(
                    "SonarQube/SonarCloud Quality Gate Failed!",
                    `Find more details <${details.url}|here>\n\n` +
                    "*Metric Detail*\n" +
                    metricDetail.join("\n"),
                    c.context,
                ));
                return PushImpactResponse.failGoals;
            } else {
                await c.addressChannels(slackInfoMessage(
                    "SonarQube/SonarCloud Quality Gate Passed!",
                    `Find more details <${details.url}|here>\n\n` +
                    "*Metric Detail*\n" +
                    metricDetail.join("\n"),
                ));
                return PushImpactResponse.proceed;
            }
        } else {
            // We could have got here for 2 reasons
            //  Reason #1; our sonar configuration didn't actually find any comments
            //  Reason #2; we're missing configuration required to actually run a scan
            //
            //  We'll give context sensitive errors for both

            // Reason #2
            if (
                !(await c.project.hasFile("sonar-project.properties")) &&
                !(await c.project.hasFile("pom.xml"))
            ) {
                // Pass or fail goals based on the configuration provided
                // If we do not have a viable config (pom for mavne, or for all else
                // a sonar-project.properties file), return proceed or fail
                // default is to fail
                const docsUrl =
                    // tslint:disable-next-line:max-line-length
                    `<https://docs.sonarqube.org/display/SCAN/Analyzing+with+SonarQube+Scanner|sonar-project.properties>`;

                const subject = "SonarQube/SonarCloud Code Inspection Configuration Error!";
                const message =
                    `No project configuration could be found.  Pleaes ensure this project is either using maven` +
                    ` (and therefore has a POM file), ` +
                    `or please ensure a ` +
                    `${docsUrl} ` +
                    `file is present on the root of the project.`;

                if (configurationValue<boolean>("sdm.sonar.failOnMissingViableConfig", true)) {
                    await c.addressChannels(slackErrorMessage(
                        subject,
                        message +
                        `\n\nFailing goals.`,
                        c.context,
                    ));
                    return PushImpactResponse.failGoals;
                } else {
                    if (configurationValue<boolean>("sdm.sonar.warnOnMissingViableConfig", true)) {
                        await c.addressChannels(slackInfoMessage(
                            subject,
                            message +
                            `\n\nContinuing goals.`,
                        ));
                    }
                    return PushImpactResponse.proceed;
                }
            }

            // Reason #1
            if (c.review.comments.length === 0) {
                await c.addressChannels(slackErrorMessage(
                    "SonarQube/SonarCloud Code Inspection Error!",
                    `No analysis details could be found.  Review failed.`,
                    c.context,
                ));
                return PushImpactResponse.failGoals;
            }

        }
    },
};
