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
    AutoCodeInspection,
    ExtensionPack,
    metadata,
    ReviewListenerRegistration,
} from "@atomist/sdm";
import {
    mvnSonarQubeReviewer,
    sonarQubeReviewer,
} from "./support/sonarQubeReviewer";

/**
 * Options determining what Spring functionality is activated.
 */
export interface SonarQubeSupportOptions {

    enabled: boolean;
    url: string;
    org: string;
    token: string;

    /**
     * Inspect goal to add inspections to.
     * Review functionality won't work otherwise.
     */
    inspectGoal?: AutoCodeInspection;

    /**
     * Review listeners that let you publish review results.
     */
    reviewListeners?: ReviewListenerRegistration | ReviewListenerRegistration[];
}

export function sonarQubeSupport(options: SonarQubeSupportOptions): ExtensionPack {
    return {
        ...metadata(),
        configure: () => {

            if (!!options && options.enabled && !!options.inspectGoal) {
                options.inspectGoal.with(mvnSonarQubeReviewer(options));
                options.inspectGoal.with(sonarQubeReviewer(options));

                if (options.reviewListeners) {
                    const listeners = Array.isArray(options.reviewListeners) ?
                        options.reviewListeners : [options.reviewListeners];
                    listeners.forEach(l => options.inspectGoal.withListener(l));
                }
            }
        },
    };
}
