const {
  crdebug
} = require('../cr-base');

const vis = require('vis-network');

const {colorBlue, colorRed, colorYellow, options} = require('./graph-utils');

class FilesGraph {

  static deserialize(state) {
    return new FilesGraph(Object.assign(state));
  }

  constructor(params = {}) {
    this.title = 'Files';
    this.element = document.createElement('div');
  }

  serialize() {
    return {deserializer: 'FilesGraph'};
  }

  getTitle() {
    return this.title;
  }

  getElement() {
    return this.element;
  }

}


module.exports = FilesGraph;