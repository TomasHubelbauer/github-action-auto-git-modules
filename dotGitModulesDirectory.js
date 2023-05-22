import drainAsyncGenerator from './drainAsyncGenerator.js';
import parseDotGitModulesDirectory from './parseDotGitModulesDirectory.js';

console.log('Loaded .git/modules');
export default await drainAsyncGenerator(parseDotGitModulesDirectory());
