import { GitProject, HandlerContext, logger } from "@atomist/automation-client";
import { SonarQubeSupportOptions } from "../../..";
import { SdmGoalEvent, Goal, updateGoal, SdmGoalState, slackErrorMessage, slackInfoMessage } from "@atomist/sdm";

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
