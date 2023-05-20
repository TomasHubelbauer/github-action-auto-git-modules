# GitHub Action **Auto Git Modules**

This GitHub Action looks at the `.gitmodules` file and if there are new entries
added or removed that don't correspond to the required changes elsewhere in Git
to properly add or remove the submodule, it syncs the rest of the Git repository
to make the submodule properly added or removed.

**Note:** It is crucial that the repository you use this Action in has the
Settings > Actions > General > Workflow permissions > Read and write permissions
permission enabled, otherwise the Action will not be able to push submodule
changes back to the repository automatically!

This makes it possible to add and remove submodules in a repository just by
editing `.gitmodules` via the GitHub web editor, no need to clone the code.

It is recommended to run this Action on these triggers:

- `push` to sync submodules after each commit in case it changed `.gitmodules`

- `schedule` to sync changes in the submodule repositories regularly

  This is so that the submodule doesn't remain stuck on the version it was at
  when it was first added.

- `workflow_dispatch` to make it possible to sync the submodules by hand

  This is useful when you know the submodule content has changed and you don't
  want to wait for the schedule to pick the change up.

This Action is based on a repository where I first spiked this idea and which
now serves as a demonstration for it:

https://github.com/TomasHubelbauer/github-actions-auto-gitmodules 

## Notes

### JavaScript / Docker / composite GitHub Action choice

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

## `@actions/core`'s `core.info` as a replacement for `console.log`

This is a big defeat but I could not find a way to make `console.log`s appear in
the logs of the workflow that uses this custom action.
I think GitHub hides this output by default and I wasn't able to force it to go
through by neither of `process.stdout.write`, setting `ACTIONS_STEP_DEBUG` in
this Action's `action.yml` nor the consuming workflow's `env` for this step or
any other means.

See https://github.com/actions/javascript-action/issues/27

## How adding a submodule works

```sh
git submodule add https://github.com/TomasHubelbauer/git-demo-submodule
```

This will:

- Clone the linked repository into a directory named after it
- Create a directory in `.git/modules` for the submodule
- Update the `.git/config` file to add a new `submodule` section
- Create or update a file name `.gitmodules`

## How removing a submodule works

```sh
# Remove the directory of the submodule repository
# Use `--cached` in case the submodule directory was not committed yet
# Use `--force` if the submodule has changes that have not been committed yet
git rm git-demo-submodule

# Remove the directory of the submodule directory in `.git/modules`
rm -rf .git/modules/git-demo-submodule

# Remove the entry of the submodule in `.git/config`
git config --remove-section submodule.git-demo-submodule
```

Sources:

- https://stackoverflow.com/a/1260982/2715716
- https://stackoverflow.com/a/35778105/2715716

## How checking out with submodules works

Clone with submodules:

```sh
# Add `--remote-submodules` to also update the submodules to latest
git clone https://github.com/TomasHubelbauer/github-actions-auto-gitmodules --recurse-submodules
```

Update submodules:

```sh
# Add `--remote` to update the submodule to latest
git submodule update --recursive
```

## Tests

`node --test --test-name-pattern=…`

## Tasks

### Introduce and include `parseGitSubmoduleStatusCommand.js`

I have introduced this check in the test but it should happen in the main script
when running outside of the script context as well.

### Fix the tests not being able to run in parallel for some reason

The assertions fail if the tests are allowed to run all at one.
I am not sure if the Node test runner is running them in parallel - I do not
think that is the case, but I couldn't get a straight word out of the Node test
runner documentation.
The closest to any mention of whether the tests run in parallel or sequentially
is this excerpt but that's related to the order in which the test runner reports
the results:

> Once a test function finishes executing, the results are reported as quickly
> as possible while maintaining the order of the tests.

https://nodejs.org/api/test.html#extraneous-asynchronous-activity

Maybe the file system operations lag a little bit and there needs to be a delay
between the tests or what.

For now I run them one by one.
