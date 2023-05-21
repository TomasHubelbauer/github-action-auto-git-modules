import drainAsyncGenerator from './drainAsyncGenerator.js';
import parseDotGitConfigFile from './parseDotGitConfigFile.js';

export default await drainAsyncGenerator(parseDotGitConfigFile());
