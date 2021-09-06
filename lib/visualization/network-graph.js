const {
  crdebug
} = require('../cr-base');

const path = require('path');
const vis = require('vis-network');

const {newCommitFromList} = require('./commit');
const {colorBlue, colorRed, options} = require('./graph-utils');
const {separator, gitLogGraph, gitLogByBranch, command} = require('./git-utils')

class NetworkGraph {

  static deserialize(state) {
    return new NetworkGraph(Object.assign(state));
  }

  constructor(params = {}) {
    this.repository = params.repository;
    this.title = 'Network';
    this.element = document.createElement('div');
    if (this.repository === null) {
      this.noGitRepository();
    } else {
      this.title += ' for ' + this.repository.substring(this.repository.lastIndexOf(path.sep) + 1);
      this.createNetworkGraph();
    }
  }

  serialize() {
    return {deserializer: 'NetworkGraph', repository: this.repository};
  }

  getTitle() {
    return this.title;
  }

  getElement() {
    return this.element;
  }

  noGitRepository() {
    const h1 = document.createElement('h1');
    h1.classList.add('no-git')
    const text = document.createTextNode('Git repository wasn\'t found for this project.')
    h1.appendChild(text);
    this.element.appendChild(h1);
  }

  createNetworkGraph() {
    const loadCommitsDiv = document.createElement('div');
    loadCommitsDiv.classList.add('load-commits');
    loadCommitsDiv.innerHTML =
      'Load more commits: ' +
      '<input class="input-radio" id="50" type="radio" name="num_commits" value="50" checked>' +
      '<label class="label-radio" for="50">50</label>' +
      '<input class="input-radio" id="100" type="radio" name="num_commits" value="100">' +
      '<label class="label-radio" for="100">100</label>' +
      '<input class="input-radio" id="200" type="radio" name="num_commits" value="200">' +
      '<label class="label-radio" for="200">200</label>'
    const button = document.createElement('button');
    button.appendChild(document.createTextNode('Load'))
    button.setAttribute('id', 'load-btn');
    button.classList.add('btn');
    button.classList.add('btn-primary');
    loadCommitsDiv.appendChild(button);

    const shortCommitDiv = document.createElement('div');
    shortCommitDiv.classList.add('short-commit');

    const networkDiv = document.createElement('div');
    networkDiv.classList.add('network');

    this.element.appendChild(loadCommitsDiv);
    this.element.appendChild(shortCommitDiv);
    this.element.appendChild(networkDiv);
    this.markedNodes = [];

    command(gitLogGraph, this.repository).then(initGraphData => {
      const commits = {};
      const nodes = new vis.DataSet([]);
      const edges = new vis.DataSet([]);

      let {loadedRows, loadedCommits} = this.loadGraph(initGraphData, commits, nodes, edges, 0, 0);

      const data = {nodes, edges};

      const network = new vis.Network(networkDiv, data, options);

      button.onclick = function () {
        button.disabled = true;
        command(gitLogGraph, this.repository).then(graphData => {
          const details = this.loadGraph(graphData, commits, nodes, edges, loadedRows, loadedCommits);
          loadedRows = details.loadedRows;
          loadedCommits = details.loadedCommits;
        });
      }.bind(this);

      network.on('hoverNode', function ({node}) {
        // const coordinates = network.getPositions(node)[node];
        const boundingBox = network.getBoundingBox(node);
        if (boundingBox.right - boundingBox.left <= 28) {
          const commit = commits[node];
          const p = document.createElement('p');
          p.innerHTML =
            'Abbreviated commit hash: ' + commit.abbreviatedHash +
            '</br>Author name: ' + commit.authorName +
            '</br>Summary: ' + commit.summary +
            '</br>Date: ' + commit.date;
          shortCommitDiv.appendChild(p);
        }
      });

      network.on('blurNode', function () {
        if (shortCommitDiv.firstChild)
          shortCommitDiv.firstChild.remove();
      });

      let lastClickedRef;
      network.on('click', function (params) {
        const nodeId = params['nodes'][0];
        if (nodeId) {
          const boundingBox = network.getBoundingBox(nodeId);
          if (boundingBox.right - boundingBox.left <= 28) {
            // ako je komit
            // todo
            //ako je ref
          } else if (lastClickedRef !== nodeId) {
            resetGraph(this.markedNodes);
            command(gitLogByBranch(nodeId.split(', ')[0]), this.repository).then(result => {
              const commitsList = result.split('\n');
              for (let c of commitsList) {
                const nodeToUpdate = nodes.get(c);
                if (nodeToUpdate) {
                  nodeToUpdate.color = colorRed;
                  nodes.update(nodeToUpdate);
                  this.markedNodes.push(c);
                } else {
                  break;
                }
              }
            })
          }
        } else if (lastClickedRef !== nodeId) {
          resetGraph(this.markedNodes);
        }

        function resetGraph(markedNodes) {
          lastClickedRef = nodeId;
          if (markedNodes.length > 0) {
            for (let n of markedNodes) {
              const nodeToUpdate = nodes.get(n);
              nodeToUpdate.color = colorBlue;
              nodes.update(nodeToUpdate);
            }
            markedNodes = [];
          }
        }
      }.bind(this));
    });
  }

  loadGraph(graphData, commits, nodes, edges, loadedRows, loadedCommits) {
    this.resetGraphBeforeLoad(nodes);
    const dataList = graphData.split('\n');
    const loadCommits = parseInt(document.querySelector('input[name="num_commits"]:checked').value);
    let y = loadedCommits * 150;
    let count = 0;
    let i = 0 + loadedRows;
    for (i; count < loadCommits && i < dataList.length; i++) {
      const row = dataList[i];
      const index = row.indexOf(separator);
      if (index !== -1) {
        const commit = newCommitFromList(row.substring(index + 3).split(separator));
        commits[commit.commitHash] = commit;
        const x = 500 * row.indexOf('*') / 2;
        nodes.add({id: commit.commitHash, x: x, y: y});
        count += 1;
        for (let j = 0; j < commit.parents.length; j++)
          edges.add({from: commit.commitHash, to: commit.parents[j], width: 3})
        if (commit.gitRef.length > 0) {
          nodes.add({
            id: commit.gitRef,
            label: commit.gitRef,
            shape: 'box',
            color: colorRed,
            widthConstraint: {
              minimum: 250,
              maximum: 250
            },
            x: x + 250,
            y: y,
          });
          edges.add({
            arrows: 'to',
            from: commit.gitRef,
            to: commit.commitHash,
            width: 5
          })
        }
        y += 150;
      }
    }

    if (dataList.length > i) {
      document.getElementById('load-btn').disabled = false;
    }

    return {loadedRows: i, loadedCommits: loadedCommits + count};
  }

  resetGraphBeforeLoad(nodes) {
    if (this.markedNodes.length > 0) {
      for (let n of this.markedNodes) {
        const nodeToUpdate = nodes.get(n);
        nodeToUpdate.color = colorBlue;
        nodes.update(nodeToUpdate);
      }
      this.markedNodes = [];
    }
  }
}


module.exports = NetworkGraph;