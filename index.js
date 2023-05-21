import fs from 'fs';
import drainAsyncGenerator from './drainAsyncGenerator.js';
import parseDotGitmodulesFile from './parseDotGitmodulesFile.js';
import parseGitLsFilesCommand from './parseGitLsFilesCommand.js';
import parseDotGitModulesDirectory from './parseDotGitModulesDirectory.js';
import parseDotGitConfigFile from './parseDotGitConfigFile.js';
import runCommand from './runCommand.js';
import assert from 'node:assert/strict';

const dotGitmodules = await drainAsyncGenerator(parseDotGitmodulesFile());
const gitLsFiles = await drainAsyncGenerator(parseGitLsFilesCommand());

if (process.env.CI) {
  console.log('.gitmodules:');
  for (const { name, path, url } of dotGitmodules) {
    console.log(`\t${name} (${path}): ${url}`);
  }

  console.log('git ls-files:');
  for (const path of gitLsFiles) {
    console.log(`\t${path}`);
  }
}

// Remove submodule directories removed from `.gitmodules` but not by the Git command
for (const gitLsFile of gitLsFiles) {
  const dotGitmodule = dotGitmodules.find(dotGitmodule => dotGitmodule.path === gitLsFile);
  if (!dotGitmodule) {
    const stdout = await runCommand(`git rm --cached ${gitLsFile}`);
    if (process.env.CI) {
      console.log(`Removed submodule ${gitLsFile} from index because it is not in .gitmodules: ${stdout}`);
    }
  }
}

const dotGitModules = await drainAsyncGenerator(parseDotGitModulesDirectory());
const dotGitConfig = await drainAsyncGenerator(parseDotGitConfigFile());

if (process.env.CI) {
  console.log('.git/modules:');
  for (const path of dotGitModules) {
    console.log(`\t${path}`);
  }

  console.log('.git/config:');
  for (const { name, url, active } of dotGitConfig) {
    console.log(`\t${name}: ${url} (${active ? 'active' : 'inactive'})`);
  }
}

// Remove bits of submodules removed from `.gitmodules` but not by the Git command
for (const dotGitModule of dotGitModules) {
  const dotGitmodule = dotGitmodules.find(dotGitmodule => dotGitmodule.path === dotGitModule);
  if (!dotGitmodule) {
    await fs.promises.rm(`.git/modules/${dotGitModule}`, { recursive: true });
    if (process.env.CI) {
      console.log(`Removed submodule ${dotGitModule} from .git/modules because it is not in .gitmodules.`);
    }
  }
}

// Remove sections of submodules removed from `.gitmodules` but not by the Git command
for (const { name } of dotGitConfig) {
  const dotGitmodule = dotGitmodules.find(dotGitmodule => dotGitmodule.name === name);
  if (!dotGitmodule) {
    const stdout = await runCommand(`git config --remove-section submodule.${name}`);
    if (process.env.CI) {
      console.log(`Removed submodule ${name} from .git/config because it is not in .gitmodules: ${stdout}`);
    }
  }
}

