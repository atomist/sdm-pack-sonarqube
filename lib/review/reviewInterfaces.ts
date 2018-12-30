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
