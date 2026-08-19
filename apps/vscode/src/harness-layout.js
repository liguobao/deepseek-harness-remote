window.__ModuleLoader__.load({
  id: '@deepseek-ai/dsh-client-ui-layout',
  factory: require => {
    const React = require('react')
    function Frame({ renderSlot }) { return React.createElement(React.Fragment, null, renderSlot('conversation', {})) }
    return {
      inject: ['slots', 'sessions'],
      apply: ctx => {
        ctx.reflect.provide('layout', { openDetails() {}, closeDetails() {}, getSnapshot: () => ({}), subscribe: () => () => {} })
        ctx.slots.register({ name: 'root', children: {
          conversation: { kind: 'single', scope: 'session-maybe' },
          details: { kind: 'single', scope: 'session' },
        } }, Frame)
        const openTarget = () => {
          const state = ctx.sessions.list.getSnapshot()
          if (state.byId[window.__DSH_SESSION_ID__]) ctx.sessions.open(window.__DSH_SESSION_ID__)
        }
        openTarget()
        ctx.effect(() => ctx.sessions.list.subscribe(openTarget), 'vscode: select requested session')
      },
    }
  },
})
