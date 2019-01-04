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
    GraphQL,
} from "@atomist/automation-client";
import {
    ExtensionPack,
    Goal,
    metadata,
} from "@atomist/sdm";
import { onRequestedSonarScan } from "./events/onRequestedSonarScan";
import { onSonarScanCompleted } from "./events/onSonarScanCompleted";

/**
 * Options for SonarQube Scanning
 */
export interface SonarQubeSupportOptions {
    /**
     * The base URL to your SonarQube instance
     */
    url: string;

    /**
     * The Organization within SonarQube your projects live in
     */
    org: string;

    /**
     * The API Token for the user (service account) we'll use when running scans
     */
    token: string;

    /**
     * Extra command arguments to supply to sonar-scanner
     */
    sonarScannerArgs?: string[];

    /**
     * Extra command arguments to supply to Maven/sonar:sonar
     */
    mvnSonarArgs?: string[];

    /**
     * Path to the sonar scanner utility.  By default this pack relies on the utility to be in the SDMs path
     */
    sonarScannerPath?: string;

    /**
     * Should we issue a warning (instead of fail by default) if there is no way to determine how to run a Sonar scan?
     * This would be the case where it's not a Maven project and is missing a sonar-project.properties file.  If
     * enabled, this will issue a warning in the Chat channel connected to this project, but your goals will not be
     * failed. (Valid values, true/false.  Default behavior is false.)
     */
    warnOnMissingViableConfig: boolean;

    /**
     * Should we issue a warning (instead of fail by default) if a quality gate fails?
     * (Valid values, true/false.  Default behavior is false.)
     */
    warnOnFailedQualityGate: boolean;
}

export function sonarQubeSupport(goal: Goal): ExtensionPack {
    return {
        ...metadata(),
        requiredConfigurationValues: [
            "sdm.sonar.url",
            "sdm.sonar.org",
            "sdm.sonar.token",
        ],
        configure: sdm => {
            sdm.addEvent(onRequestedSonarScan(goal));
            sdm.addEvent(onSonarScanCompleted(goal));
            sdm.addIngester(GraphQL.ingester({
                name: "sonarScan",
            }));

            return sdm;
        },
    };
}
