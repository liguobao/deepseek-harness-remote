window.__ModuleLoader__.load({
  id: '@deepseek-ai/dsh-client-connection',
  factory: () => {
    const pending = new Map()
    let sequence = 0
    const callBridge = (type, body) => new Promise((resolve, reject) => {
      const requestId = `vscode-${++sequence}`
      pending.set(requestId, { resolve, reject })
      window.__DSH_VSCODE__.postMessage({ type, requestId, ...body })
    })
    window.addEventListener('message', event => {
      const message = event.data
      if (message?.type !== 'harnessBridgeResult' || typeof message.requestId !== 'string') return
      const request = pending.get(message.requestId)
      if (!request) return
      pending.delete(message.requestId)
      if (message.ok) request.resolve(message.value)
      else request.reject(new Error(message.error || 'VS Code ApiProxy bridge failed'))
    })
    const method = (name) => async payload => {
      const rpcId = crypto.randomUUID()
      try {
        const value = await callBridge('harnessApiCall', { method: name, payload })
        return { type: 'server-response', rpcId, result: { ok: true, value } }
      } catch (error) {
        return { type: 'server-response', rpcId, result: { ok: false, error: { code: 'TRANSPORT', message: error instanceof Error ? error.message : String(error) } } }
      }
    }
    const api = {
      sessions: {}, subagents: {}, host: {}, workspace: {}, skills: {}, agentPresets: {}, goals: {}, settings: {}, credentials: {}, llm: {}, events: {},
      respond: async message => { await callBridge('harnessRespond', { message }); return { accepted: true } },
    }
    const domains = {
      sessions: ['list', 'search', 'create', 'history', 'models', 'selectModel', 'rename', 'fork', 'prompt', 'attachment', 'updateQueue', 'cancel'],
      subagents: ['list', 'history', 'prompt', 'interrupt'], host: ['describe', 'pickDirectory', 'listDirectory', 'createDirectory', 'openPath'],
      workspace: ['list', 'create', 'rename', 'delete', 'insertBefore', 'insertSessionBefore', 'archiveSession'], skills: ['list'],
      agentPresets: ['list', 'select', 'read', 'copy', 'openDocument', 'remove'], goals: ['create', 'edit', 'pause', 'resume', 'complete', 'clear'],
      settings: ['describe', 'openDocument', 'update', 'replace', 'mutate'], credentials: ['describe', 'set', 'unset'],
      llm: ['providers', 'models', 'discoverModels'],
    }
    for (const [domain, names] of Object.entries(domains)) for (const name of names) api[domain][name] = method(`${domain === 'sessions' ? 'session' : domain === 'subagents' ? 'subagent' : domain === 'skills' ? 'skill' : domain === 'agentPresets' ? 'agentPreset' : domain}.${name}`)
    const connection = {
      api,
      isLoopback: false,
      hostDescription: { getSnapshot: () => window.__DSH_HOST__, subscribe: () => () => {} },
      rpc: { call: async (_channel, endpoint, payload) => {
        try { return { ok: true, value: await callBridge('harnessApiCall', { method: endpoint.replaceAll('/', '.'), payload: payload?.args ?? payload }) } }
        catch (error) { return { ok: false, error: { code: 'TRANSPORT', message: error instanceof Error ? error.message : String(error) } } }
      } },
      start: sinks => {
        const receive = event => { if (event.data?.type === 'harnessFrame') sinks.onMuxEnvelope?.(event.data.frame) }
        window.addEventListener('message', receive)
        queueMicrotask(() => { sinks.onStateChange?.('connected'); sinks.onConnected?.(window.__DSH_HOST__) })
        return { stop: () => window.removeEventListener('message', receive) }
      },
    }
    return { inject: [], apply: ctx => { ctx.reflect.provide('connection', connection) } }
  },
})
