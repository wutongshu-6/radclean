const API = {
  base: '/api',

  async get(path) {
    const res = await fetch(`${this.base}${path}`);
    if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
    return res.json();
  },

  async post(path, body) {
    const res = await fetch(`${this.base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
    return res.json();
  },

  async postForm(path, formData) {
    const res = await fetch(`${this.base}${path}`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
    return res.json();
  },

  async getDemoOverview() {
    return this.get('/demo/overview');
  },

  async getDemoData(dataset, mode) {
    var url = `/demo/${dataset}`;
    if (mode) url += '?mode=' + mode;
    return this.get(url);
  },

  async getTerminology(type, query) {
    const params = new URLSearchParams();
    if (type) params.set('type', type);
    if (query) params.set('q', query);
    return this.get(`/terminology?${params}`);
  },

  async runPipeline(agent, files, cleaningMode, useLLM) {
    var fd = new FormData();
    fd.set('agent', agent);
    fd.set('cleaning_mode', cleaningMode || 'analysis');
    if (useLLM) fd.set('use_llm', 'true');
    if (files && files.length > 0) {
      for (var i = 0; i < files.length; i++) {
        fd.append('files', files[i]);
      }
      console.log('[API.runPipeline] sending ' + files.length + ' file(s): ' + files.map(function(f){return f.name + ' (' + f.size + ' bytes)';}).join(', '));
    } else {
      console.log('[API.runPipeline] WARNING: no files provided, backend will use fallback');
    }
    return this.postForm('/pipeline/run', fd);
  },

  async runLLM() {
    return this.post('/pipeline/agent2/llm');
  },

  streamLLM(onStatus, onChunk, onResult, onError, onDone) {
    this._readSSE(this.base + '/pipeline/agent2/llm/stream', null, onStatus, onChunk, onResult, onError, onDone);
  },

  streamLLMFromAnnotations(annotations, onStatus, onChunk, onResult, onError, onDone) {
    this._readSSE(
      this.base + '/pipeline/agent2/llm/stream',
      { annotations: annotations },
      onStatus, onChunk, onResult, onError, onDone
    );
  },

  // Shared SSE stream reader — GET when body is null, POST with JSON when body is set
  _readSSE(url, body, onStatus, onChunk, onResult, onError, onDone) {
    var fetchOpts = body
      ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
      : {};
    fetch(url, fetchOpts).then(function(response) {
      if (!response.ok) throw new Error('Stream failed: ' + response.status);
      var reader = response.body.getReader();
      var decoder = new TextDecoder();
      var buffer = '';

      function pump() {
        reader.read().then(function(result) {
          if (result.done) return;
          buffer += decoder.decode(result.value, { stream: true });
          var lines = buffer.split('\n');
          buffer = lines.pop() || '';
          var event = null;
          for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            if (line.indexOf('event: ') === 0) {
              event = line.slice(7);
            } else if (line.indexOf('data: ') === 0 && event) {
              try {
                var data = JSON.parse(line.slice(6));
                if (event === 'status') onStatus(data);
                else if (event === 'chunk') onChunk(data);
                else if (event === 'result') onResult(data);
                else if (event === 'error') onError(data);
                else if (event === 'done') { onDone(data); return; }
              } catch(ex) { console.error('SSE parse error:', ex); }
              event = null;
            }
          }
          pump();
        }).catch(function(e) {
          onError({ error: e.message });
        });
      }
      pump();
    }).catch(function(e) {
      onError({ error: e.message });
    });
  },

  exportResults() {
    // Direct download — browser streams the file natively without buffering in JS memory
    var a = document.createElement('a');
    a.href = this.base + '/pipeline/export';
    a.download = 'radclean_governed_data.zip';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
};
