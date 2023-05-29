import fs from 'fs';
import runCommand from './runCommand.js';
import gitLsFiles from './gitLsFilesCommand.js?remove';
import dotGitmodules from './dotGitmodulesFile.js?remove';
import dotGitModules from './dotGitModulesDirectory.js?remove';
import dotGitConfig from './dotGitConfigFile.js?remove';

console.log('removeSubmodules: git ls-files:');
for (const path of gitLsFiles) {
  console.log(`\t${path}`);
}

console.log('removeSubmodules: .gitmodules:');
for (const { name, path, url } of dotGitmodules) {
  console.log(`\t${name} (${path}): ${url}`);
}

console.log('removeSubmodules: .git/modules:');
for (const path of dotGitModules) {
  console.log(`\t${path}`);
}

console.log('removeSubmodules: .git/config:');
for (const { name, url, active } of dotGitConfig) {
  console.log(`\t${name}: ${url} (${active ? 'active' : 'inactive'})`);
}

// Remove submodule directories removed from `.gitmodules` but not by the Git command
for (const gitLsFile of gitLsFiles) {
  const dotGitmodule = dotGitmodules.find(dotGitmodule => dotGitmodule.path === gitLsFile);
  if (!dotGitmodule) {
    const stdout = await runCommand(`git rm --cached ${gitLsFile}`);
    console.log(`Removed submodule ${gitLsFile} from index because it is not in .gitmodules: ${stdout}`);
    await fs.promises.appendFile('.git/commit-message.txt', `Removed submodule ${gitLsFile} from index because it is not in .gitmodules.\n`);
  }
}

// Remove bits of submodules removed from `.gitmodules` but not by the Git command
for (const dotGitModule of dotGitModules) {
  const dotGitmodule = dotGitmodules.find(dotGitmodule => dotGitmodule.path === dotGitModule);
  if (!dotGitmodule) {
    await fs.promises.rm(`.git/modules/${dotGitModule}`, { recursive: true });
    if (process.env.CI) {
      console.log(`Removed submodule ${dotGitModule} from .git/modules because it is not in .gitmodules.`);
      await fs.promises.appendFile('.git/commit-message.txt', `Removed submodule ${dotGitModule} from .git/modules because it is not in .gitmodules.\n`);
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
      await fs.promises.appendFile('.git/commit-message.txt', `Removed submodule ${name} from .git/config because it is not in .gitmodules.\n`);
    }
  }
}
