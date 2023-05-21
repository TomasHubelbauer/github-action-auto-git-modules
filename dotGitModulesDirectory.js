import drainAsyncGenerator from './drainAsyncGenerator.js';
import parseDotGitModulesDirectory from './parseDotGitModulesDirectory.js';

export default await drainAsyncGenerator(parseDotGitModulesDirectory());
