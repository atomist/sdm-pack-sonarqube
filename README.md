# @atomist/sdm-pack-sonarqube

[![atomist sdm goals](http://badge.atomist.com/T29E48P34/atomist/sdm-pack-sonarqube/4587b3f5-9c80-4fa9-a978-79e2daf89e56)](https://app.atomist.com/workspace/T29E48P34)
[![npm version](https://img.shields.io/npm/v/@atomist/sdm-pack-sonarqube.svg)](https://www.npmjs.com/package/@atomist/sdm-pack-sonarqube)

Extension Pack for an Atomist SDM to integrate [SonarQube](https://www.sonarqube.org).

## Usage

### Prereq
If you are working on projects that do not use Maven, you must install the Sonar Scanner utility.  See instructions [here](https://docs.sonarqube.org/display/SCAN/Analyzing+with+SonarQube+Scanner)

### Setup
1. First install the dependency in your SDM project

```
$ npm install @atomist/sdm-pack-sonarqube
```

2. Install the support

```ts
import { SonarQubeSupport } from "@atomist/sdm-pack-sonarqube";
// [...]
const codeInspection = new AutoCodeInspection();
sdm.addExtensionPacks(
    sonarQubeSupport({
        ...sdm.configuration.sdm.sonar,
        inspectGoal: codeInspection,
    }),
);
```

> Note: Depending on the language you are using you may need to include additional listeners on your inspection goals.  For example, to run the Sonar scanner against a NodeJS project you must first execute a `npm install`.  To accomplish this you can add the NPM listner from `sdm-pack-node`.  
> ```ts
> const codeInspection = new AutoCodeInspection()
>        .withProjectListener(NodeModulesProjectListener);

3. Add configuration to your client configuration

```
"sonar": {
    "enabled": true,
    "url": "<your sonarqube url>",
    "org": "<your sonarqube org>",
    "token": "<your sonarqube token>"
}
```

4. Optional configurations

> All of the configuration options below should be added to the sonar section of your config

* `useDefaultListener`: Should we use the default Sonar review listner?  By default this listener will display Quality gate results, the link to the analysis in the UI, as well as fail SDM goals if the quality gate did not pass. (Valid values, true/false.  Default behavior is true.)
* `failOnMissingViableConfig`: Should we fail code inspection goal if there is no way to determine how to run a Sonar scan?  This would be the case where it's not a Maven project and is missing a sonar-project.properties file.  If enabled, this will fail the code inspection goal and raise an error message to your chat platform.  (Valid values, true/false.  Default behavior is true.)
* `interval`: How quickly should we poll to see if a Sonar scan has completed?  Default is 10000ms (10 seconds).  Value must be supplied in ms.
* `warnOnSkipped`: Should we publish a notice when some aspects of the quality gate are being ignored/skipped.  This is typically the case when the update size is smaller then the required size.  (Valid Values true/false, default behavior is true) 
* `sonarScannerPath`: Path to the sonar-scanner utility within your SDM.  This is not required if the command is within your path. 


## Support

General support questions should be discussed in the `#support`
channel on our community Slack team
at [atomist-community.slack.com][slack].

If you find a problem, please create an [issue][].

[issue]: https://github.com/atomist/automation-client-ts/issues

## Development

You will need to install [node][] to build and test this project.

To run tests, define a GITHUB_TOKEN to any valid token that has repo access. The tests
will create and delete repositories.

Define GITHUB_VISIBILITY=public if you want these to be public; default is private.
You'll get a 422 response from repo creation if you don't pay for private repos.

### Build and Test

Command | Reason
------- | ------
`npm install` | install all the required packages
`npm run build` | lint, compile, and test
`npm run lint` | run tslint against the TypeScript
`npm run compile` | compile all TypeScript into JavaScript
`npm test` | run tests and ensure everything is working
`npm run clean` | remove stray compiled JavaScript files and build directory

### Release

To create a new release of the project, update the version in
package.json and then push a tag for the version.  The version must be
of the form `M.N.P` where `M`, `N`, and `P` are integers that form the
next appropriate [semantic version][semver] for release.  The version
in the package.json must be the same as the tag.  For example:

[semver]: http://semver.org

```
$ npm version 1.2.3
$ git tag -a -m 'The ABC release' 1.2.3
$ git push origin 1.2.3
```

The Travis CI build (see badge at the top of this page) will publish
the NPM module and automatically create a GitHub release using the tag
name for the release and the comment provided on the annotated tag as
the contents of the release notes.

---

Created by [Atomist][atomist].
Need Help?  [Join our Slack team][slack].

[atomist]: https://atomist.com/ (Atomist - Development Automation)
[slack]: https://join.atomist.com/ (Atomist Community Slack)
