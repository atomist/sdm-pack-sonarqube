import {
    configurationValue,
    logger,
} from "@atomist/automation-client";
import {
    doWithProject,
    ExecuteGoal,
    SdmGoalState,
} from "@atomist/sdm";
import { SonarQubeSupportOptions } from "../../sonarQube";

export function dotNetCoreScanner(): ExecuteGoal {
    return doWithProject(
        async r => {
            logger.info(`SonarScan: Running Sonar .NET Core Agent`);

            /**
             *  Add arguments, note that these are definitely present as they are set to required
             * options in the SDM pack
             */
            const commandArgs = ["sonarscanner", "begin"];
            const sonarOptions = configurationValue<object>("sdm.sonar") as SonarQubeSupportOptions;
            commandArgs.push(`/d:sonar.host.url=${sonarOptions.url}`);
            commandArgs.push(`/o:${sonarOptions.org}`);
            commandArgs.push(`/d:sonar.login=${sonarOptions.token}`);
            commandArgs.push(`/d:sonar.analysis.scmRevision=${r.id.sha}`);
            commandArgs.push(`/d:sonar.analysis.scmBranch=${r.id.branch}`);
            commandArgs.push(`/key:${r.project.name}`);

            // Append sonar-scanner options, if supplied
            if (sonarOptions.dotNetCoreArgs) {
                commandArgs.push(...sonarOptions.dotNetCoreArgs);
            }

            // Set the branch name
            if (r.id.branch !== "master") {
                commandArgs.push(`/d:sonar.branch.name=${r.id.branch}`);
            }

            // Run begin
            const result = await r.spawn(
                "dotnet",
                commandArgs,
            );

            if (result.code !== 0) {
                throw new Error(
                    `Error running dotnet sonarscanner begin, exit code ${result.code}!\n\nSee log for details!`);
            }

            // Run build
            const buildResult = await r.spawn(
                "dotnet",
                "build",
            );

            if (buildResult.code !== 0) {
                throw new Error(`Error running dotnet build, exit code ${result.code}!\n\nSee log for details!`);
            }

            // Run end
            const endResult = await r.spawn(
                "dotnet",
                ["sonarscanner", "end", `/d:sonar.login=${sonarOptions.token}`],
            );

            if (endResult.code !== 0) {
                throw new Error(
                    `Error running dotnet sonarscanner end, exit code ${result.code}!\n\nSee log for details!`);
            }

            // Retrieve the task ID from the scanner output
            const Pattern = /More about the report processing at ([^\s^[]*)/;
            const parsed = Pattern.exec(r.progressLog.log);
            const taskId = parsed[1].split("?")[1].split("=")[1];

            return {
                state: SdmGoalState.in_process,
                description: r.goal.inProcessDescription,
                data: taskId,
            };
        },
        {
            alwaysDeep: configurationValue<boolean>("sdm.sonar.cloneDeep", true),
            readOnly: true,
        },
    );
}
