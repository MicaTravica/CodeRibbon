const {
  crdebug
} = require('../cr-base');

const {GitProcess} = require('dugite');

const separator = '~*~';

const gitLogGraph = ['log', '--all', '--graph',
  '--pretty=format:' + separator + '%H' + separator + '%h' + separator + '%P'
  + separator + '%s' + separator + '%D' + separator + '%aN' + separator + '%as'];

const gitLogByBranch = (branch) => ['log', branch, '--pretty=format:%H'];

async function command(args, repo) {
  const result = await GitProcess.exec(args, repo);
  if (result.exitCode === 0) {
    return result.stdout;
    // do some things with the output
  } else {
    return result.stderr;
    // error handling
  }
}

function getRepositoryByFile(file) {
  const repositories = atom.project.getRepositories();
  const projects = atom.project.getPaths();
  const matchingProjects = [];
  for (let i = 0; i < projects.length; i++) {
    if (file.includes(projects[i])) {
      matchingProjects.push({path: projects[i], index: i, length: projects[i].length});
    }
  }
  let projectWithLongestPath = matchingProjects[0];
  if (matchingProjects.length > 1) {
    for (let i = 1; i < matchingProjects.length; i++) {
      if (matchingProjects[i].length > projectWithLongestPath.length) {
        projectWithLongestPath = matchingProjects[i];
      }
    }
  }
  return repositories[projectWithLongestPath.index] !== null ? projectWithLongestPath.path : null;
}

module.exports = {
  separator,
  gitLogGraph,
  gitLogByBranch,
  command,
  getRepositoryByFile
}