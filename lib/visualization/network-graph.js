const {
  crdebug
} = require('../cr-base');

const path = require('path');
const vis = require('vis-network');

const {newCommitFromList} = require('./commit');
const {colorBlue, colorRed, colorYellow, options} = require('./graph-utils');
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
    command(gitLogGraph, this.repository).then(result => {
        const dataList = result.split('\n');

        const commits = {};
        const nodesList = [];
        const edgesList = [];
        let x = 0;

        for (let i = dataList.length - 1; i > -1; i--) {
          const row = dataList[i];
          const index = row.indexOf(separator);
          if (index !== -1) {
            const commit = newCommitFromList(row.substring(index + 3).split(separator));
            commits[commit.commitHash] = commit;
            const y = 200 * row.indexOf('*') / 2;
            nodesList.push({id: commit.commitHash, x: x, y: y});
            for (let j = 0; j < commit.parents.length; j++)
              edgesList.push({from: commit.commitHash, to: commit.parents[j], width: 3})
            if (commit.gitRef.length > 0) {
              nodesList.push({
                id: commit.gitRef,
                label: commit.gitRef,
                shape: 'box',
                color: colorRed,
                widthConstraint: {
                  minimum: 135,
                  maximum: 135
                },
                x: x,
                y: y + 100,
              });
              edgesList.push({
                arrows: 'to',
                from: commit.gitRef,
                to: commit.commitHash,
                width: 5
              })
            }
            x += 150;
          }
        }

        const nodes = new vis.DataSet(nodesList);
        const edges = new vis.DataSet(edgesList);

        const data = {nodes, edges};

        const network = new vis.Network(this.element, data, options);

        network.on('hoverNode', function ({node}) {
          const coordinates = network.getPositions(node)[node];
          if ((coordinates.y / 100 % 2) === 0) {
            const commit = commits[node];
            nodes.add({
              id: 1,
              label:
                'Abbreviated commit hash: ' + commit.abbreviatedHash +
                '\nAuthor name: ' + commit.authorName +
                '\nSummary: ' + commit.summary +
                '\nDate: ' + commit.date,
              shape: 'box',
              color: colorYellow,
              font: {
                align: 'left'
              },
              widthConstraint: {
                minimum: 250,
                maximum: 250
              },
              x: coordinates.x + 150,
              y: coordinates.y - 100
            });
          }
        });

        network.on('blurNode', function () {
          nodes.remove(1);
        });

        let markedNodes = [];
        let lastClickedRef;
        network.on('click', function (params) {

          const nodeId = params['nodes'][0];
          if (nodeId) {
            const coordinates = network.getPositions(nodeId)[nodeId];
            // ako je komit
            // todo
            if ((coordinates.y / 100 % 2) === 0) {
              //ako je ref
            } else if (lastClickedRef !== nodeId) {
              resetGraph();
              command(gitLogByBranch(nodeId.split(', ')[0]), this.repository).then(result => {
                const commitsList = result.split('\n');
                for (let c of commitsList) {
                  const nodeToUpdate = nodes.get(c);
                  nodeToUpdate.color = colorRed;
                  nodes.update(nodeToUpdate);
                  markedNodes.push(c);
                }
              })
            }
          } else if (lastClickedRef !== nodeId) {
            resetGraph();
          }

          function resetGraph () {
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
      }
    );
  }
}


module.exports = NetworkGraph;