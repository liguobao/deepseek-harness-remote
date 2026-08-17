const zhCN = {
  common: {
    back: '返回', retry: '重试', close: '关闭', cancel: '取消', refresh: '刷新', delete: '删除', unavailable: '不可用', unknown: '未知',
  },
  app: {
    oauthCancelled: '知乎授权未完成，请重试。', oauthInvalid: '知乎授权返回了无效会话，请重新登录。',
    loadingIdentity: '正在加载安全设备身份…', bootFailed: '无法启动 DSH Remote', secureStorageUnavailable: '安全存储当前不可用。',
    deviceUnavailable: '设备不可用', deviceNoLongerTrusted: '该设备已不在可信设备列表中。', backToDevices: '返回设备',
  },
  status: { online: '在线', offline: '离线', lan: 'LAN 直连', relay: 'Relay', p2p: 'P2P 直连', turn: 'TURN', waiting: '连接中', running: '运行中' },
  setup: {
    title: '登录', signIn: '登录账号', signInAgain: '重新登录', lead: '授权此手机后，即可查看同一账号下的设备并继续对话。',
    oauth: '授权登录', passwordMethod: '账号密码', zhihu: '使用知乎账号授权', oauthHint: '将在浏览器中完成授权，成功后自动返回 App。',
    email: '邮箱', emailPlaceholder: '请输入登录邮箱', password: '密码', passwordPlaceholder: '请输入账号密码', passwordHint: '密码仅用于本次 HTTPS 登录，不会保存在设备上。',
    server: '服务地址', serverHint: '公网服务必须使用 HTTPS。', trustTitle: '端到端设备信任', trustBody: '服务器只转发加密数据，不会获得此手机的私钥。设备仍需通过同一账号授权。',
  },
  settings: {
    title: '设置', thisPhone: '此手机', androidDevice: 'Android 设备', connection: '连接', server: '服务器', account: '账号', loginMethod: '登录方式', protocol: '协议', notConfigured: '未配置', notSignedIn: '未登录',
    transport: '传输方式', transportNote: '修改后会重新连接当前设备；无法直连时始终可以回退到服务器中继。', identity: '设备身份', deviceId: '设备 ID', publicKey: '公钥', keyNote: '私钥由 Android Keystore 加密保存，永远不会离开此手机。',
    signOut: '退出登录', resetLocal: '重置本地数据', resetTitle: '重置 DSH Remote？', resetBody: '这会移除此手机上的服务器配置、设备身份和所有可信设备。之后需要重新登录。', reset: '重置', signOutTitle: '退出登录？', signOutBody: '此手机将从账号中退出，需要重新授权后才能访问设备。',
  },
  devices: {
    title: '设备', myDevices: '我的设备', lead: '选择一台设备开始或继续对话', emptyTitle: '还没有可用设备', emptyBody: '在电脑上安装 DSH Remote 插件，并登录同一账号，设备就会出现在这里。', canConnect: '可以连接', options: '设备选项', encrypted: '已加密',
    connectionInterrupted: '连接已中断', trustExplanation: '确认后会在此手机上固定设备加密密钥，后续任何密钥变更都会被阻止。', trust: '信任此设备', connectReady: '安全连接后即可查看并继续设备上的对话。', offlineHelp: '设备当前离线，请确认电脑上的 Remote 插件正在运行。', secureConnect: '安全连接',
    info: '设备信息', directory: '目录', model: '模型', workspaces: '工作区', conversations: '对话', secureConnection: '安全连接', path: '链路', encryption: '加密', viewWorkspaces: '查看工作区与对话', unknownVersion: '未知版本',
    forgetTitle: (name: string) => `忘记 ${name}？`, forgetBody: '这会移除此手机保存的可信身份。以后重新连接时，需要再次确认设备。', forget: '忘记设备',
  },
  sessions: { title: '对话', new: '新建对话', deviceTitle: '设备上的对话', lead: '继续上次未完成的工作', creating: '正在创建对话…', emptyTitle: '还没有对话', emptyBody: '新建一个对话，或先在电脑上的 Harness 中开始工作。', archived: (count: number) => `已归档（${count}）`, continue: '继续对话', untitled: '新对话', child: '子代理对话' },
  time: { unavailable: '更新时间不可用', lastSeenUnavailable: '最近在线时间不可用', justNow: '刚刚更新', minutesAgo: (n: number) => `${n} 分钟前`, hoursAgo: (n: number) => `${n} 小时前`, updatedSuffix: '更新', locale: 'zh-CN' },
  transport: { auto: '自动', autoDescription: '优先尝试 P2P 和 TURN，失败后使用中继', turn: 'TURN 优先', turnDescription: '优先通过 TURN 连接，失败后使用中继', relay: '仅中继', relayDescription: '始终使用服务器中继通道' },
  workspaces: {
    title: '工作区', create: '创建工作区', deviceTitle: '设备工作区', lead: '按设备目录组织对话', emptyTitle: '还没有工作区', emptyBody: '创建工作区，按设备上的项目目录组织对话。', options: '工作区选项', noSessions: '暂无对话，点击新建', unnamedSession: '未命名对话',
    deleteTitle: (title: string) => `删除 ${title}？`, deleteBody: '工作区及其中的对话将从设备上删除。', rename: '重命名', moveUp: '上移', moveDown: '下移', newSessionIn: (title: string) => `在 ${title} 中新建对话`, deviceDirectory: '设备上的目录', browse: '浏览', directoryHint: '在这里创建的对话会归入该设备目录。', renameTitle: '重命名工作区', namePlaceholder: '工作区名称', saveName: '保存名称', chooseFolder: '选择文件夹', loading: '正在加载…', loadingDirectory: '正在加载目录…', noFolders: '这里没有文件夹', showHidden: '显示隐藏项', hideHidden: '隐藏隐藏项', chooseThisFolder: '选择此文件夹',
  },
  chat: {
    fullAccessTitle: '确认启用 Full access？', fullAccessBody: '开启后，Harness 可以直接修改文件、运行命令和执行更多敏感操作。请仅在信任当前任务时开启。', enable: '启用', stop: '停止生成', selectModel: '选择模型', approvalMode: '审批模式', approvalModeLabel: (name: string) => `审批模式：${name}`, reconnecting: '正在重新连接设备…', offline: '设备连接已离线，暂时无法发送消息。',
    older: '加载更早消息', messageLabel: '发送给 DeepSeek Harness 的消息', placeholder: '给 DSH 发消息…', send: '发送消息', policyHint: '所有操作仍遵循设备端 Harness 的权限策略。', you: '你', system: '系统', generating: '正在生成回复', failed: '失败', completed: '已完成', denied: '操作未允许', allowedOnce: '已允许一次', permissionTitle: '需要你的授权', permissionScope: '“仅允许一次”只对当前请求生效，且不会绕过设备端策略。', allowOnce: '仅允许一次', deny: '拒绝', answered: '已回答问题', questionCancelled: '已取消问题', questionTitle: 'DSH 需要确认', answerToContinue: '回答后继续', submitAnswer: '提交回答', welcomeTitle: '继续这段对话', welcomeBody: '告诉 DSH 你想检查、解释或修改什么。工具调用和授权请求会直接显示在对话中。',
  },
  validation: { serverRequired: '请输入 DSH Remote 服务器地址。', serverInvalid: '请输入有效的服务器地址，例如 https://remote.example.com。', httpsRequired: '请使用 HTTPS。仅本地开发允许使用普通 HTTP。', serverPartsForbidden: '服务器地址不能包含凭据、查询参数或片段。' },
  runtime: {
    identityNotReady: 'Android 设备身份尚未就绪。', zhihuUnsupported: '此服务器不支持知乎授权登录。', hostClosed: '主机连接已关闭。', openSessionFirst: '请先打开对话，再回应主机请求。', networkUnavailable: '网络当前不可用。',
  },
  errors: {
    ACCOUNT_AUTH_REQUIRED: '请登录服务器账号以授权此手机。', AUTH_INVALID: '手机无法通过服务器身份验证，请重新登录。', AUTH_REQUIRED: '服务器要求此手机重新进行身份验证。', TOKEN_EXPIRED: '手机会话已过期，请重新登录。', TOKEN_REUSED: '旧刷新令牌被重复使用，服务器已撤销此设备会话。请重新登录。', DEVICE_NOT_FOUND: '此设备已不在服务器上注册。', DEVICE_REVOKED: '此手机已无权访问该账号。', DEVICE_OWNERSHIP_REQUIRED: '服务器已不再将此手机识别为账号所属设备，请重新登录。', MEMBERSHIP_REQUIRED: '此手机已无权访问该主机。', HOST_OFFLINE: '主机已离线，请确认 DeepSeek Harness 和 Remote 插件正在运行。', DEVICE_OFFLINE: '主机已离线，请确认 DeepSeek Harness 和 Remote 插件正在运行。', PEER_IDENTITY_MISMATCH: '主机身份密钥已变更，请重新信任后再连接。', RATE_LIMITED: '请求过于频繁，请稍后重试。', CONNECTION_FAILED: '无法连接主机，请检查网络后重试。', P2P_FAILED: '直连失败，正在切换到安全中继。', RELAY_UNAVAILABLE: '加密中继当前不可用，请稍后重试。', TURN_UNAVAILABLE: '中继服务器当前不可用，请稍后重试。', SECURE_CHANNEL_FAILED: '无法建立加密通道。', RPC_TIMEOUT: '主机未及时响应，请重试。', UNSUPPORTED_VERSION: '服务器需要其他版本的 DSH Remote。', METHOD_NOT_ALLOWED: '主机不允许远程手机执行此操作。', PERMISSION_NOT_PENDING: '该请求已被回答或已过期。', SESSION_NOT_FOUND: '该对话已不存在于主机。', HARNESS_UNAVAILABLE: '主机上的 DeepSeek Harness 当前不可用。', AGENT_BUSY: '主机正忙于其他操作，请稍后重试。', FULL_RESYNC_REQUIRED: '主机上的对话已变更，请重新打开此对话。',
    serverUnreachable: '无法连接服务器，请检查地址和网络。', unknown: '出现问题，请重试。',
  },
} as const

export default zhCN
