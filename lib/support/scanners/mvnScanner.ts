import { isLocalProject, logger, ProjectReview } from "@atomist/automation-client";
import { CodeInspection, spawnLog, StringCapturingProgressLog } from "@atomist/sdm";
import { SonarQubeSupportOptions } from "../../sonarQube";

export const mvnScanner: CodeInspection<ProjectReview, SonarQubeSupportOptions> = async (project, pli) => {
    if (!isLocalProject(project)) {
        throw new Error(`Can only perform review on local project: had ${project.id.url}`);
    }
    const commandArgs = ["clean", "org.jacoco:jacoco-maven-plugin:prepare-agent", "package", "sonar:sonar"];

    if (pli.parameters.url) {
        commandArgs.push(`-Dsonar.host.url=${pli.parameters.url}`);
    }
    if (pli.parameters.org) {
        commandArgs.push(`-Dsonar.organization=${pli.parameters.org}`);
    }
    if (pli.parameters.token) {
        commandArgs.push(`-Dsonar.login=${pli.parameters.token}`);
    }

    const log = new StringCapturingProgressLog();
    await spawnLog(
        "mvn",
        commandArgs,
        {
            log,
            cwd: project.baseDir,
        },
    );
    await pli.addressChannels(`Code review success`);
    logger.info(log.log);

    const Pattern = /ANALYSIS SUCCESSFUL, you can browse ([^\s^[]*)/;
    const parsed = Pattern.exec(log.log);
    await pli.addressChannels(`Analysis at ${parsed[ 0 ]}`);

    return {
        repoId: project.id,
        comments: [],
    };
};
