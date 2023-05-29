import fs from 'fs';
import assert from 'node:assert/strict';
import runCommand from './runCommand.js';
import dotGitmodules from './dotGitmodulesFile.js?add';
import dotGitModules from './dotGitModulesDirectory.js?add';
import escapeShell from './escapeShell.js';

console.log('addSubmodules: .gitmodules:');
for (const { name, path, url } of dotGitmodules) {
  console.log(`\t${name} (${path}): ${url}`);
}

console.log('addSubmodules: .git/modules:');
for (const path of dotGitModules) {
  console.log(`\t${path}`);
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
    console.log(`Added submodule ${dotGitmodule.name} to .git/modules because it is not in .git/modules.`);
    await fs.promises.appendFile('.git/commit-message.txt', `Added submodule ${dotGitmodule.name} to .git/modules because it is not in .git/modules.\n`);
  }

  // Reload the .git/config file with changes already applied by cache busting
  // Use the module name as the cache buster so it reloads for each submodule
  const { default: dotGitConfig } = await import('./dotGitConfigFile.js?' + dotGitmodule.name);
  console.log('addSubmodules: .git/config:');
  for (const { name, url, active } of dotGitConfig) {
    console.log(`\t${name}: ${url} (${active ? 'active' : 'inactive'})`);
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

    console.group(`Syncing metadata for ${dotGitmodule.name}…`);

    const titleResponse = await fetch(`https://api.github.com/repos${url.pathname}/readme`, init);
    const titleData = await titleResponse.json();
    const readme = Buffer.from(titleData.content, 'base64').toString('utf8');
    const title = readme.match(/^# (?<title>.*?)\n/)?.groups?.title;
    if (title) {
      await runCommand(`git config --file .gitmodules submodule.${dotGitmodule.name}.title ${escapeShell(title)}`);
      console.log(`Synced title: ${escapeShell(title)}`);
    }
    else {
      console.log(`No title found in README: ${JSON.stringify(readme.split('\n', 1)[0])}`);
    }

    const response = await fetch(`https://api.github.com/repos${url.pathname}`, init);
    const data = await response.json();
    const { description, created_at, updated_at, pushed_at, homepage, archived, topics } = data;
    await runCommand(`git config --file .gitmodules submodule.${dotGitmodule.name}.description ${escapeShell(description)}`);
    console.log(`Synced description: ${escapeShell(description)}`);
    await runCommand(`git config --file .gitmodules submodule.${dotGitmodule.name}.created-at "${created_at}"`);
    console.log(`Synced created-at: ${created_at}`);
    await runCommand(`git config --file .gitmodules submodule.${dotGitmodule.name}.updated-at "${updated_at}"`);
    console.log(`Synced updated-at: ${updated_at}`);
    await runCommand(`git config --file .gitmodules submodule.${dotGitmodule.name}.pushed-at "${pushed_at}"`);
    console.log(`Synced pushed-at: ${pushed_at}`);
    await runCommand(`git config --file .gitmodules submodule.${dotGitmodule.name}.homepage ${escapeShell(homepage)}`);
    console.log(`Synced homepage: ${escapeShell(homepage)}`);
    await runCommand(`git config --file .gitmodules submodule.${dotGitmodule.name}.archived ${archived}`);
    console.log(`Synced archived: ${archived}`);
    await runCommand(`git config --file .gitmodules submodule.${dotGitmodule.name}.topics "${topics.join(',')}"`);
    console.log(`Synced topics: ${topics.join(',')}`);
    console.groupEnd();
  }
}
