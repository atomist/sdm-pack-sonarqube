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
    Configuration, GraphQL,
} from "@atomist/automation-client";
import {
    onAnyPush,
    SoftwareDeliveryMachine,
    SoftwareDeliveryMachineConfiguration,
} from "@atomist/sdm";
import {
    configureSdm,
    createSoftwareDeliveryMachine,
} from "@atomist/sdm-core";
import {
    NodeModulesProjectListener,
} from "@atomist/sdm-pack-node";
import { SonarScan } from "../lib/goals/sonarScan";
import { onRequestedSonarScan } from "../lib/events/onRequestedSonarScan";
import { onSonarScanCompleted } from "../lib/events/onSonarScanCompleted";
import { sonarQubeSupport } from "../lib/sonarQube";
// import { sonarQubeSupport } from "../lib/sonarQube";

export function machineMaker(config: SoftwareDeliveryMachineConfiguration): SoftwareDeliveryMachine {

    const sdm = createSoftwareDeliveryMachine(
        {
            name: `${configuration.name}-test`,
            configuration: config,
        },
    );

    const SonarScanGoal = new SonarScan();

    sdm.withPushRules(
        onAnyPush()
            .setGoals(SonarScanGoal),
    );

    sdm.addEvent(onRequestedSonarScan(SonarScanGoal));
    sdm.addEvent(onSonarScanCompleted(SonarScanGoal));

    sdm.addIngester(GraphQL.ingester({
        name: "sonarScan",
        path: "../lib/graphql/ingester/sonarScan.graphql",
    }));

    sdm.addExtensionPacks(
        sonarQubeSupport(),
    );
    return sdm;
}

export const configuration: Configuration = {
    postProcessors: [
        configureSdm(machineMaker),
    ],
};
