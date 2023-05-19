# GitHub Action **Auto Git Modules**

In this repository, I am to turn the below linked experimental repository into a
JavaScript GitHub Action by following the guide by GitHub, also linked.

- https://github.com/TomasHubelbauer/github-actions-auto-gitmodules 
- https://docs.github.com/en/actions/creating-actions/creating-a-javascript-action

Turns out JavaScript-based GitHub Actions are bound to a Node 16 runtime with no
option for Node 18 or Node 20. :/
See these links:
- https://github.com/actions/runner/issues/2255 
- https://github.com/orgs/community/discussions/53217

That means for now the only practical solution is to make this a Docker-based
custom action and benefit from the fact that the GitHub Actions OS images ship
with Node 18 already unlike the runtime for JavaScript-based GitHub Actions.

See https://docs.github.com/en/actions/creating-actions/creating-a-docker-container-action
