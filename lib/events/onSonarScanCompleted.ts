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
  Goal,
  findSdmGoalOnCommit,
  updateGoal,
  SdmGoalState,
  EventHandlerRegistration,
  PushImpactResponse,
} from "@atomist/sdm";
import { OnEvent, Success, GitHubRepoRef, GraphQL, configurationValue, logger } from "@atomist/automation-client";
import { GetGoalBySonarTaskData, SonarScanCompleted } from "../typings/types";
import { reviewSonarAnalysisResult } from "../review/reviewSonarAnalysis";
import { determineSonarAnalysisResult } from "../review/sonarAnalysisResult";
import { SonarQubeSupportOptions } from "../..";

export function onSonarScanCompletedHandler(goal: Goal):
    OnEvent<SonarScanCompleted.Subscription> {
        return async (e, ctx) => {

            const sonarQubeOptions = configurationValue<object>("sdm.sonar") as SonarQubeSupportOptions;
            const repoRef = GitHubRepoRef.from({
                owner: e.data.SonarScan[0].push.commits[0].repo.owner,
                repo:  e.data.SonarScan[0].push.commits[0].repo.name,
                sha: e.data.SonarScan[0].push.commits[0].sha,
                branch: e.data.SonarScan[0].push.branch,
            });

            const sdmGoalData =
                await ctx.graphClient.query<GetGoalBySonarTaskData.Query, GetGoalBySonarTaskData.Variables>({
                    name: "GetGoalBySonarTaskData",
                    variables: { taskId: e.data.SonarScan[0].taskId },
                });

            const sdmGoal = await findSdmGoalOnCommit(
                ctx,
                repoRef,
                sdmGoalData.SdmGoal[0].repo.providerId,
                goal,
            );

            // Store channels
            const channels: string[] = e.data.SonarScan[0].push.commits[0].repo.channels.map(c => c.name);

            // Review Results
            const comments = await reviewSonarAnalysisResult(e.data.SonarScan[0]);

            if (comments) {
                const sonarStatus  = await determineSonarAnalysisResult(comments, ctx, channels);

                if (sonarStatus === PushImpactResponse.proceed) {
                    // If Success - Set completed
                    await updateGoal(ctx, sdmGoal, {
                        state: SdmGoalState.success,
                        description: goal.successDescription,
                    });
                } else {
                    // Error.  Set goal state according to configuration
                    await updateGoal(ctx, sdmGoal, {
                        state: sonarQubeOptions.warnOnFailedQualityGate ? SdmGoalState.success : SdmGoalState.failure,
                        description:
                          sonarQubeOptions.warnOnFailedQualityGate ? goal.successDescription : goal.failureDescription,
                    });
                }
            } else {
                /**
                 * If there were not comments something strange/unknown has happened
                 */
                const error = `SonarScan, no comments found.  Unknown error has occurred!`;
                logger.error(error);
                await updateGoal(ctx, sdmGoal, {
                    state: sonarQubeOptions.warnOnFailedQualityGate ? SdmGoalState.success : SdmGoalState.failure,
                    description:
                        sonarQubeOptions.warnOnFailedQualityGate ? goal.successDescription : goal.failureDescription,
                    error: Error(error),
                });

                throw new Error(error);
            }

            return Success;
        };
}

export function onSonarScanCompleted(goal: Goal): EventHandlerRegistration<SonarScanCompleted.Subscription> {
    return {
        name: "OnSonarScanCompleted",
        subscription: GraphQL.subscription("SonarScanCompleted"),
        listener: onSonarScanCompletedHandler(goal),
    };
}
