# GitHub Action **Auto Git Modules**

In this repository, I am to turn the below linked experimental repository into a
composite GitHub Action.

https://github.com/TomasHubelbauer/github-actions-auto-gitmodules 

## Notes

I started off wanting to make this a JavaScript-based GitHub Action, but the
GitHub Actions runtime forces the use of Node 12 or Node 16 for JavaScript-based
Actions making this a no-go for me, because my code is written for Node 18 and I
do not want to degrade it.

See:
- https://docs.github.com/en/actions/creating-actions/creating-a-javascript-action
- https://github.com/actions/runner/issues/2255 
- https://github.com/orgs/community/discussions/53217

In the next step I decided to make this a Docker-based GitHub Action, but after
doing that, I realized it is probably the best to just make this a composite
Action and not worry about the Dockerfile.

See:
- https://docs.github.com/en/actions/creating-actions/creating-a-docker-container-action
- https://docs.github.com/en/actions/creating-actions/creating-a-composite-action