// Install submodules added by name to `.gitmodules` not added by the Git command
for (const dotGitmodule of dotGitmodules) {
  if (dotGitmodule.name !== dotGitmodule.path) {
    throw new Error(`No support for submodule name !== path: ${dotGitmodule.name} !== ${dotGitmodule.path}`);
  }

  const dotGitModule = dotGitModules.find(dotGitModule => dotGitModule === dotGitmodule.path);
  if (!dotGitModule) {
    const command = dotGitmodule.url.startsWith('./') || dotGitmodule.url.startsWith('../')
      // Note that `protocol.file.allow=always` is set to work around CVE-2022-39253
      // See https://twitter.com/TomasHubelbauer/status/1654844311928729605
      ? `git -c protocol.file.allow=always submodule add ${dotGitmodule.url}`
      : `git submodule add ${dotGitmodule.url}`
      ;
    const stderr = await runCommand(command, 'stderr');

    // TODO: Interleave the expected directory name /${dotGitmodule.name} here
    // Note that the `done.` part appears in tests but not in real runtime?
    assert.match(stderr, /^Cloning into '.*?'...\n(done.\n)?$/);
    if (process.env.CI) {
      console.log(`Added submodule ${dotGitmodule.name} to .git/modules because it is not in .git/modules.`);
    }
  }

  const dotGitConfig = await drainAsyncGenerator(parseDotGitConfigFile());
  if (process.env.CI) {
    console.log('.git/config:');
    for (const { name, url, active } of dotGitConfig) {
      console.log(`\t${name}: ${url} (${active ? 'active' : 'inactive'})`);
    }
  }

  if (!dotGitConfig.find(dotGitConfig => dotGitConfig.name === dotGitmodule.name)) {
    throw new Error(`No .git/config entry found for submodule ${dotGitmodule.name}.`);
  }

  const { name, url, active } = dotGitConfig.find(dotGitConfig => dotGitConfig.name === dotGitmodule.name);
  if (url !== dotGitmodule.url) {
    // TODO: Resolve to full paths and do the check for local paths as well
    if (!dotGitmodule.url.startsWith('./') && !dotGitmodule.url.startsWith('../')) {
      throw new Error(`URL mismatch for submodule ${name}: ${url} !== ${dotGitmodule.url}`);
    }
  }

  if (!active) {
    throw new Error(`Submodule ${name} is not active.`);
  }
}

// Note that this is probably incorrect and Node doesn't ship an API for this
// because "this seems like a userland thing hurr durr" ugh
// See https://github.com/nodejs/node/issues/34840
function escapeShell(/** @type {string | undefined} */ string) {
  if (!string) {
    return '';
  }

  return '"' + string?.replace(/(["'$`\\])/g, '\\$1') + '"';
}

// TODO: Also fetch the README and add a `title` to the `.gitmodules` entry
// See: https://api.github.com/repos/TomasHubelbauer/git-demo-submodule/readme
if (process.env.SYNC_METADATA === 'true') {
  if (!process.env.GITHUB_TOKEN) {
    throw new Error('GITHUB_TOKEN environment variable must be set to sync metadata.');
  }

  /** @type {RequestInit} */
  const init = {
    headers: {
      Authorization: `token ${process.env.GITHUB_TOKEN}`,
      'User-Agent': 'TomasHubelbauer',
    }
  };

  for (const dotGitmodule of dotGitmodules) {
    const url = new URL(dotGitmodule.url);
    if (url.protocol !== 'https:') {
      throw new Error(`No support for non-HTTPS URLs: ${dotGitmodule.url}`);
    }

    console.log(`Syncing metadata for ${dotGitmodule.name}…`);

    const titleResponse = await fetch(`https://api.github.com/repos${url.pathname}/readme`, init);
    const titleData = await titleResponse.json();
    const readme = Buffer.from(titleData.content, 'base64').toString('utf8');
    const title = readme.match(/^# (?<title>.*?)\n/)?.groups?.title;
    if (title) {
      await runCommand(`git config --file .gitmodules submodule.${dotGitmodule.name}.title ${escapeShell(title)}`);
    }

    const response = await fetch(`https://api.github.com/repos${url.pathname}`, init);
    const data = await response.json();
    const { description, created_at, updated_at, pushed_at, homepage, archived, topics } = data;
    await runCommand(`git config --file .gitmodules submodule.${dotGitmodule.name}.description ${escapeShell(description)}`);
    await runCommand(`git config --file .gitmodules submodule.${dotGitmodule.name}.created-at "${created_at}"`);
    await runCommand(`git config --file .gitmodules submodule.${dotGitmodule.name}.updated-at "${updated_at}"`);
    await runCommand(`git config --file .gitmodules submodule.${dotGitmodule.name}.pushed-at "${pushed_at}"`);
    await runCommand(`git config --file .gitmodules submodule.${dotGitmodule.name}.homepage ${escapeShell(homepage)}`);
    await runCommand(`git config --file .gitmodules submodule.${dotGitmodule.name}.archived ${archived}`);
    await runCommand(`git config --file .gitmodules submodule.${dotGitmodule.name}.topics "${topics.join(',')}"`);
    console.log(`Synced metadata for ${dotGitmodule.name}.`);
  }
}
