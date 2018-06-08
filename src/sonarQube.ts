import { ExtensionPack } from "@atomist/sdm";
import {
    SonarCubeOptions,
    sonarQubeReviewer,
} from "./support/sonarQubeReviewer";

// tslint:disable-next-line:no-var-requires
const pj = require("./package.json");

export const SonarQubeSupport: ExtensionPack = {
    name: pj.name,
    vendor: pj.author.name,
    version: pj.version,
    configure: sdm => {
        const options = sdm.configuration.sdm.sonar as SonarCubeOptions;
        if (!!options && options.enabled === true) {
            sdm.addReviewerRegistrations(sonarQubeReviewer(options));
        }
    },
};
