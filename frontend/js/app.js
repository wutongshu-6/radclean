const App = {
  state: {
    dataSource: 'demo',
    pipelineStatus: 'idle',
    currentAgent: null,
    demoData: null,
    pipelineResults: null,
    autoDemo: false,
  },

  setState(key, value) {
    this.state[key] = value;
  }
};
