const {
  crdebug
} = require('./cr-base');

const vis = require('vis-network');

class NewItem {

  static deserialize(state) {
    return new NewItem(Object.assign(state));
  }

  constructor(params = {}) {
    // this.element = document.createElement('div');
    // this.message = document.createElement('span');
    // this.textNode = document.createTextNode(this.data);
    //
    // this.element.classList.add('your-package');
    // this.message.classList.add('your-package-message');
    //
    // this.message.appendChild(this.textNode);
    // this.element.appendChild(this.message);
    this.data = params.file !== undefined ? params.file : undefined;
    this.element = document.createElement('div');

    // create an array with nodes
    var nodes = new vis.DataSet([
      {
        id: 1, label: "Node 1", x: 0, y: 0,
        color: {
          border: '#CB4335',
          background: '#EC7063',
          highlight: {
            border: '#CB4335',
            background: '#F5B7B1'
          },
          hover: {
            border: '#CB4335',
            background: '#F5B7B1'
          }
        },
      },
      {id: 2, label: "Node 2", x: 100, y: 0},
      {id: 3, label: "Node 3", x: 200, y: 0},
      {id: 4, label: "Node 4", x: 300, y: 0},
      {id: 5, label: "Node 5", x: 0, y: 100},
      {id: 6, label: "Node 6", x: 100, y: 100},
      {id: 7, label: "Node 7", x: 200, y: 100},
      {id: 8, label: "Node 8", x: 300, y: 100},
      {id: 9, label: "Node 9", x: 0, y: 200},
      {id: 10, label: "Node 10", x: 100, y: 200},
      {id: 11, label: "Node 11", x: 200, y: 200},
      {id: 12, label: "Node 12", x: 300, y: 200},
    ]);

    // create an array with edges
    var edges = new vis.DataSet([
      {from: 1, to: 2},
      {from: 2, to: 3},
      {from: 3, to: 4},
      {from: 5, to: 6},
      {from: 6, to: 7},
      {from: 7, to: 8},
      {from: 9, to: 10},
      {from: 10, to: 11},
      {from: 11, to: 12},
      {from: 2, to: 7},
      {from: 6, to: 11},
    ]);

    nodes
    var data = {
      nodes: nodes,
      edges: edges,
    };
    var options = {
      interaction: {
        // da li da se dozvoli pomeranje cvorova
        dragNodes: false,
      }, physics: {
        barnesHut: {
          gravitationalConstant: 0,
          centralGravity: 0,
          springLength: 0,
          springConstant: 0,
          damping: 0,
          avoidOverlap: 0
        },
      }
    };
    new vis.Network(this.element, data, options);
  }

  serialize() {
    return {deserializer: 'NewItem', data: this.data};
  }

  getTitle() {
    return "New item"
  }

  getElement() {
    return this.element;
  }
  // nacin1() {
  //   command(gitLog).then(result => {
  //       fs.writeFile("C:\\Users\\travica\\Documents\\GitHub\\code-ribbon\\test", result, function (err) {
  //         return undefined
  //       });
  //       this.data = JSON.parse("[" + result.substring(0, result.length - 1) + "]");
  //       const nodesList = [];
  //       const edgesList = [];
  //       let parentToMoreThenOne = {};
  //       let parentToNonOrMerge = {};
  //       for (let i = this.data.length - 1; i > -1; i--) {
  //         const commit = this.data[i];
  //         parentToNonOrMerge[commit.commit] = {num: 0, merge: 0};
  //         if (commit.parent.length > 0) {
  //           const parents = commit.parent.split(" ");
  //
  //           if (parents.length === 1)
  //             parentToMoreThenOne[parents[0]] = parents[0] in parentToMoreThenOne ?
  //               parentToMoreThenOne[parents[0]] + 1 : 1;
  //
  //           if (parents.length > 0)
  //             for (let j = 0; j < parents.length; j++)
  //               parentToNonOrMerge[parents[j]].num = parentToNonOrMerge[parents[j]].num + 1;
  //
  //           if (parents.length > 1)
  //             for (let j = 0; j < parents.length; j++)
  //               parentToNonOrMerge[parents[j]].merge = parentToNonOrMerge[parents[j]].merge + 1;
  //
  //         }
  //       }
  //       parentToMoreThenOne = Object.keys(parentToMoreThenOne)
  //         .filter(key => parentToMoreThenOne[key] > 1)
  //         .reduce((obj, key) => {
  //           obj[key] = parentToMoreThenOne[key];
  //           return obj;
  //         }, {});
  //       parentToNonOrMerge = Object.keys(parentToNonOrMerge)
  //         .filter(key => parentToNonOrMerge[key].num < 1 ||
  //           (parentToNonOrMerge[key].num > 0 && parentToNonOrMerge[key].num === parentToNonOrMerge[key].merge))
  //         .reduce((obj, key) => {
  //           obj[key] = parentToNonOrMerge[key];
  //           return obj;
  //         }, {});
  //
  //       let x = 0;
  //       let ys = [0]
  //       let y = ys[0];
  //       for (let i = this.data.length - 1; i > -1; i--) {
  //         const commit = this.data[i];
  //         let createNewY = false;
  //         let removeY = false;
  //         if (i === this.data.length - 1) {
  //           nodesList.push({id: commit.commit, label: i.toString(), x, y});
  //           x += 250;
  //           continue;
  //         }
  //         if (commit.parent.length > 0) {
  //           const parents = commit.parent.split(" ");
  //           if (parents.length > 0) {
  //             for (let j = 0; j < parents.length; j++) {
  //               if (parents[j] in parentToMoreThenOne) {
  //                 createNewY = true;
  //               }
  //               edgesList.push({
  //                 from: parents[j], to: commit.commit, smooth: {
  //                   // type: "dynamic",
  //                   forceDirection: 'vertical'
  //                 },
  //               })
  //             }
  //           }
  //         } else {
  //           createNewY = true;
  //         }
  //         if (commit.commit in parentToNonOrMerge)
  //           removeY = true;
  //         if (createNewY) {
  //           for (let k = 700; ; k += 700) {
  //             if (!ys.includes(k)) {
  //               ys.push(k);
  //               break;
  //             }
  //             // if (!ys.includes(-k)) {
  //             //   ys.push(-k);
  //             //   break;
  //             // }
  //           }
  //           y = ys[ys.length - 1]
  //         }
  //
  //         nodesList.push({id: commit.commit, label: i.toString(), x, y})
  //         x += 250;
  //         if (removeY) {
  //           ys.pop()
  //           y = ys[ys.length - 1]
  //         }
  //       }
  //       this.nodes = new vis.DataSet(nodesList);
  //       this.edges = new vis.DataSet(edgesList);
  //
  //       var options = {
  //         // interaction: {
  //         //   // da li da se dozvoli pomeranje cvorova
  //         //   dragNodes: false,
  //         // }, physics: {
  //         //   barnesHut: {
  //         //     gravitationalConstant: 0,
  //         //     centralGravity: 0,
  //         //     springLength: 0,
  //         //     springConstant: 0,
  //         //     damping: 0,
  //         //     avoidOverlap: 0
  //         //   },
  //         // }
  //       };
  //       new vis.Network(document.getElementById("network"), {nodes: this.nodes, edges: this.edges}, options);
  //     }
  //   );
  // }
}

module.exports = NewItem;