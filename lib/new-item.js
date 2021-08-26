const {
  crdebug
} = require('./cr-base');

class NewItem {

  static deserialize(state) {
    return new NewItem(Object.assign(state));
  }

  constructor(params = {}) {
    this.data = params.data !== undefined ? params.data : "Item";
    this.element = document.createElement('div');
    this.message = document.createElement('span');
    this.textNode = document.createTextNode(this.data);

    this.element.classList.add('your-package');
    this.message.classList.add('your-package-message');

    this.message.appendChild(this.textNode);
    this.element.appendChild(this.message);
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
}

module.exports = NewItem;