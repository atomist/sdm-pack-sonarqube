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

interface SonarProjectCondition {
    status: "OK" | "WARN" | "ERROR";
    metricKey: string;
    comparator: string;
    periodIndex: number;
    errorThreshold: string;
    actualValue: string;
}

interface SonarProjectPeriod {
    index: number;
    mode: string;
    date: string;
    parameter: string;
}

interface SonarProjectStatus {
    status: string;
    conditions: SonarProjectCondition[];
    periods: SonarProjectPeriod[];
    ignoredConditions: boolean;
}

interface SonarProjectAnalysisResult {
    projectStatus: SonarProjectStatus;
}

interface SonarTaskResult {
    task: {
        analysisId: string;
        status: string;
    };
}
