const {
  crdebug
} = require('../cr-base');

class Commit {
  constructor(commitHash, abbreviatedHash, parents, summary, gitRef, authorName, date) {
    this.commitHash = commitHash;
    this.abbreviatedHash = abbreviatedHash;
    this.parents = parents;
    this.summary = summary;
    this.gitRef = gitRef;
    this.authorName = authorName;
    this.date = date;
  }
}

function newCommitFromList(dataList) {
  const parents = dataList[2].length > 0 ? dataList[2].split(' ') : [];
  let gitRefs = '';
  if (dataList[4].length > 0) {
    let gitRefsList = dataList[4].split(' ,');
    for (let i = 0; i < gitRefsList.length; i++) {
      const ref = gitRefsList[i]
      if (ref.includes('->')) {
        gitRefs += ref.split(' -> ').join(', ');
      } else if (!ref.includes('tag')) {
        gitRefs += ref;
      }
      if (i < gitRefsList.length - 1)
        gitRefs += ', ';
    }
  }
  return new Commit(dataList[0], dataList[1], parents, dataList[3], gitRefs, dataList[5], dataList[6])
}

module.exports = {
  newCommitFromList
}