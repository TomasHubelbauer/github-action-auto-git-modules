import drainAsyncGenerator from './drainAsyncGenerator.js';
import parseDotGitConfigFile from './parseDotGitConfigFile.js';

console.log('Loaded .git/config');
export default await drainAsyncGenerator(parseDotGitConfigFile());
