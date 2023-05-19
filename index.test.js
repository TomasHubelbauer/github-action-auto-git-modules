import fs from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import url from 'node:url';
import path from 'node:path'
import runCommand from './runCommand.js';
import drainAsyncGenerator from './drainAsyncGenerator.js';
import parseDotGitmodulesFile from './parseDotGitmodulesFile.js';
import parseGitLsFilesCommand from './parseGitLsFilesCommand.js';
import parseDotGitModulesDirectory from './parseDotGitModulesDirectory.js';
import parseDotGitConfigFile from './parseDotGitConfigFile.js';

async function clearStrayDirectories() {
  // Clean up stray `super` folder left in case the test failed on the prior run
  try {
    await fs.promises.access('super');
    await fs.promises.rm('super', { recursive: true });
  }
  catch { }

  // Clean up stray `sub` folder left in case the test failed on the prior run
  try {
    await fs.promises.access('sub');
    await fs.promises.rm('sub', { recursive: true });
  }
  catch { }

  // Clean up stray `super.git` folder left in case the test failed on the prior run
  try {
    await fs.promises.access('super.git');
    await fs.promises.rm('super.git', { recursive: true });
  }
  catch { }
}

async function makeSuperRepository() {
  // Make a directory for the super repository we will add the submodule to later
  await fs.promises.mkdir('super');

  // Go to the test repository directory to make all file system calls work on it
  process.chdir('super');

  // Turn the directory into a Git repository
  assert.match(
    // Note that `init.defaultBranch` is there for GitHub Actions where this
    // config doesn't seem to be the default in Git - it is not needed locally
    await runCommand('git -c init.defaultBranch=main init'),
    /^Initialized empty Git repository in .*?\/super\/.git\/\n$/
  );

  // Assert the `.gitmodules` file is empty (does not exist)
  assert.deepEqual(
    await drainAsyncGenerator(parseDotGitmodulesFile()),
    []
  );

  // Assert the `git ls-files` command returns nothing
  assert.deepEqual(
    await drainAsyncGenerator(parseGitLsFilesCommand()),
    []
  );

  // Assert the `.git/modules` directory is empty (does not exist)
  assert.deepEqual(
    await drainAsyncGenerator(parseDotGitModulesDirectory()),
    []
  );

  // Assert the `.git/config` file has no `submodule` sections
  assert.deepEqual(
    await drainAsyncGenerator(parseDotGitConfigFile()),
    []
  );

  // Assert that `git submodule status` shows no submodule is checked out
  assert.equal(
    await runCommand('git submodule status'),
    ''
  );

  // Go back up to be able to create a directory alongside the `super` directory
  process.chdir('..');
}

async function makeSubRepository() {
  // Make a directory for the sub repository which is the submodule we will add
  await fs.promises.mkdir('sub');

  // Go to the test repository directory to make all file system calls work on it
  process.chdir('sub');

  // Turn the directory into a Git repository
  assert.match(
    // Note that `init.defaultBranch` is there for GitHub Actions where this
    // config doesn't seem to be the default in Git - it is not needed locally
    await runCommand('git -c init.defaultBranch=main init'),
    /^Initialized empty Git repository in .*\/sub\/.git\/\n$/
  );

  // Add a README to the submodule so it is not empty and is easier to inspect
  await fs.promises.writeFile('README.md', 'Hello, world!\n');

  // Stage the README
  assert.equal(
    await runCommand('git add README.md'),
    ''
  );

  // Commit the README
  assert.match(
    // Note that `user.name` and `user.email` are there for GitHub Actions where
    // there is no Git identity set up by default and are not needed locally
    await runCommand('git -c user.name="Tomas Hubelbauer" -c user.email="tomas@hubelbauer.net" commit -m "Add a README" -m "The README is here to make the submodule non-empty"'),
    /^\[main \(root-commit\) \w{7}\] Add a README\n 1 file changed, 1 insertion\(\+\)\n create mode 100644 README.md\n$/
  );

  // Go back up to the starting working directory
  process.chdir('..');
}

async function addSubmodule() {
  // Go to the `super` directory to be able to add the submodule
  process.chdir('super');

  // Add the submodule to `.gitmodules` to simulate doing it via the GitHub web UI
  await fs.promises.writeFile('.gitmodules', '[submodule "sub"]\n\tpath = sub\n\turl = ../sub\n');

  // Run the main script which should notice this and sort out the repo state
  // Use the cache-buster to force the module to fully re-evaluate ach time
  await import('./index.js?add');

  // Assert the `.gitmodules` file is not empty (contains the module)
  assert.deepEqual(
    await drainAsyncGenerator(parseDotGitmodulesFile()),
    [{ name: 'sub', path: 'sub', url: '../sub' }]
  );

  // Assert the `git ls-files` command returns the submodule
  assert.deepEqual(
    await drainAsyncGenerator(parseGitLsFilesCommand()),
    ['sub']
  );

  // Assert the `.git/modules` directory is not empty (exists with the submodule)
  assert.deepEqual(
    await drainAsyncGenerator(parseDotGitModulesDirectory()),
    ['sub']
  );

  // Assert the `.git/config` file has a corresponding `submodule` section
  assert.deepEqual(
    await drainAsyncGenerator(parseDotGitConfigFile()),
    [{ active: true, name: 'sub', url: path.join(url.fileURLToPath(import.meta.url), '../sub') }]
  );

  // Assert that `git submodule status` shows the submodule is checked out
  assert.match(
    await runCommand('git submodule status'),
    /^ \w{40} sub \(heads\/main\)\n$/
  );

  // Validate the status after adding the submodule
  assert.match(
    await runCommand('git status'),
    /^On branch main\n\nNo commits yet\n\nChanges to be committed:\n  \(use "git rm --cached <file>..." to unstage\)\n\tnew file:   .gitmodules\n\tnew file:   sub\n\n$/
  );

  // Stage the changes
  assert.equal(
    await runCommand('git add *'),
    ''
  );

  // Commit the changes
  assert.match(
    // Note that `user.name` and `user.email` are there for GitHub Actions where
    // there is no Git identity set up by default and are not needed locally
    await runCommand('git -c user.name="Tomas Hubelbauer" -c user.email="tomas@hubelbauer.net" commit -m "Add a submodule" -m "This submodule is added and should check out when later cloned again"'),
    /^\[main \(root-commit\) \w{7}\] Add a submodule\n 2 files changed, 4 insertions\(\+\)\n create mode 100644 .gitmodules\n create mode 160000 sub\n$/
  );

  // Validate the status after committing the submodule
  assert.match(
    await runCommand('git status'),
    /^On branch main\nnothing to commit, working tree clean\n$/
  );

  // Go back out from `super` to be able to clean up the two repository folders
  process.chdir('..');
}

