const {
  crdebug
} = require('../cr-base');

const path = require('path');
const fs = require('fs');
const vis = require('vis-network');

const {newCommitFromList} = require('./commit');
const {colorBlue, colorRed, options} = require('./graph-utils');
const {separator, gitLogGraph, gitLogByBranch, gitShowByCommit, gitLogByFile, command} = require('./git-utils');

class NetworkGraph {

  static deserialize(state) {
    return new NetworkGraph(Object.assign(state));
  }

  constructor(params = {}) {
    this.repository = params.repository;
    this.title = 'Network';
    this.element = document.createElement('network-graph');
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
    this.createMessage('Git repository wasn\'t found for this project.');
  }

  createMessage(message) {
    const ul = document.createElement('ul');
    ul.classList.add("background-message", "centered");
    const li = document.createElement('li');
    const text = document.createTextNode(message);
    li.appendChild(text);
    ul.appendChild(li);
    this.element.appendChild(ul);
  }

  createNetworkGraph() {
    this.uniqueId = Date.now().toString(36);
    const loadCommitsDiv = document.createElement('div');
    loadCommitsDiv.classList.add('load-commits');
    loadCommitsDiv.innerHTML =
      'Load more commits: ' +
      '<input class="input-radio" id="50" type="radio" name="' + this.uniqueId + '" value="50" checked>' +
      '<label class="label-radio" for="50">50</label>' +
      '<input class="input-radio" id="100" type="radio" name="' + this.uniqueId + '" value="100">' +
      '<label class="label-radio" for="100">100</label>' +
      '<input class="input-radio" id="200" type="radio" name="' + this.uniqueId + '" value="200">' +
      '<label class="label-radio" for="200">200</label>';
    this.button = document.createElement('button');
    this.button.appendChild(document.createTextNode('Load'));
    this.button.setAttribute('id', 'load-btn');
    this.button.classList.add('btn', 'btn-primary');
    loadCommitsDiv.appendChild(this.button);

    const shortCommitDiv = document.createElement('div');
    shortCommitDiv.classList.add('short-commit');

    const networkDiv = document.createElement('div');
    networkDiv.classList.add('network');

    this.element.appendChild(loadCommitsDiv);
    this.element.appendChild(shortCommitDiv);
    this.element.appendChild(networkDiv);
    this.markedNodes = [];

    command(gitLogGraph, this.repository).then(initGraphData => {
      if (initGraphData === 'error') {
        this.element.innerText = '';
        this.createMessage('Are you sure that you have access to this repository?');
        return;
      }
      const commits = {};
      const nodes = new vis.DataSet([]);
      const edges = new vis.DataSet([]);

      let {loadedRows, loadedCommits} = this.loadGraph(initGraphData, commits, nodes, edges, 0, 0);

      const data = {nodes, edges};

      const network = new vis.Network(networkDiv, data, options);

      this.button.onclick = function () {
        this.button.disabled = true;
        command(gitLogGraph, this.repository).then(graphData => {
          const details = this.loadGraph(graphData, commits, nodes, edges, loadedRows, loadedCommits);
          loadedRows = details.loadedRows;
          loadedCommits = details.loadedCommits;
        });
      }.bind(this);

      network.on('hoverNode', function ({node}) {
        // const coordinates = network.getPositions(node)[node];
        const boundingBox = network.getBoundingBox(node);
        const p = document.createElement('p');
        if (boundingBox.right - boundingBox.left <= 28) {
          const commit = commits[node];
          p.innerHTML = 'Abbreviated commit hash: ' + commit.abbreviatedHash +
            '</br>Author name: ' + commit.authorName +
            '</br>Summary: ' + commit.summary +
            '</br>Date: ' + commit.date;
        } else {
          p.innerHTML = node;
        }
        shortCommitDiv.appendChild(p);
      });

      network.on('blurNode', function () {
        if (shortCommitDiv.firstChild)
          shortCommitDiv.firstChild.remove();
      });

      let lastClicked;
      network.on('click', function (params) {
        const nodeId = params['nodes'][0];
        if (nodeId) {
          const boundingBox = network.getBoundingBox(nodeId);
          // ako je komit
          if (boundingBox.right - boundingBox.left <= 28) {
            let commitDiv = document.getElementById('show-commit-' + this.uniqueId);
            if (!commitDiv) {
              networkDiv.classList.add('network-and-show-commit');
              commitDiv = document.createElement('div');
              commitDiv.classList.add('show-commit');
              commitDiv.setAttribute('id', 'show-commit-' + this.uniqueId);
              this.element.appendChild(commitDiv);
            }
            const commit = commits[nodeId];
            command(gitShowByCommit(nodeId), this.repository).then(result => {
              commitDiv.innerHTML = '';
              const h2 = document.createElement('h2');
              h2.appendChild(document.createTextNode(commit.summary));
              commitDiv.appendChild(h2);

              const h5 = document.createElement('h5');
              h5.appendChild(document.createTextNode(commit.authorName + ' committed on ' + commit.date));
              h5.appendChild(document.createElement('br'));
              h5.appendChild(document.createTextNode('parents: ' + commit.parents.join(', ') +
                ' commit ' + commit.commitHash));
              commitDiv.appendChild(h5);

              for (let file of result.substring(0, result.length - 1).split('\n')) {
                const table = document.createElement('table');
                table.classList.add('commit-file');

                const tr = document.createElement('tr');

                const tdLeft = document.createElement('td');
                tdLeft.classList.add('td-left');
                tdLeft.appendChild(document.createTextNode(file));
                tr.appendChild(tdLeft);

                if (fs.existsSync(this.repository + path.sep + file)) {
                  let buttonHistory = document.createElement('button');
                  buttonHistory.classList.add('btn', 'btn-primary');
                  buttonHistory.appendChild(document.createTextNode('History'));
                  buttonHistory.onclick = () => {
                    if (lastClicked !== file) {
                      lastClicked = file;
                      resetGraph(this.markedNodes);
                      command(gitLogByFile(file), this.repository).then(result => {
                        changeCommitColor(result, this.markedNodes);
                      });
                    }
                  }

                  let buttonChanges = document.createElement('button');
                  buttonChanges.classList.add('btn', 'btn-primary');
                  buttonChanges.appendChild(document.createTextNode('Changes'));
                  buttonChanges.onclick = () =>
                    atom.commands.dispatch(
                      atom.views.getView(atom.views.getView(this)),
                      'code-ribbon:file-diff',
                      {repository: this.repository, commit: commit.commitHash, file}
                    );

                  const tdRight = document.createElement('td');
                  tdRight.classList.add('td-right');
                  tdRight.appendChild(buttonHistory);
                  tdRight.appendChild(buttonChanges);
                  tr.appendChild(tdRight);
                }
                table.appendChild(tr);
                commitDiv.appendChild(table);
              }
              commitDiv.appendChild(document.createElement('br'));
              commitDiv.appendChild(document.createElement('br'));
            });
            //ako je ref
          } else if (lastClicked !== nodeId) {
            resetGraph(this.markedNodes);
            command(gitLogByBranch(nodeId.split(', ')[0]), this.repository).then(result => {
              changeCommitColor(result, this.markedNodes);
            });
          }
        } else if (lastClicked !== nodeId) {
          resetGraph(this.markedNodes);
        }

        function resetGraph(markedNodes) {
          lastClicked = nodeId;
          if (markedNodes.length > 0) {
            for (let n of markedNodes) {
              const nodeToUpdate = nodes.get(n);
              nodeToUpdate.color = colorBlue;
              nodes.update(nodeToUpdate);
            }
            markedNodes = [];
          }
        }

        function changeCommitColor(result, markedNodes) {
          const commitsList = result.split('\n');
          for (let c of commitsList) {
            const nodeToUpdate = nodes.get(c);
            if (nodeToUpdate) {
              nodeToUpdate.color = colorRed;
              nodes.update(nodeToUpdate);
              markedNodes.push(c);
            } else {
              break;
            }
          }
        }
      }.bind(this));
    });
  }

  loadGraph(graphData, commits, nodes, edges, loadedRows, loadedCommits) {
    this.resetGraphBeforeLoad(nodes);
    const dataList = graphData.split('\n');
    const checked = document.querySelector('input[name="' + this.uniqueId + '"]:checked');
    const loadCommits = checked ? parseInt(checked.value) : 50;
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

    if (dataList.length > i && loadedCommits > 0) {
      this.button.disabled = false;
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
