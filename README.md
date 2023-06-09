# GitHub Action **Auto Git Modules**

[![test](https://github.com/TomasHubelbauer/github-action-auto-git-modules/actions/workflows/test.yml/badge.svg)](https://github.com/TomasHubelbauer/github-action-auto-git-modules/actions/workflows/test.yml)

This GitHub Action looks at the `.gitmodules` file and if there are new entries
added or removed that don't correspond to the required changes elsewhere in Git
to properly add or remove the submodule, it syncs the rest of the Git repository
to make the submodule properly added or removed.

Additionally, optionally, by default, the Action also hits the GitHub API for
metadata information for each submodule repository and adds and syncs this
metadata as extra keys in `.gitmodules` for each module.
See [How to disable metadata sync](#how-to-disable-metadata-sync) for how to
disable this behavior.

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

## Tests

`node --test --test-name-pattern=…`

## Notes

### How to use the submodule addition shortcut

For convenience, I made it possible to add submodules just by adding a special
comment into `.gitmodules` with the submodule repository URL, e.g.:

`.gitmodules`
```ini
…

#+ https://github.com/user/repo
```

This is a shorthand for doing this by hand:

`.gitmodules`
```ini
…

[submodule "repo"]
  name = repo
  url = https://github.com/user/repo
```

### How to disable metadata sync

Call this action like so:

```yml
steps:
  - name: Sync .gitmodules changes with Git Modules
    uses: TomasHubelbauer/github-action-auto-git-modules@main
    with:
      sync-metadata: false
```

### GitHub Pages

If you use this Action to pull submodules to a repository which has associated
GitHub Pages, the submodules directories will automatically be pulled and made
available as a part of the GitHub Pages site:

https://docs.github.com/en/pages/getting-started-with-github-pages/using-submodules-with-github-pages

If you want to use the `.gitmodules` file to dynamically fetch a list of the
submodules added to the GitHub Pages site repository, you can use `fetch` to
download `.gitmodules` and process it using JavaScript.

By default Jekyll (which is used on GitHub Pages unless the `.nojekyll` file
exists - but then automatic MarkDown to HTML conversion doesn't work which is
useful in case any of the submodules do not have their own HTML files) excludes
any paths starting with a `.` from the build.
To have access to `.gitmodules`, add it to `_config.yml`:

```yml
include: ['.gitmodules']
```

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

### How adding a submodule works

```sh
git submodule add https://github.com/TomasHubelbauer/git-demo-submodule
```

This will:

- Clone the linked repository into a directory named after it
- Create a directory in `.git/modules` for the submodule
- Update the `.git/config` file to add a new `submodule` section
- Create or update a file name `.gitmodules`

### How removing a submodule works

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

### How checking out with submodules works

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

### Add a test for metadata sync by mocking the API call

https://github.com/TomasHubelbauer/node-test-runner-mock-fetch
