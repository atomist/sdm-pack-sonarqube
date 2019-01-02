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
    HttpMethod,
    logger,
    ReviewComment,
    Severity,
} from "@atomist/automation-client";
import { Deferred } from "@atomist/automation-client/lib/internal/util/Deferred";
import {
    PushAwareParametersInvocation,
    slackInfoMessage,
} from "@atomist/sdm";
import { SonarQubeSupportOptions } from "../sonarQube";

export const reviewSonarResult = async (
    task: string, pli: PushAwareParametersInvocation<SonarQubeSupportOptions>,
    ): Promise<ReviewComment[]> => {
    // Retrieve the URL to get task (analysis process) status
    const Pattern = /More about the report processing at ([^\s^[]*)/;
    const parsed = Pattern.exec(task);
    const statusUrl = parsed[1];
    const httpClient = pli.parameters.configuration.http.client.factory.create();

    // Retrieve the analysis URL
    const analysisPattern = /ANALYSIS SUCCESSFUL, you can browse ([^\s^[]*)/;
    const aParsed = analysisPattern.exec(task);
    const analysisUrl = aParsed[1];

    // Retrieve result
    const taskResult = new Deferred<string>();
    const pollInternal = pli.parameters.configuration.sdm.sonar.interval || 10000;
    const timer = setInterval(async () => {
        logger.debug(`Polling Sonar for analysis status`);
        await httpClient.exchange<SonarTaskResult>(`${statusUrl}`, {
            method: HttpMethod.Get,
            retry: {
                retries: 3,
            },
            headers: {
                Accept: "application/json",
                Authorization: `Bearer ${configurationValue<string>("sdm.sonar.token")}`,
            },
        }).then(taskStatus => {
            logger.debug(`Sonar Task Status: ${taskStatus.body.task.status}`);

            // We are only rejecting if the actual scan on the SonarQube server failed - which would be
            // an abnormal condition.  This is NOT failing from a error state/etc
            if (taskStatus.body.task.status === "SUCCESS") {
                taskResult.resolve(taskStatus.body.task.analysisId);
            } else if (taskStatus.body.task.status !== "IN_PROGRESS") {
                taskResult.reject(taskStatus.body.task.status);
            }
        }).catch( e => {
            logger.error(`Failed to gather status, error recieved: [${e}]`);
            clearInterval(timer);
            taskResult.reject(e);
        });
    }, pollInternal);

    const analysisId = await taskResult.promise;
    clearInterval(timer);

    // Retrieve analysis details (really the quality gate result)
    const resultUrl =
        `${configurationValue<string>("sdm.sonar.url")}/api/qualitygates/project_status?analysisId=${analysisId}`;

    const resultDetails = await httpClient.exchange<SonarProjectAnalysisResult>(`${resultUrl}`, {
        method: HttpMethod.Get,
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${configurationValue<string>("sdm.sonar.token")}`,
        },
    }).catch( e => {
        const msg = `Failed to retrieve Sonar Analysis details, error [${e}]`;
        logger.error(msg);
        throw new Error(msg);
    });

    logger.debug(
        resultDetails.body.projectStatus.status +
        " - anything skipped? " +
        resultDetails.body.projectStatus.ignoredConditions,
    );

    if (configurationValue<boolean>("sdm.sonar.warnOnSkipped", true)) {
        if (resultDetails.body.projectStatus.ignoredConditions) {
            await pli.addressChannels(slackInfoMessage(
                "SonarQube Scan Warning",
                `Warning, some conditions are being ignored in the assigned quality gate!  ` +
                `View anaylsis status <${analysisUrl}|here>`),
            );
        }
    }

    // For each metric, log some results
    resultDetails.body.projectStatus.conditions.forEach(c => {
        logger.debug(`${c.metricKey} status ${c.status}`);
    });

    // Create an array to store our comments
    const comments: ReviewComment[] = [];

    // Create a comment for global result
    const details = {
        status: resultDetails.body.projectStatus.status,
        url: analysisUrl,
    };

    comments.push({
        severity: resultDetails.body.projectStatus.status === "OK" ? "info" : "error",
        category: "globalSonarAnaylsisStatus",
        detail: JSON.stringify(details),
    });

    // Create comments for individual metrics
    resultDetails.body.projectStatus.conditions.forEach(c => {
        let cStatus = "";
        if (c.status === "OK") {
            cStatus = "info";
        } else if (c.status === "ERROR") {
            cStatus = "error";
        } else if (c.status === "WARN") {
            cStatus = "warn";
        }
        comments.push({
            severity: cStatus as Severity,
            category: c.metricKey,
            detail: JSON.stringify({
                status: c.status,
                actualValue: c.actualValue,
                errorThreshold: c.errorThreshold,
                comparator: c.comparator,
                periodIndex: c.periodIndex,
            }),
        });
    });

    logger.debug(`REVIEW RESULTS: ${JSON.stringify(comments)}`);
    return comments;
};
