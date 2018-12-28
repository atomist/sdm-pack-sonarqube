import { isLocalProject, logger, ProjectReview } from "@atomist/automation-client";
import { CodeInspection, spawnLog, StringCapturingProgressLog } from "@atomist/sdm";
import { SonarQubeSupportOptions } from "../../sonarQube";

export const sonarAgentScanner: CodeInspection<ProjectReview, SonarQubeSupportOptions> = async (p, pli) => {
    logger.debug("Starting");
    if (!isLocalProject(p)) {
        throw new Error(`Can only perform review on local project: had ${p.id.url}`);
    }

    if (!p.hasFile("sonar-project.properties")) {
        throw new Error(`Cannot perform review on non-maven projects that are missing a sonar.properties file!`);
    }

    const commandArgs: string[] = [];

    if (pli.parameters.url) {
        commandArgs.push(`-Dsonar.host.url=${pli.parameters.url}`);
    }
    if (pli.parameters.org) {
        commandArgs.push(`-Dsonar.organization=${pli.parameters.org}`);
    }
    if (pli.parameters.token) {
        commandArgs.push(`-Dsonar.login=${pli.parameters.token}`);
    }
    logger.debug("Through command args");

    const log = new StringCapturingProgressLog();
    await spawnLog(
        "sonar-scanner",
        commandArgs,
        {
            log,
            cwd: p.baseDir,
        },
    );
    await pli.addressChannels(`Code review success`);
    logger.info(log.log);

    const Pattern = /ANALYSIS SUCCESSFUL, you can browse ([^\s^[]*)/;
    const parsed = Pattern.exec(log.log);
    await pli.addressChannels(`Analysis at ${parsed[ 0 ]}`);

    return {
        repoId: p.id,
        comments: [],
    };

};
