/** Copyright (c) 2017 Uber Technologies, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const fetch = require('node-fetch');

module.exports = robot => {
  robot.on('release.published', released);

  async function released(context) {
    const {github} = context;
    const {release} = context.payload;

    github.repos.createForAuthenticatedUserDeployment(
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

    let output;
    try {
      const payload = {
        commit: 'HEAD',
        branch: 'master',
        message: `Deploy ${name}`,
        author: {
          name: login,
        },
        env: {
          PUBLISH_REPO: ssh_url,
          TARGET_COMMITISH: `refs/tags/${release.tag_name}`,
        },
      };

      if (process.env.PUBLISH_ARGS) {
        payload.env.PUBLISH_ARGS = process.env.PUBLISH_ARGS;
      }

      const res = await fetch(
        'https://api.buildkite.com/v2/organizations/uberopensource/pipelines/npm-deploy/builds',
        {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: {
            Authorization: `Bearer ${process.env.BUILDKITE_TOKEN}`,
          },
        },
      );
      output = await res.json();
      // eslint-disable-next-line no-console
      console.log('Buildkite triggered', output);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(err);
    }
  }
};
