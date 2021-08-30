const colorBlue = {
  border: '#2B7CE9',
  background: '#97C2FC',
  highlight: {
    border: '#2B7CE9',
    background: '#D2E5FF'
  },
  hover: {
    border: '#2B7CE9',
    background: '#D2E5FF'
  }
};

const colorRed = {
  border: '#CB4335',
  background: '#EC7063',
  highlight: {
    border: '#CB4335',
    background: '#F5B7B1'
  }, hover: {
    border: '#CB4335',
    background: '#F5B7B1'
  }
};

const colorYellow = {
  border: '#FFD300',
  background: '#FFD300',
};

const options = {
  interaction: {
    hover: true,
    dragNodes: false,
  },
  physics: {
    barnesHut: {
      gravitationalConstant: 0,
      centralGravity: 0,
      springLength: 0,
      springConstant: 0,
      damping: 0,
      avoidOverlap: 0
    },
  },
};

module.exports = {colorBlue, colorRed, colorYellow, options}