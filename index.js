/** Copyright (c) 2017 Uber Technologies, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const exec = require('child_process').exec;

module.exports = robot => {
  robot.on('release.published', released);

  async function released(context) {
    const {github} = context;
    const {release} = context.payload;

    github.repos.createDeployment(
      context.repo({
        ref: release.tag_name,
        auto_merge: false,
        // Bypass required context checking when creating a deployment
        required_contexts: [],
      }),
    );

    // Kick off a deployment through buildkite
    const {login} = release.author;
    const {name, ssh_url} = context.payload.repository;
    const {target_commitish} = context.payload.release;
    const curlCommand = `curl \
      -H "Authorization: Bearer ${process.env.BUILDKITE_TOKEN}" \
      -X POST "https://api.buildkite.com/v2/organizations/uberopensource/pipelines/npm-deploy/builds" \
        -d '{
          "commit": "HEAD",
          "branch": "master",
          "message": "Deploy ${name}",
          "author": {
            "name": "${login}"
          },
          "env": {
            "PUBLISH_REPO": "${ssh_url}",
            "TARGET_COMMITISH": "${release.tag_name}"
          }
        }'`;

    exec(curlCommand, error => {
      if (error !== null) {
        // eslint-disable-next-line no-console
        console.warn('exec error: ' + error);
      }
    });
  }
};