async function removeSubmodule() {
  // Go to the `super` directory to be able to remove the submodule
  process.chdir('super');

  // Erase the `.gitmodules` file to simulate removing one via the GitHub web UI
  await fs.promises.rm('.gitmodules');

  // Run the main script which should notice this and sort out the repo state
  // Use the cache-buster to force the module to fully re-evaluate ach time
  await import('./index.js?delete');

  // Assert the `.gitmodules` file is empty (contains no modules)
  assert.deepEqual(
    await drainAsyncGenerator(parseDotGitmodulesFile()),
    []
  );

  // Assert the `git ls-files` command returns nothing
  assert.deepEqual(
    await drainAsyncGenerator(parseGitLsFilesCommand()),
    []
  );

  // Assert the `.git/modules` directory is empty (does not exist)
  assert.deepEqual(
    await drainAsyncGenerator(parseDotGitModulesDirectory()),
    []
  );

  // Assert the `.git/config` file has no `submodule` sections
  assert.deepEqual(
    await drainAsyncGenerator(parseDotGitConfigFile()),
    []
  );

  // Assert that `git submodule status` shows no submodule is checked out
  assert.equal(
    await runCommand('git submodule status'),
    ''
  );

  // Validate the status after removing the submodule
  assert.match(
    await runCommand('git status'),
    /^On branch main\nChanges to be committed:\n  \(use "git restore --staged <file>..." to unstage\)\n\tdeleted:    sub\n\nChanges not staged for commit:\n  \(use "git add\/rm <file>..." to update what will be committed\)\n  \(use "git restore <file>..." to discard changes in working directory\)\n\tdeleted:    .gitmodules\n\nUntracked files:\n  \(use "git add <file>..." to include in what will be committed\)\n\tsub\/\n\n/
  );

  // Stage the changes
  assert.equal(
    await runCommand('git add .'),
    ''
  );

  // Commit the changes
  assert.match(
    // Note that `user.name` and `user.email` are there for GitHub Actions where
    // there is no Git identity set up by default and are not needed locally
    await runCommand('git -c user.name="Tomas Hubelbauer" -c user.email="tomas@hubelbauer.net" commit -m "Add a submodule" -m "This submodule is added and should check out when later cloned again"'),
    /^\[main \w{7}\] Add a submodule\n 3 files changed, 1 insertion\(\+\), 4 deletions\(-\)\n delete mode 100644 .gitmodules\n delete mode 160000 sub\n create mode 100644 sub\/README.md\n$/
  );

  // Validate the status after committing the submodule removal
  assert.match(
    await runCommand('git status'),
    /^On branch main\nnothing to commit, working tree clean\n$/
  );

  // Go back out from `super` to be able to clean up the two repository folders
  process.chdir('..');
}

async function clearSuperRepository() {
  // Delete the `super` repository directory
  await fs.promises.rm('super', { recursive: true });
}

async function clearSubRepository() {
  // Delete the `sub` repository directory
  await fs.promises.rm('sub', { recursive: true });
}

test('add submodule', async () => {
  await clearStrayDirectories();
  await makeSuperRepository();
  await makeSubRepository();
  await addSubmodule();
  await clearSuperRepository();
  await clearSubRepository();
});

test('remove submodule', async () => {
  await clearStrayDirectories();
  await makeSuperRepository();
  await makeSubRepository();
  await addSubmodule();
  await removeSubmodule();
  await clearSuperRepository();
  await clearSubRepository();
});

test('clone with submodules', async () => {
  await clearStrayDirectories();
  await makeSuperRepository();
  await makeSubRepository();
  await addSubmodule();

  process.chdir('super');

  assert.equal(
    await runCommand('git status'),
    'On branch main\nnothing to commit, working tree clean\n'
  );

  await fs.promises.cp('.git', '../super.git', { recursive: true });

  process.chdir('..');

  await clearSuperRepository();

  assert.equal(
    await runCommand('git clone super.git super', 'stderr'),
    'Cloning into \'super\'...\ndone.\n'
  );

  process.chdir('super');

  assert.match(
    await runCommand('git -c protocol.file.allow=always submodule update --init --recursive --remote', 'stdio'),
    /^Submodule path 'sub': checked out '\w{40}'\n\nSubmodule 'sub' \(.*?\/sub\) registered for path 'sub'\nCloning into '.*?\/sub'...\ndone.\n$/
  );

  await fs.promises.access('sub/README.md');

  process.chdir('..');

  await clearSubRepository();
  await clearSuperRepository();
  await fs.promises.rm('super.git', { recursive: true });
});
