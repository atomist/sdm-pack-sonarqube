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
    GitProject,
    HandlerContext,
    logger,
} from "@atomist/automation-client";
import {
    Goal,
    SdmGoalEvent,
    SdmGoalState,
    slackErrorMessage,
    slackInfoMessage,
    updateGoal,
} from "@atomist/sdm";
import { SonarQubeSupportOptions } from "../../..";

export type sonarScannerExecuter = (p: GitProject, sonarOptions: SonarQubeSupportOptions)
    => Promise<string>;

export async function handleScannerError(
    ctx: HandlerContext,
    sdmGoal: SdmGoalEvent,
    goal: Goal,
    errorString: string,
    error: string,
    channelDetail: string[],
    subject?: string,
    ): Promise<string> {

    // Log it
    logger.error(errorString);

    // Set the gaol to failed
    await updateGoal(ctx, sdmGoal, {
        state: SdmGoalState.failure,
        description: goal.failureDescription,
        error: Error(errorString),
    });

    // Notify the channel of the failure
    await ctx.messageClient.addressChannels(slackErrorMessage(
        subject ? subject : "Sonar Scan Failure!",
        error,
        ctx,
    ), channelDetail);

    throw new Error(errorString);
}

export async function handleScannerWarn(
    ctx: HandlerContext,
    sdmGoal: SdmGoalEvent,
    goal: Goal,
    errorString: string,
    error: string,
    channelDetail: string[],
    subject?: string,
    ): Promise<string> {

    // Log it
    logger.error(errorString);

    // Set the gaol to failed
    await updateGoal(ctx, sdmGoal, {
        state: SdmGoalState.success,
        description: goal.successDescription,
    });

    // Notify the channel of the failure
    await ctx.messageClient.addressChannels(slackInfoMessage(
        subject ? subject : "Sonar Scan Warning!",
        error,
    ), channelDetail);

    return errorString;
}
