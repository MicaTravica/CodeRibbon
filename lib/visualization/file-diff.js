const {
  crdebug
} = require('../cr-base');

const fs = require('fs');
const path = require('path');
const {gitDiffByCommitAndFile, command} = require('./git-utils')

class FileDiff {

  static deserialize(state) {
    return new FileDiff(Object.assign(state));
  }

  constructor(params) {
    this.repository = params.repository;
    this.commit = params.commit;
    this.file = params.file;
    this.title = 'File changes - "' + this.file + '"';
    this.element = document.createElement('div');
    this.element.classList.add('content');
    this.loadFileWithChanges();
  }

  serialize() {
    return {deserializer: 'FileDiff', commit: this.commit, file: this.file, repository: this.repository};
  }

  getTitle() {
    return this.title;
  }

  getElement() {
    return this.element;
  }

  loadFileWithChanges() {
    command(gitDiffByCommitAndFile(this.commit, this.file), this.repository).then(result => {
      const numOfChangesStart = [];
      let changes = result;
      while (changes.includes('@@')) {
        changes = changes.substring(changes.indexOf('@@'));
        changes = changes.substring(changes.indexOf('+') + 1);
        let index = parseInt(changes.substring(0, changes.indexOf(',')));
        numOfChangesStart.push(index);
        changes = changes.substring(changes.indexOf('@@') + 2);
      }

      const fileLines = (fs.readFileSync(path.join(this.repository, this.file))).toString().split('\n');
      const fileChangesLines = result !== '' ? result.split('\n') : [];
      fileChangesLines.splice(0, 4);
      let lineNumberAdded = 1;
      let lineNumberDeleted = 1;
      let showChanges = false;
      let i = 0;
      let j = 0;
      let line;
      const table = document.createElement('table');
      table.classList.add('table-changes');
      this.element.appendChild(table);
      while (lineNumberAdded <= fileLines.length) {
        if (numOfChangesStart.includes(lineNumberAdded)) {
          showChanges = true;
          j++;
        }

        if (showChanges) {
          line = fileChangesLines[j];
          if (line === undefined || line === '' || line.startsWith('@@', 0)) {
            showChanges = false;
            line = ' ' + fileLines[i];
          } else {
            j++;
          }
        } else {
          line = ' ' + fileLines[i];
        }

        if (line[0] === '+') {
          table.innerHTML += '<tr><td class="row-number added">' + lineNumberAdded + '</td>' +
            '<td class="row-number added">&nbsp;</td>' +
            '<td class="line added">' + line + '</td></tr>';
          lineNumberAdded++;
          i++;
        } else if (line[0] === '-') {
          table.innerHTML += '<tr><td class="row-number deleted">&nbsp;</td>' +
            '<td class="row-number deleted">' + lineNumberDeleted + '</td>' +
            '<td class="line deleted">' + line + '</td></tr>';
          lineNumberDeleted++;
        } else {
          table.innerHTML += '<tr><td class="row-number">' + lineNumberAdded + '</td>' +
            '<td class="row-number">' + lineNumberDeleted + '</td>' +
            '<td class="line">' + line + '</td></tr>';
          lineNumberAdded++;
          lineNumberDeleted++;
          i++;
        }
      }
    })
  }
}

module.exports = FileDiff;