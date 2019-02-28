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
    ReviewComment,
    Severity,
} from "@atomist/automation-client";
import {
    SonarScanCompleted,
} from "../typings/types";

export const reviewSonarAnalysisResult = async (
    results: SonarScanCompleted.SonarScan,
    ): Promise<ReviewComment[]> => {

    // For each metric, log some results
    results.qualityGate.conditions.forEach(c => {
        logger.debug(`${c.metric} status ${c.status}`);
    });

    // Create an array to store our comments
    const comments: ReviewComment[] = [];

    // Create a comment for global result
    const details = {
        status: results.status,
        url: configurationValue<string>("sdm.sonar.url") + `/dashboard?id=${results.project.key}`,
    };

    comments.push({
        severity: results.qualityGate.conditions.some(c => c.status === "ERROR") ? "error" : "info",
        category: "globalSonarAnaylsisStatus",
        detail: JSON.stringify(details),
    });

    // Create comments for individual metrics
    results.qualityGate.conditions.forEach(c => {
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
            category: c.metric,
            detail: JSON.stringify({
                status: c.status,
                value: c.value,
                errorThreshold: c.errorThreshold,
                operator: c.operator,
            }),
        });
    });

    return comments;
};
