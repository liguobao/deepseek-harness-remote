"use strict";
(() => {
  // src/client.ts
  var clientModuleId = "dsh-remote", localeNamespace = "dsh-remote", en = {
    pluginTitle: "DeepSeek Remote",
    pluginDescription: "Connect once. Available anytime.",
    expandSettings: "Show settings: {name}",
    collapseSettings: "Hide settings: {name}",
    unsaved: "Unsaved",
    associated: "Authorized",
    authorizationComplete: "Authorization complete",
    loadingSettings: "Loading DeepSeek Remote settings\u2026",
    mode: "Mode",
    pluginMode: "Plugin mode",
    host: "Host",
    client: "Client",
    authorization: "Authorization",
    account: "Account",
    hostRegistrationCode: "One-time device authorization code",
    ownedDeviceAuthorization: "Owned device",
    authorizedOn: "{role} is authorized on {serverUrl}.",
    readOnly: "This DSH profile does not provide writable user settings.",
    discard: "Discard",
    save: "Save",
    saving: "Saving\u2026",
    signOut: "Sign out",
    signingOut: "Signing out\u2026",
    serverUrl: "Server URL",
    serverUrlHint: "HTTPS origin used for account authorization and encrypted relay.",
    authorizationMethod: "Authorization method",
    accountPassword: "Account password",
    registrationCode: "Device authorization code",
    registrationCodeHint: "Generate it after signing in on the Server website. Use it once to connect this device.",
    accountHint: "The account must belong to the selected Server.",
    password: "Password",
    passwordHint: "Used only for this HTTPS authorization request and never saved.",
    modeSavedNeedsAuthorization: "Mode saved. Authorize {role} before connecting. Existing registrations were kept.",
    modeSavedReused: "Mode saved. Existing registration reused. Restart Harness to apply.",
    modeSavedOwnedRole: "Mode saved. This owned device was authorized automatically. Restart Harness to apply.",
    enterRegistrationCode: "Enter the device authorization code.",
    enterAccountPassword: "Enter the Server account and password.",
    associationSaved: "Associated. Restart Harness to apply.",
    signedOut: "Signed out. Restart Harness to disconnect this mode.",
    remoteRequestFailed: "Remote mode request failed.",
    switchTarget: "Switch Local / Remote Harness target",
    harnessTarget: "Harness target",
    close: "Close",
    local: "Local",
    remoteTarget: "Remote \xB7 {name}",
    thisMachineLocal: "This machine (Local)",
    noRemoteHosts: "No authorized remote Host for this account.",
    online: "Online",
    offline: "Offline",
    thisMachineHost: "This machine as Remote Host",
    connected: "Connected",
    connectedAs: "Connected as {account}",
    connection: "Connection",
    checkingConnection: "Checking connection\u2026",
    connecting: "Connecting",
    reconnecting: "Reconnecting",
    lastActive: "Last active: {time}",
    neverConnected: "No successful connection yet.",
    reconnect: "Reconnect",
    reconnectingAction: "Reconnecting\u2026",
    reconnectStarted: "Reconnect requested.",
    connectionAuthorizationExpired: "Authorization expired. Sign out and authorize this Host again.",
    connectionDeviceRevoked: "This Host was revoked on the Server. Sign out and authorize it again.",
    connectionOwnershipRequired: "The Server no longer recognizes this Host as an owned device.",
    connectionRateLimited: "The Server is receiving too many requests. Automatic retry will continue.",
    connectionVersionMismatch: "The Plugin and Server protocol versions are incompatible.",
    connectionInvalidResponse: "The Server returned an invalid control message.",
    connectionReachability: "Cannot reach the Server. Check the network and Server address.",
    connectionUnexpected: "The connection stopped unexpectedly. Automatic retry will continue.",
    hostSignInHint: "Sign in to authorize this Host on the selected Server.",
    checkingHost: "Checking Host registration\u2026",
    hostUnavailable: "Host unavailable: {error}",
    serverAccountEmail: "Server account email",
    serverAccountPassword: "Server account password",
    signInRegisterHost: "Sign in and register Host",
    signingIn: "Signing in\u2026",
    useRegistrationCode: "Use connection code",
    registering: "Registering\u2026",
    remoteEntry: "Remote",
    remoteTitle: "Open a remote workspace",
    remoteDescription: "Choose one of your Hosts, then select a working directory. The Harness interface stays on this device.",
    chooseHost: "Host",
    chooseDirectory: "Working directory",
    selectHostHint: "Select an online Host to browse its directories.",
    emptyDirectory: "This directory has no visible subdirectories.",
    openWorkspace: "Open workspace",
    openingWorkspace: "Opening\u2026",
    loadingDirectory: "Loading directories\u2026",
    backToHosts: "Choose another Host",
    currentDirectory: "Selected directory",
    directoryTruncated: "Only part of this directory could be shown.",
    existingWorkspaces: "Existing workspaces",
    remotePathPlaceholder: "/home/user/project",
    remotePathHint: "Enter an absolute directory path on the selected Host.",
    noRemoteWorkspaces: "No remote workspaces yet. Use + to add one.",
    activeRemote: "{name}",
    exitRemote: "Exit",
    addRemoteWorkspace: "Add remote workspace",
    remoteModeLabel: "Remote mode \xB7 {name}",
    remoteNetworkP2p: "P2P",
    remoteNetworkTurn: "TURN",
    remoteNetworkRelay: "Relay",
    remoteNetworkLan: "LAN",
    remoteNetworkOffline: "Disconnected",
    remoteLinkEncrypted: "End-to-end encrypted",
    connectionRouteTitle: "Connection route",
    connectionRouteFrom: "From",
    connectionRouteVia: "Via",
    connectionRouteTo: "To",
    connectionRouteCurrentDevice: "This device",
    connectionRouteLan: "Local network",
    connectionRouteP2p: "Direct internet path",
    connectionRouteTurn: "TURN relay service",
    connectionRouteRelay: "Remote Server",
    connectionRouteHost: "Work computer running Harness",
    connectionRouteEncrypted: "Application data remains end-to-end encrypted along this route.",
    openLocalWorkspaces: "Open local workspaces",
    clientSignInHint: "Sign in to this Server to list your remote Hosts.",
    signInClient: "Sign in to Remote"
  }, zh = {
    pluginTitle: "DeepSeek \u8FDC\u7A0B\u8FDE\u63A5",
    pluginDescription: "\u4E00\u6B21\u8FDE\u63A5\uFF0C\u968F\u65F6\u53EF\u7528\u3002",
    expandSettings: "\u5C55\u5F00\u8BBE\u7F6E\uFF1A{name}",
    collapseSettings: "\u6536\u8D77\u8BBE\u7F6E\uFF1A{name}",
    unsaved: "\u672A\u4FDD\u5B58",
    associated: "\u5DF2\u6388\u6743",
    authorizationComplete: "\u5DF2\u5B8C\u6210\u6388\u6743",
    loadingSettings: "\u6B63\u5728\u52A0\u8F7D DeepSeek \u8FDC\u7A0B\u8FDE\u63A5\u8BBE\u7F6E\u2026",
    mode: "\u6A21\u5F0F",
    pluginMode: "\u63D2\u4EF6\u6A21\u5F0F",
    host: "\u4E3B\u673A",
    client: "Client",
    authorization: "\u6388\u6743",
    account: "\u8D26\u53F7",
    hostRegistrationCode: "\u4E00\u6B21\u6027\u8BBE\u5907\u6388\u6743\u7801",
    ownedDeviceAuthorization: "\u81EA\u6709\u8BBE\u5907",
    authorizedOn: "{role}\u5DF2\u7ECF\u5728 {serverUrl} \u5B8C\u6210\u6388\u6743\u3002",
    readOnly: "\u6B64 DSH profile \u4E0D\u63D0\u4F9B\u53EF\u5199\u7684\u7528\u6237\u8BBE\u7F6E\u3002",
    discard: "\u653E\u5F03\u4FEE\u6539",
    save: "\u4FDD\u5B58",
    saving: "\u4FDD\u5B58\u4E2D\u2026",
    signOut: "\u9000\u51FA\u6388\u6743",
    signingOut: "\u6B63\u5728\u9000\u51FA\u2026",
    serverUrl: "Server \u5730\u5740",
    serverUrlHint: "\u7528\u4E8E\u8D26\u53F7\u6388\u6743\u548C\u52A0\u5BC6\u4E2D\u7EE7\u7684 HTTPS \u5730\u5740\u3002",
    authorizationMethod: "\u6388\u6743\u65B9\u5F0F",
    accountPassword: "\u8D26\u53F7\u5BC6\u7801",
    registrationCode: "\u8BBE\u5907\u6388\u6743\u7801",
    registrationCodeHint: "\u767B\u5F55 Server \u7F51\u9875\u540E\u751F\u6210\uFF0C\u7528\u4E00\u6B21\u5373\u53EF\u8FDE\u63A5\u8FD9\u53F0\u8BBE\u5907\u3002",
    accountHint: "\u8D26\u53F7\u5FC5\u987B\u5C5E\u4E8E\u6240\u9009 Server\u3002",
    password: "\u5BC6\u7801",
    passwordHint: "\u4EC5\u7528\u4E8E\u672C\u6B21 HTTPS \u6388\u6743\u8BF7\u6C42\uFF0C\u4E0D\u4F1A\u4FDD\u5B58\u3002",
    modeSavedNeedsAuthorization: "\u6A21\u5F0F\u5DF2\u4FDD\u5B58\u3002\u8FDE\u63A5\u524D\u8BF7\u5148\u6388\u6743 {role}\uFF1B\u5DF2\u6709\u6CE8\u518C\u4FE1\u606F\u5DF2\u4FDD\u7559\u3002",
    modeSavedReused: "\u6A21\u5F0F\u5DF2\u4FDD\u5B58\u5E76\u590D\u7528\u5DF2\u6709\u6CE8\u518C\u4FE1\u606F\u3002\u91CD\u542F Harness \u540E\u751F\u6548\u3002",
    modeSavedOwnedRole: "\u6A21\u5F0F\u5DF2\u4FDD\u5B58\uFF0C\u5E76\u5DF2\u81EA\u52A8\u6388\u6743\u6B64\u81EA\u6709\u8BBE\u5907\u3002\u91CD\u542F Harness \u540E\u751F\u6548\u3002",
    enterRegistrationCode: "\u8BF7\u8F93\u5165\u8BBE\u5907\u6388\u6743\u7801\u3002",
    enterAccountPassword: "\u8BF7\u8F93\u5165 Server \u8D26\u53F7\u548C\u5BC6\u7801\u3002",
    associationSaved: "\u5173\u8054\u6210\u529F\u3002\u91CD\u542F Harness \u540E\u751F\u6548\u3002",
    signedOut: "\u5DF2\u9000\u51FA\u6388\u6743\u3002\u91CD\u542F Harness \u540E\u5C06\u65AD\u5F00\u6B64\u6A21\u5F0F\u3002",
    remoteRequestFailed: "\u8FDC\u7A0B\u6A21\u5F0F\u8BF7\u6C42\u5931\u8D25\u3002",
    switchTarget: "\u5207\u6362\u672C\u5730\u6216\u8FDC\u7A0B Harness",
    harnessTarget: "Harness \u76EE\u6807",
    close: "\u5173\u95ED",
    local: "\u672C\u5730",
    remoteTarget: "\u8FDC\u7A0B \xB7 {name}",
    thisMachineLocal: "\u6B64\u8BBE\u5907\uFF08\u672C\u5730\uFF09",
    noRemoteHosts: "\u6B64\u8D26\u53F7\u6CA1\u6709\u5DF2\u6388\u6743\u7684\u8FDC\u7A0B Host\u3002",
    online: "\u5728\u7EBF",
    offline: "\u79BB\u7EBF",
    thisMachineHost: "\u5C06\u6B64\u8BBE\u5907\u4F5C\u4E3A\u8FDC\u7A0B Host",
    connected: "\u5DF2\u8FDE\u63A5",
    connectedAs: "\u5DF2\u4F7F\u7528 {account} \u8FDE\u63A5",
    connection: "\u8FDE\u63A5\u72B6\u6001",
    checkingConnection: "\u6B63\u5728\u68C0\u67E5\u8FDE\u63A5\u2026",
    connecting: "\u6B63\u5728\u8FDE\u63A5",
    reconnecting: "\u6B63\u5728\u91CD\u8FDE",
    lastActive: "\u6700\u540E\u6D3B\u8DC3\uFF1A{time}",
    neverConnected: "\u5C1A\u672A\u6210\u529F\u8FDE\u63A5\u8FC7\u3002",
    reconnect: "\u624B\u52A8\u91CD\u8FDE",
    reconnectingAction: "\u6B63\u5728\u91CD\u8FDE\u2026",
    reconnectStarted: "\u5DF2\u53D1\u8D77\u91CD\u8FDE\u3002",
    connectionAuthorizationExpired: "\u6388\u6743\u5DF2\u5931\u6548\uFF0C\u8BF7\u9000\u51FA\u6388\u6743\u540E\u91CD\u65B0\u8FDE\u63A5\u6B64 Host\u3002",
    connectionDeviceRevoked: "\u6B64 Host \u5DF2\u5728 Server \u4E0A\u88AB\u64A4\u9500\uFF0C\u8BF7\u9000\u51FA\u6388\u6743\u540E\u91CD\u65B0\u8FDE\u63A5\u3002",
    connectionOwnershipRequired: "Server \u5DF2\u4E0D\u518D\u5C06\u6B64 Host \u8BC6\u522B\u4E3A\u5F53\u524D\u8D26\u53F7\u7684\u8BBE\u5907\u3002",
    connectionRateLimited: "Server \u8BF7\u6C42\u8FC7\u591A\uFF0C\u63D2\u4EF6\u5C06\u7EE7\u7EED\u81EA\u52A8\u91CD\u8BD5\u3002",
    connectionVersionMismatch: "Plugin \u4E0E Server \u7684\u534F\u8BAE\u7248\u672C\u4E0D\u517C\u5BB9\u3002",
    connectionInvalidResponse: "Server \u8FD4\u56DE\u4E86\u65E0\u6548\u7684\u63A7\u5236\u6D88\u606F\u3002",
    connectionReachability: "\u65E0\u6CD5\u8FDE\u63A5 Server\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u548C Server \u5730\u5740\u3002",
    connectionUnexpected: "\u8FDE\u63A5\u610F\u5916\u4E2D\u65AD\uFF0C\u63D2\u4EF6\u5C06\u7EE7\u7EED\u81EA\u52A8\u91CD\u8BD5\u3002",
    hostSignInHint: "\u767B\u5F55\u540E\u5728\u6240\u9009 Server \u4E0A\u6388\u6743\u6B64 Host\u3002",
    checkingHost: "\u6B63\u5728\u68C0\u67E5 Host \u6CE8\u518C\u72B6\u6001\u2026",
    hostUnavailable: "Host \u4E0D\u53EF\u7528\uFF1A{error}",
    serverAccountEmail: "Server \u8D26\u53F7\u90AE\u7BB1",
    serverAccountPassword: "Server \u8D26\u53F7\u5BC6\u7801",
    signInRegisterHost: "\u767B\u5F55\u5E76\u6CE8\u518C Host",
    signingIn: "\u6B63\u5728\u767B\u5F55\u2026",
    useRegistrationCode: "\u4F7F\u7528\u8FDE\u63A5\u7801",
    registering: "\u6B63\u5728\u6CE8\u518C\u2026",
    remoteEntry: "Remote",
    remoteTitle: "\u6253\u5F00\u8FDC\u7AEF\u5DE5\u4F5C\u533A",
    remoteDescription: "\u9009\u62E9\u81EA\u5DF1\u7684\u4E3B\u673A\u548C\u5DE5\u4F5C\u76EE\u5F55\u3002\u4EA4\u4E92\u754C\u9762\u4ECD\u8FD0\u884C\u5728\u5F53\u524D\u8BBE\u5907\u4E0A\u3002",
    chooseHost: "\u4E3B\u673A",
    chooseDirectory: "\u5DE5\u4F5C\u76EE\u5F55",
    selectHostHint: "\u9009\u62E9\u4E00\u53F0\u5728\u7EBF\u4E3B\u673A\u4EE5\u6D4F\u89C8\u5176\u76EE\u5F55\u3002",
    emptyDirectory: "\u8FD9\u4E2A\u76EE\u5F55\u4E0B\u6CA1\u6709\u53EF\u89C1\u7684\u5B50\u76EE\u5F55\u3002",
    openWorkspace: "\u6253\u5F00\u5DE5\u4F5C\u533A",
    openingWorkspace: "\u6B63\u5728\u6253\u5F00\u2026",
    loadingDirectory: "\u6B63\u5728\u52A0\u8F7D\u76EE\u5F55\u2026",
    backToHosts: "\u9009\u62E9\u5176\u4ED6\u4E3B\u673A",
    currentDirectory: "\u5DF2\u9009\u76EE\u5F55",
    directoryTruncated: "\u76EE\u5F55\u5185\u5BB9\u8F83\u591A\uFF0C\u76EE\u524D\u53EA\u663E\u793A\u4E86\u4E00\u90E8\u5206\u3002",
    existingWorkspaces: "\u5DF2\u6709\u5DE5\u4F5C\u533A",
    remotePathPlaceholder: "/home/user/project",
    remotePathHint: "\u8F93\u5165\u6240\u9009\u4E3B\u673A\u4E0A\u7684\u7EDD\u5BF9\u76EE\u5F55\u8DEF\u5F84\u3002",
    noRemoteWorkspaces: "\u8FD9\u53F0\u4E3B\u673A\u8FD8\u6CA1\u6709\u5DE5\u4F5C\u533A\uFF0C\u70B9\u51FB + \u6DFB\u52A0\u3002",
    activeRemote: "{name}",
    exitRemote: "\u9000\u51FA",
    addRemoteWorkspace: "\u6DFB\u52A0\u8FDC\u7A0B\u5DE5\u4F5C\u533A",
    remoteModeLabel: "\u8FDC\u7A0B\u6A21\u5F0F \xB7 {name}",
    remoteNetworkP2p: "P2P",
    remoteNetworkTurn: "TURN",
    remoteNetworkRelay: "\u4E2D\u7EE7",
    remoteNetworkLan: "\u5C40\u57DF\u7F51",
    remoteNetworkOffline: "\u5DF2\u65AD\u5F00",
    remoteLinkEncrypted: "\u7AEF\u5230\u7AEF\u52A0\u5BC6",
    connectionRouteTitle: "\u8FDE\u63A5\u7EBF\u8DEF",
    connectionRouteFrom: "\u8D77\u70B9",
    connectionRouteVia: "\u7ECF\u8FC7",
    connectionRouteTo: "\u7EC8\u70B9",
    connectionRouteCurrentDevice: "\u5F53\u524D\u8BBE\u5907",
    connectionRouteLan: "\u540C\u4E00\u5C40\u57DF\u7F51",
    connectionRouteP2p: "\u4E92\u8054\u7F51\u76F4\u8FDE",
    connectionRouteTurn: "TURN \u4E2D\u7EE7\u670D\u52A1",
    connectionRouteRelay: "Remote Server",
    connectionRouteHost: "\u8FD0\u884C Harness \u7684\u5DE5\u4F5C\u7535\u8111",
    connectionRouteEncrypted: "\u7EBF\u8DEF\u4E0A\u7684\u4E1A\u52A1\u6570\u636E\u4FDD\u6301\u7AEF\u5230\u7AEF\u52A0\u5BC6\u3002",
    openLocalWorkspaces: "\u6253\u5F00\u672C\u5730\u5DE5\u4F5C\u533A",
    clientSignInHint: "\u767B\u5F55 Server \u540E\u5373\u53EF\u67E5\u770B\u81EA\u5DF1\u7684\u8FDC\u7AEF\u4E3B\u673A\u3002",
    signInClient: "\u767B\u5F55 Remote"
  };
  function formatLocalTime(value) {
    let date = new Date(value);
    return Number.isNaN(date.getTime()) ? "\u2014" : date.toLocaleString();
  }
  function connectionErrorMessage(code, t) {
    return t(code === "ACCOUNT_AUTH_REQUIRED" || code === "AUTH_INVALID" || code === "TOKEN_EXPIRED" ? "connectionAuthorizationExpired" : code === "DEVICE_REVOKED" ? "connectionDeviceRevoked" : code === "DEVICE_OWNERSHIP_REQUIRED" ? "connectionOwnershipRequired" : code === "RATE_LIMITED" ? "connectionRateLimited" : code === "UNSUPPORTED_VERSION" ? "connectionVersionMismatch" : code === "INVALID_MESSAGE" ? "connectionInvalidResponse" : code === "CONNECTION_FAILED" || code === "SERVER_NOT_CONFIGURED" ? "connectionReachability" : "connectionUnexpected");
  }
  function connectionStatusLabel(status, t) {
    return status === void 0 ? t("checkingConnection") : status.online ? t("online") : status.reconnecting ? t(status.lastActiveAt === void 0 && status.error === void 0 ? "connecting" : "reconnecting") : t("offline");
  }
  function connectionStatusClass(status) {
    return status?.online ? " isOnline" : status?.reconnecting ? " isReconnecting" : status === void 0 ? "" : " isOffline";
  }
  window.__ModuleLoader__.load({
    id: clientModuleId,
    factory: (require2) => {
      let module = { exports: {} }, React = require2("react"), inject = ["connection", "slots", "locale"];
      function RemotePluginOptions(props) {
        let { t } = props, [open, setOpen] = React.useState(!1), [serverUrl, setServerUrl] = React.useState(""), role = "host", [registrationCode, setRegistrationCode] = React.useState(""), [associations, setAssociations] = React.useState({}), [loaded, setLoaded] = React.useState(!1), [writable, setWritable] = React.useState(!1), [busy, setBusy] = React.useState(!1), [reconnectBusy, setReconnectBusy] = React.useState(!1), [hostStatus, setHostStatus] = React.useState(void 0), [notice, setNotice] = React.useState(void 0), [error, setError] = React.useState(void 0), [settingsView, setSettingsView] = React.useState(void 0), persistedServerUrl = settingsView?.config.serverUrl ?? "https://dsh.r2049.cn", association = associations.host, draftDirty = settingsView !== void 0 && serverUrl !== persistedServerUrl || registrationCode !== "", applyView = (view) => {
          setSettingsView(view), setServerUrl(view.config.serverUrl ?? "https://dsh.r2049.cn"), setAssociations(view.associations ?? (view.association === void 0 ? {} : { host: view.association })), setWritable(view.writable), setLoaded(!0);
        }, load = async () => {
          let [view, status] = await Promise.all([
            props.control("settings.get"),
            props.control("status").catch(() => {
            })
          ]);
          applyView(view), setHostStatus(status?.host);
        }, refreshHostStatus = async () => {
          setHostStatus((await props.control("status")).host);
        };
        React.useEffect(() => {
          load().catch((reason) => setError(messageOf(reason)));
        }, []), React.useEffect(() => {
          if (association === void 0) return;
          refreshHostStatus().catch(() => {
          });
          let timer = window.setInterval(() => {
            refreshHostStatus().catch(() => {
            });
          }, 3e4);
          return () => window.clearInterval(timer);
        }, [association !== void 0]);
        let save = async (event) => {
          if (event?.preventDefault(), !!writable) {
            setBusy(!0), setNotice(void 0), setError(void 0);
            try {
              if (registrationCode.trim() === "")
                throw new Error(t("enterRegistrationCode"));
              let result = await props.control("settings.configure", {
                serverUrl,
                role,
                registrationCode
              });
              applyView(result.settings), setNotice({ key: "associationSaved" }), setRegistrationCode("");
            } catch (reason) {
              setError(messageOf(reason));
            } finally {
              setBusy(!1);
            }
          }
        }, logout = async () => {
          setBusy(!0), setError(void 0), setNotice(void 0);
          try {
            let view = await props.control("settings.logout");
            applyView(view), setRegistrationCode(""), setNotice({ key: "signedOut" });
          } catch (reason) {
            setError(messageOf(reason));
          } finally {
            setBusy(!1);
          }
        }, reconnectHost = async () => {
          setReconnectBusy(!0), setError(void 0), setNotice(void 0);
          try {
            let status = await props.control("host.reconnect");
            setHostStatus(status.host), setNotice({ key: "reconnectStarted" });
          } catch (reason) {
            setError(messageOf(reason));
          } finally {
            setReconnectBusy(!1);
          }
        }, discard = () => {
          settingsView !== void 0 && applyView(settingsView), setRegistrationCode(""), setNotice(void 0), setError(void 0);
        };
        return React.createElement(
          "li",
          { className: `dshRemotePluginCard${open ? " isOpen" : ""}` },
          React.createElement(
            "div",
            { className: "dshRemotePluginCardHeader" },
            React.createElement(
              "button",
              {
                type: "button",
                className: "dshRemotePluginCardToggle",
                "aria-expanded": open,
                "aria-label": t(open ? "collapseSettings" : "expandSettings", { name: t("pluginTitle") }),
                onClick: () => setOpen((current) => !current)
              },
              React.createElement(
                "span",
                { className: "dshRemotePluginCardHeading" },
                React.createElement("strong", null, t("pluginTitle")),
                React.createElement("span", null, t("pluginDescription"))
              ),
              draftDirty ? React.createElement("span", { className: "dshRemotePluginCardStatus" }, t("unsaved")) : association === void 0 ? null : React.createElement("span", {
                className: `dshRemotePluginCardStatus${connectionStatusClass(hostStatus)}`
              }, hostStatus === void 0 ? t("associated") : connectionStatusLabel(hostStatus, t)),
              React.createElement("span", { className: "dshRemotePluginCardChevron", "aria-hidden": !0 }, "\u2304")
            )
          ),
          open ? React.createElement(
            "div",
            { className: "dshRemotePluginCardBody" },
            loaded ? association !== void 0 ? React.createElement(
              "div",
              { className: "dshRemoteSettings" },
              React.createElement(
                "div",
                { className: "dshRemoteSettingsTop" },
                React.createElement(
                  "div",
                  { className: "dshRemoteAssociation" },
                  React.createElement("span", null, t(association.account === void 0 ? role : "account")),
                  React.createElement("strong", null, association.account ?? t("authorizationComplete")),
                  React.createElement("p", null, association.account === void 0 ? serverUrl : t("authorizedOn", { role: t(role), serverUrl }))
                )
              ),
              React.createElement(
                "div",
                { className: "dshRemoteConnection", "aria-live": "polite" },
                React.createElement(
                  "div",
                  { className: "dshRemoteConnectionSummary" },
                  React.createElement("span", null, t("connection")),
                  React.createElement(
                    "strong",
                    null,
                    React.createElement("span", {
                      className: `dshRemoteConnectionDot${connectionStatusClass(hostStatus)}`,
                      "aria-hidden": !0
                    }),
                    connectionStatusLabel(hostStatus, t)
                  ),
                  React.createElement("p", null, hostStatus === void 0 ? t("checkingConnection") : hostStatus.lastActiveAt === void 0 ? t("neverConnected") : t("lastActive", { time: formatLocalTime(hostStatus.lastActiveAt) }))
                ),
                React.createElement("button", {
                  type: "button",
                  className: "dshRemoteReconnect",
                  disabled: reconnectBusy || hostStatus?.configured === !1,
                  onClick: () => void reconnectHost()
                }, t(reconnectBusy ? "reconnectingAction" : "reconnect"))
              ),
              hostStatus?.error === void 0 || hostStatus.online ? null : React.createElement("p", { className: "dshRemoteConnectionIssue", role: "status" }, connectionErrorMessage(hostStatus.error, t)),
              writable ? null : React.createElement("p", { className: "dshRemoteError" }, t("readOnly")),
              React.createElement(
                "div",
                { className: "dshRemoteSettingsFooter" },
                error !== void 0 ? React.createElement("p", { className: "dshRemoteError", role: "alert" }, error) : notice === void 0 ? null : React.createElement("p", { className: "dshRemoteNotice", role: "status" }, t(notice.key, notice.params)),
                draftDirty ? React.createElement(
                  React.Fragment,
                  null,
                  React.createElement("button", { type: "button", className: "dshRemoteDiscard", disabled: busy, onClick: discard }, t("discard")),
                  React.createElement("button", { type: "button", className: "dshRemoteSave", disabled: busy || !writable, onClick: () => void save() }, t(busy ? "saving" : "save"))
                ) : React.createElement("button", {
                  type: "button",
                  className: "dshRemoteDiscard",
                  disabled: busy || !writable,
                  onClick: () => void logout()
                }, t(busy ? "signingOut" : "signOut"))
              )
            ) : React.createElement(
              "form",
              { className: "dshRemoteSettings", noValidate: !0, onSubmit: (event) => void save(event) },
              React.createElement(
                "div",
                { className: "dshRemoteField" },
                React.createElement("label", { htmlFor: "dsh-remote-server-url" }, t("serverUrl")),
                React.createElement("input", {
                  id: "dsh-remote-server-url",
                  type: "url",
                  value: serverUrl,
                  disabled: busy || !writable,
                  required: !0,
                  placeholder: "https://dsh.r2049.cn",
                  onChange: (event) => {
                    setServerUrl(event.target.value), setNotice(void 0);
                  }
                }),
                React.createElement("p", null, t("serverUrlHint"))
              ),
              React.createElement(
                "div",
                { className: "dshRemoteField" },
                React.createElement("label", { htmlFor: "dsh-remote-registration-code" }, t("hostRegistrationCode")),
                React.createElement("input", {
                  id: "dsh-remote-registration-code",
                  value: registrationCode,
                  disabled: busy || !writable,
                  required: !0,
                  autoComplete: "one-time-code",
                  placeholder: "ABCD-EFGH",
                  onChange: (event) => {
                    setRegistrationCode(event.target.value), setNotice(void 0);
                  }
                }),
                React.createElement("p", null, t("registrationCodeHint"))
              ),
              writable ? null : React.createElement("p", { className: "dshRemoteError" }, t("readOnly")),
              React.createElement(
                "div",
                { className: "dshRemoteSettingsFooter" },
                error !== void 0 ? React.createElement("p", { className: "dshRemoteError", role: "alert" }, error) : notice === void 0 ? null : React.createElement("p", { className: "dshRemoteNotice", role: "status" }, t(notice.key, notice.params)),
                React.createElement("button", { type: "button", className: "dshRemoteDiscard", disabled: busy || !draftDirty, onClick: discard }, t("discard")),
                React.createElement("button", { type: "submit", className: "dshRemoteSave", disabled: busy || !writable || !draftDirty }, t(busy ? "saving" : "save"))
              )
            ) : React.createElement("p", { className: "dshRemoteSettingsState" }, error ?? t("loadingSettings"))
          ) : null
        );
      }
      function RemoteWorkspaceAction(props) {
        let { t } = props, [open, setOpen] = React.useState(!1), [status, setStatus] = React.useState(void 0), [devices, setDevices] = React.useState([]), [selectedHost, setSelectedHost] = React.useState(void 0), [workspaces, setWorkspaces] = React.useState([]), [path, setPath] = React.useState(""), [addingWorkspace, setAddingWorkspace] = React.useState(!1), [busy, setBusy] = React.useState(!1), [needsAuthorization, setNeedsAuthorization] = React.useState(!1), [email, setEmail] = React.useState(""), [password, setPassword] = React.useState(""), [notice, setNotice] = React.useState(void 0), [error, setError] = React.useState(void 0);
        React.useEffect(() => {
          if (!open) return;
          let closeOnEscape = (event) => {
            event.key === "Escape" && setOpen(!1);
          };
          return window.addEventListener("keydown", closeOnEscape), () => window.removeEventListener("keydown", closeOnEscape);
        }, [open]), React.useEffect(() => {
          props.control("status").then(setStatus).catch(() => {
          });
        }, []), React.useEffect(() => {
          let remoteActive = status?.mode === "remote";
          return document.documentElement.classList.toggle("dshRemoteTargetActive", remoteActive), () => {
            remoteActive && document.documentElement.classList.remove("dshRemoteTargetActive");
          };
        }, [status?.mode]);
        let selectHost = async (host) => {
          setBusy(!0), setError(void 0);
          try {
            setWorkspaces(await props.control("workspaces.list", { targetDeviceId: host.deviceId })), setSelectedHost(host), setPath(""), setAddingWorkspace(!1);
          } catch (reason) {
            setError(messageOf(reason));
          } finally {
            setBusy(!1);
          }
        }, show = async () => {
          setOpen(!0), setBusy(!0), setNotice(void 0), setError(void 0);
          try {
            let nextStatus = await props.control("status");
            if (setStatus(nextStatus), nextStatus.available)
              try {
                setDevices(await props.control("devices")), setNeedsAuthorization(!1);
              } catch {
                setNeedsAuthorization(!0);
              }
          } catch (reason) {
            setError(messageOf(reason));
          } finally {
            setBusy(!1);
          }
        }, signInClient = async () => {
          if (!(email.trim() === "" || password === "")) {
            setBusy(!0), setError(void 0);
            try {
              await props.control("client.account.login", { email: email.trim(), password }), setDevices(await props.control("devices")), setNeedsAuthorization(!1), setPassword("");
            } catch (reason) {
              setError(messageOf(reason));
            } finally {
              setBusy(!1);
            }
          }
        }, openLocalWorkspaces = async () => {
          setBusy(!0), setError(void 0);
          try {
            await props.control("mode.set", { mode: "local" }), window.location.reload();
          } catch (reason) {
            setError(messageOf(reason)), setBusy(!1);
          }
        }, openWorkspace = async () => {
          if (!(selectedHost === void 0 || path.trim() === "")) {
            setBusy(!0), setError(void 0);
            try {
              await props.control("workspace.open", {
                targetDeviceId: selectedHost.deviceId,
                path: path.trim()
              }), window.location.reload();
            } catch (reason) {
              setError(messageOf(reason)), setBusy(!1);
            }
          }
        }, remoteLabel = status?.mode === "remote" ? t("activeRemote", { name: status.target?.name ?? t("host") }) : t("remoteEntry");
        return React.createElement(
          React.Fragment,
          null,
          React.createElement(
            "div",
            { className: `dshRemoteSidebarEntry${status?.mode === "remote" ? " isActive" : ""}` },
            React.createElement(status?.mode === "remote" ? "div" : "button", {
              ...status?.mode === "remote" ? {} : { type: "button", onClick: () => void show() },
              className: "dshRemoteModeButton",
              title: remoteLabel,
              "aria-label": remoteLabel
            }, React.createElement(
              "svg",
              {
                className: "dshRemoteComputerIcon",
                viewBox: "0 0 24 24",
                fill: "none",
                stroke: "currentColor",
                strokeWidth: 1.7,
                strokeLinecap: "round",
                strokeLinejoin: "round",
                "aria-hidden": !0
              },
              React.createElement("rect", { x: 3, y: 4, width: 18, height: 13, rx: 2 }),
              React.createElement("path", { d: "M8 21h8M12 17v4" })
            ), props.wide ? React.createElement("span", { className: "dshRemoteSidebarLabel" }, remoteLabel) : null),
            status?.mode === "remote" && props.wide ? React.createElement("button", {
              type: "button",
              className: "dshRemoteExitLink",
              disabled: busy,
              onClick: () => void openLocalWorkspaces()
            }, t("exitRemote")) : null
          ),
          open ? React.createElement("div", {
            className: "dshRemoteBackdrop",
            role: "presentation",
            onMouseDown: (event) => {
              event.target === event.currentTarget && setOpen(!1);
            }
          }, React.createElement(
            "section",
            { className: "dshRemotePage", role: "dialog", "aria-modal": !0, "aria-label": t("remoteTitle") },
            React.createElement(
              "header",
              { className: "dshRemotePageHeader" },
              React.createElement(
                "div",
                null,
                React.createElement("strong", null, t("remoteTitle")),
                React.createElement("p", null, t("remoteDescription"))
              ),
              React.createElement("button", { type: "button", onClick: () => setOpen(!1), "aria-label": t("close") }, "\xD7")
            ),
            React.createElement(
              "main",
              { className: "dshRemotePageBody" },
              status?.mode === "remote" ? React.createElement("button", {
                type: "button",
                className: "dshRemoteLocalLink",
                disabled: busy,
                onClick: () => void openLocalWorkspaces()
              }, t("openLocalWorkspaces")) : null,
              React.createElement(
                React.Fragment,
                null,
                needsAuthorization ? React.createElement(
                  "section",
                  { className: "dshRemoteEnable" },
                  React.createElement("strong", null, t("signInClient")),
                  React.createElement("p", null, t("clientSignInHint")),
                  React.createElement(
                    "div",
                    { className: "dshRemoteClientLogin" },
                    React.createElement("input", {
                      type: "email",
                      value: email,
                      disabled: busy,
                      autoComplete: "username",
                      placeholder: t("account"),
                      "aria-label": t("account"),
                      onChange: (event) => setEmail(event.target.value)
                    }),
                    React.createElement("input", {
                      type: "password",
                      value: password,
                      disabled: busy,
                      autoComplete: "current-password",
                      placeholder: t("password"),
                      "aria-label": t("password"),
                      onChange: (event) => setPassword(event.target.value)
                    }),
                    React.createElement("button", { type: "button", disabled: busy || email.trim() === "" || password === "", onClick: () => void signInClient() }, t(busy ? "signingIn" : "signInClient"))
                  )
                ) : null,
                needsAuthorization ? null : React.createElement(
                  React.Fragment,
                  null,
                  React.createElement(
                    "section",
                    { className: "dshRemoteHosts", "aria-label": t("chooseHost") },
                    React.createElement(
                      "div",
                      { className: "dshRemoteSectionHeading" },
                      React.createElement("strong", null, t("chooseHost")),
                      selectedHost === void 0 ? null : React.createElement("button", {
                        type: "button",
                        onClick: () => {
                          setSelectedHost(void 0), setWorkspaces([]), setPath(""), setAddingWorkspace(!1), setError(void 0);
                        }
                      }, t("backToHosts"))
                    ),
                    selectedHost === void 0 ? React.createElement("div", { className: "dshRemoteHostList" }, devices.length === 0 ? React.createElement("p", null, t(busy ? "checkingConnection" : "noRemoteHosts")) : devices.map((device) => React.createElement("button", {
                      type: "button",
                      key: device.deviceId,
                      disabled: busy || !device.online,
                      onClick: () => void selectHost(device)
                    }, React.createElement("span", null, device.name), React.createElement("small", null, `${device.platform} \xB7 ${t(device.online ? "online" : "offline")}`)))) : React.createElement(
                      "div",
                      { className: "dshRemoteSelectedHost" },
                      React.createElement("span", null, selectedHost.name),
                      React.createElement("small", null, `${selectedHost.platform} \xB7 ${t("online")}`)
                    )
                  ),
                  selectedHost === void 0 ? React.createElement("p", { className: "dshRemoteHint" }, t("selectHostHint")) : React.createElement(
                    "section",
                    { className: "dshRemoteBrowser", "aria-label": t("chooseDirectory") },
                    React.createElement(
                      "div",
                      { className: "dshRemoteSectionHeading" },
                      React.createElement("strong", null, t("existingWorkspaces")),
                      React.createElement("button", {
                        type: "button",
                        className: "dshRemoteAddWorkspace",
                        title: t("addRemoteWorkspace"),
                        "aria-label": t("addRemoteWorkspace"),
                        "aria-expanded": addingWorkspace,
                        onClick: () => {
                          setAddingWorkspace((current) => !current), setPath("");
                        }
                      }, "+")
                    ),
                    React.createElement("div", { className: "dshRemoteDirectoryList" }, workspaces.length === 0 ? React.createElement("p", null, t("noRemoteWorkspaces")) : workspaces.map((workspace) => React.createElement(
                      "button",
                      {
                        type: "button",
                        key: workspace.workspaceId,
                        disabled: busy,
                        className: !addingWorkspace && path === workspace.path ? "isSelected" : "",
                        "aria-pressed": !addingWorkspace && path === workspace.path,
                        onClick: () => {
                          setAddingWorkspace(!1), setPath(workspace.path);
                        }
                      },
                      React.createElement("span", { "aria-hidden": !0 }, "\u25B1"),
                      React.createElement("span", null, workspace.title),
                      React.createElement("small", null, workspace.path)
                    ))),
                    addingWorkspace ? React.createElement(
                      "label",
                      { className: "dshRemotePathField" },
                      React.createElement("span", null, t("chooseDirectory")),
                      React.createElement("input", {
                        value: path,
                        disabled: busy,
                        placeholder: t("remotePathPlaceholder"),
                        onChange: (event) => setPath(event.target.value)
                      }),
                      React.createElement("small", null, t("remotePathHint"))
                    ) : null,
                    React.createElement(
                      "footer",
                      { className: "dshRemoteOpenBar" },
                      React.createElement("div", null, React.createElement("span", null, t("currentDirectory")), React.createElement("strong", null, path || "\u2014")),
                      React.createElement("button", { type: "button", disabled: busy || path.trim() === "", onClick: () => void openWorkspace() }, t(busy ? "openingWorkspace" : "openWorkspace"))
                    )
                  )
                )
              ),
              notice === void 0 ? null : React.createElement("p", { className: "dshRemoteNotice", role: "status" }, notice),
              error === void 0 ? null : React.createElement("p", { className: "dshRemoteError", role: "alert" }, error)
            )
          )) : null
        );
      }
      function RemoteModeAction(props) {
        let { t } = props, [open, setOpen] = React.useState(!1), [status, setStatus] = React.useState(void 0), [devices, setDevices] = React.useState([]), [hostRegistrationCode, setHostRegistrationCode] = React.useState(""), [email, setEmail] = React.useState(""), [password, setPassword] = React.useState(""), [busy, setBusy] = React.useState(!1), [error, setError] = React.useState(void 0), [supported, setSupported] = React.useState(!0), refresh = async () => {
          let [nextStatus, nextDevices] = await Promise.all([
            props.control("status"),
            props.control("devices").catch(() => [])
          ]);
          setStatus(nextStatus), setDevices(nextDevices);
        }, refreshStatus = async () => {
          setStatus(await props.control("status"));
        };
        React.useEffect(() => {
          refresh().catch((reason) => {
            setError(messageOf(reason)), setSupported(!1);
          });
        }, []), React.useEffect(() => {
          if (!open) return;
          refreshStatus();
          let timer = window.setInterval(() => {
            refreshStatus();
          }, 1500);
          return () => window.clearInterval(timer);
        }, [open]);
        let switchMode = async (mode, targetDeviceId) => {
          setBusy(!0), setError(void 0);
          try {
            await props.control("mode.set", { mode, ...targetDeviceId === void 0 ? {} : { targetDeviceId } }), window.location.reload();
          } catch (reason) {
            setError(messageOf(reason)), setBusy(!1);
          }
        }, loginHost = async () => {
          if (!(email.trim() === "" || password === "")) {
            setBusy(!0), setError(void 0);
            try {
              await props.control("host.account.login", { email: email.trim(), password }), await refreshStatus();
            } catch (reason) {
              setError(messageOf(reason));
            } finally {
              setPassword(""), setBusy(!1);
            }
          }
        }, registerHostWithCode = async () => {
          if (hostRegistrationCode.trim() !== "") {
            setBusy(!0), setError(void 0);
            try {
              await props.control("host.registration-code.submit", { code: hostRegistrationCode.trim() }), setHostRegistrationCode(""), await refreshStatus();
            } catch (reason) {
              setError(messageOf(reason));
            } finally {
              setBusy(!1);
            }
          }
        }, label = status?.mode === "remote" ? t("remoteTarget", { name: status.target?.name ?? t("host") }) : t("local");
        return supported ? React.createElement(
          React.Fragment,
          null,
          React.createElement("button", {
            type: "button",
            className: "dshRemoteModeButton",
            title: t("switchTarget"),
            "aria-label": t("switchTarget"),
            onClick: () => setOpen(!0)
          }, React.createElement("span", { "aria-hidden": !0 }, "\u25CE"), props.wide ? React.createElement("span", null, label) : null),
          open ? React.createElement(
            "div",
            { className: "dshRemoteBackdrop", role: "presentation" },
            React.createElement(
              "section",
              {
                className: "dshRemoteDialog",
                role: "dialog",
                "aria-modal": !0,
                "aria-label": t("harnessTarget")
              },
              React.createElement(
                "div",
                { className: "dshRemoteHeader" },
                React.createElement("strong", null, t("harnessTarget")),
                React.createElement("button", { type: "button", onClick: () => setOpen(!1), "aria-label": t("close") }, "\xD7")
              ),
              React.createElement("button", {
                type: "button",
                disabled: busy || status?.mode === "local",
                onClick: () => void switchMode("local")
              }, t("thisMachineLocal")),
              React.createElement("div", { className: "dshRemoteDevices" }, devices.length === 0 ? React.createElement("p", null, t("noRemoteHosts")) : devices.map((device) => React.createElement("button", {
                type: "button",
                key: device.deviceId,
                disabled: busy || !device.online || status?.target?.deviceId === device.deviceId,
                onClick: () => void switchMode("remote", device.deviceId)
              }, `${device.name} \xB7 ${t(device.online ? "online" : "offline")}`))),
              status?.hostAuthorizationAvailable && status.host !== void 0 ? React.createElement(
                "div",
                { className: "dshRemoteHostAccount" },
                React.createElement("strong", null, t("thisMachineHost")),
                React.createElement("p", null, status.host.online ? status.host.account === void 0 ? t("connected") : t("connectedAs", { account: status.host.account }) : status.host.accountRequired ? t("hostSignInHint") : status.host.error === void 0 ? t("checkingHost") : t("hostUnavailable", { error: connectionErrorMessage(status.host.error, t) })),
                status.host.accountRequired ? React.createElement(
                  "div",
                  { className: "dshRemoteLogin" },
                  React.createElement("input", {
                    type: "email",
                    value: email,
                    disabled: busy,
                    autoComplete: "username",
                    placeholder: t("serverAccountEmail"),
                    "aria-label": t("serverAccountEmail"),
                    onChange: (event) => setEmail(event.target.value)
                  }),
                  React.createElement("input", {
                    type: "password",
                    value: password,
                    disabled: busy,
                    autoComplete: "current-password",
                    placeholder: t("password"),
                    "aria-label": t("serverAccountPassword"),
                    onChange: (event) => setPassword(event.target.value)
                  }),
                  React.createElement("button", {
                    type: "button",
                    disabled: busy || email.trim() === "" || password === "",
                    onClick: () => void loginHost()
                  }, t(busy ? "signingIn" : "signInRegisterHost")),
                  React.createElement("input", {
                    value: hostRegistrationCode,
                    disabled: busy,
                    autoComplete: "one-time-code",
                    placeholder: t("hostRegistrationCode"),
                    "aria-label": t("hostRegistrationCode"),
                    onChange: (event) => setHostRegistrationCode(event.target.value)
                  }),
                  React.createElement("button", {
                    type: "button",
                    disabled: busy || hostRegistrationCode.trim() === "",
                    onClick: () => void registerHostWithCode()
                  }, t(busy ? "registering" : "useRegistrationCode"))
                ) : null
              ) : null,
              error === void 0 ? null : React.createElement("p", { className: "dshRemoteError", role: "alert" }, error)
            )
          ) : null
        ) : null;
      }
      function RemoteSessionHeaderAction(props) {
        let { t } = props, [status, setStatus] = React.useState(void 0), [busy, setBusy] = React.useState(!1), [routeOpen, setRouteOpen] = React.useState(!1);
        if (React.useEffect(() => {
          let active = !0, refresh = () => {
            props.control("status").then((next) => {
              active && setStatus(next);
            }).catch(() => {
            });
          };
          refresh();
          let timer = window.setInterval(refresh, 1500);
          return () => {
            active = !1, window.clearInterval(timer);
          };
        }, []), status?.mode !== "remote") return null;
        let exit = async () => {
          setBusy(!0);
          try {
            await props.control("mode.set", { mode: "local" }), window.location.reload();
          } finally {
            setBusy(!1);
          }
        }, transport = status.transport ?? "Disconnected", networkLabel = t(transport === "P2P" ? "remoteNetworkP2p" : transport === "TURN" ? "remoteNetworkTurn" : transport === "Relay" ? "remoteNetworkRelay" : transport === "LAN" ? "remoteNetworkLan" : "remoteNetworkOffline"), networkOnline = status.connected === !0 && transport !== "Disconnected", routeVia = t(transport === "P2P" ? "connectionRouteP2p" : transport === "TURN" ? "connectionRouteTurn" : transport === "Relay" ? "connectionRouteRelay" : "connectionRouteLan");
        return React.createElement(
          "div",
          { className: "dshRemoteSessionHeader", role: "status" },
          React.createElement("svg", {
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: 1.7,
            strokeLinecap: "round",
            strokeLinejoin: "round",
            "aria-hidden": !0
          }, React.createElement("rect", { x: 3, y: 4, width: 18, height: 13, rx: 2 }), React.createElement("path", { d: "M8 21h8M12 17v4" })),
          React.createElement("span", null, t("remoteModeLabel", { name: status.target?.name ?? t("host") })),
          React.createElement("button", {
            type: "button",
            className: `dshRemoteNetwork${networkOnline ? " isOnline" : " isOffline"}`,
            title: networkLabel,
            disabled: !networkOnline,
            "aria-haspopup": "dialog",
            "aria-expanded": routeOpen,
            onClick: () => setRouteOpen((value) => !value)
          }, React.createElement("i", { "aria-hidden": !0 }), networkLabel),
          networkOnline ? React.createElement("span", { className: "dshRemoteEncrypted" }, t("remoteLinkEncrypted")) : null,
          React.createElement("button", { type: "button", className: "dshRemoteHeaderExitLink", disabled: busy, onClick: () => void exit() }, t("exitRemote")),
          routeOpen ? React.createElement("div", {
            className: "dshRemoteRouteBackdrop",
            role: "presentation",
            onMouseDown: (event) => {
              event.target === event.currentTarget && setRouteOpen(!1);
            }
          }, React.createElement(
            "section",
            {
              className: "dshRemoteRoutePanel",
              role: "dialog",
              "aria-modal": !0,
              "aria-label": t("connectionRouteTitle")
            },
            React.createElement(
              "header",
              null,
              React.createElement("strong", null, t("connectionRouteTitle")),
              React.createElement("button", { type: "button", "aria-label": t("close"), onClick: () => setRouteOpen(!1) }, "\xD7")
            ),
            React.createElement(
              "ol",
              null,
              React.createElement("li", null, React.createElement("small", null, t("connectionRouteFrom")), React.createElement("strong", null, t("connectionRouteCurrentDevice"))),
              React.createElement("li", null, React.createElement("small", null, t("connectionRouteVia")), React.createElement("strong", null, routeVia)),
              React.createElement("li", null, React.createElement("small", null, t("connectionRouteTo")), React.createElement("strong", null, status.target?.name ?? t("host")), React.createElement("span", null, t("connectionRouteHost")))
            ),
            React.createElement("p", null, t("connectionRouteEncrypted"))
          )) : null
        );
      }
      function installStyle() {
        let style = document.createElement("style");
        return style.dataset.pluginCss = "dsh-remote", style.textContent = [
          'html.dshRemoteTargetActive button[aria-label="\u6DFB\u52A0\u5DE5\u4F5C\u533A"],html.dshRemoteTargetActive button[aria-label="Add workspace"]{display:none!important}',
          ".dshRemoteModeButton{min-height:36px;border:0;background:transparent;color:var(--dsw-alias-label-primary);display:flex;align-items:center;gap:8px;padding:0 10px;border-radius:8px}.dshRemoteModeButton:is(button){cursor:pointer}",
          ".dshRemoteModeButton:is(button):hover{background:var(--dsw-alias-interactive-bg-hover)}",
          ".dshRemoteSidebarEntry{box-sizing:border-box;position:relative;width:100%;height:36px;min-width:0;display:block;overflow:hidden}.dshRemoteSidebarEntry .dshRemoteModeButton{box-sizing:border-box;width:100%;min-width:0;padding-right:48px}.dshRemoteSidebarEntry.isActive .dshRemoteModeButton{color:var(--dsw-alias-label-secondary);background:transparent}.dshRemoteSidebarLabel{display:block;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.dshRemoteExitLink{position:absolute;top:50%;right:10px;transform:translateY(-50%);white-space:nowrap;border:0;background:transparent;color:var(--dsw-alias-label-secondary);padding:0;font:inherit;font-size:12px;line-height:20px;cursor:pointer}.dshRemoteExitLink:hover{color:var(--dsw-alias-label-primary);text-decoration:underline}.dshRemoteExitLink:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px;border-radius:2px}.dshRemoteExitLink:disabled{opacity:.45;cursor:default;text-decoration:none}",
          ".dshRemoteComputerIcon{width:18px;height:18px;flex:0 0 auto;color:var(--dsw-alias-label-secondary)}",
          '.dshRemoteSessionHeader{position:fixed;z-index:25;top:12px;right:84px;height:28px;display:inline-flex;align-items:center;gap:7px;color:var(--dsw-alias-label-secondary);font-size:12px;white-space:nowrap}.dshRemoteSessionHeader>svg{width:15px;height:15px;flex:0 0 auto}.dshRemoteSessionHeader>span{max-width:260px;overflow:hidden;text-overflow:ellipsis}.dshRemoteNetwork{border:0;background:transparent;color:inherit;font:inherit;padding:3px 2px;display:inline-flex;align-items:center;gap:5px;cursor:pointer}.dshRemoteNetwork:hover:not(:disabled){color:var(--dsw-alias-label-primary);text-decoration:underline}.dshRemoteNetwork:disabled{cursor:default}.dshRemoteNetwork>i{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-label-tertiary)}.dshRemoteNetwork.isOnline>i{background:var(--dsw-alias-state-success-primary,#287a3d)}.dshRemoteNetwork.isOffline{color:var(--dsw-alias-state-error-primary,#b42318)}.dshRemoteNetwork.isOffline>i{background:currentColor}.dshRemoteEncrypted{color:var(--dsw-alias-label-tertiary)}.dshRemoteHeaderExitLink{border:0;background:transparent;color:var(--dsw-alias-label-secondary);padding:3px 2px;font:inherit;text-decoration:none;cursor:pointer}.dshRemoteHeaderExitLink:hover{text-decoration:underline;color:var(--dsw-alias-label-primary)}.dshRemoteHeaderExitLink:disabled{opacity:.45;cursor:default;text-decoration:none}.dshRemoteRouteBackdrop{position:fixed;inset:0;z-index:26}.dshRemoteRoutePanel{position:absolute;top:48px;right:28px;width:min(460px,calc(100vw - 32px));color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-base,#fff);border:1px solid var(--dsw-alias-border-l1);border-radius:12px;box-shadow:var(--dsw-shadow-lv2);padding:16px;white-space:normal}.dshRemoteRoutePanel>header{display:flex;align-items:center;justify-content:space-between}.dshRemoteRoutePanel>header strong{font-size:14px}.dshRemoteRoutePanel>header button{width:28px;height:28px;border:0;border-radius:7px;background:transparent;color:inherit;font-size:20px;cursor:pointer}.dshRemoteRoutePanel>header button:hover{background:var(--dsw-alias-interactive-bg-hover)}.dshRemoteRoutePanel ol{display:flex;align-items:stretch;margin:16px 0;padding:0;list-style:none}.dshRemoteRoutePanel li{position:relative;min-width:0;flex:1;display:flex;flex-direction:column;gap:4px;padding-right:20px}.dshRemoteRoutePanel li:not(:last-child)::after{content:"\u2192";position:absolute;right:7px;top:21px;color:var(--dsw-alias-label-tertiary)}.dshRemoteRoutePanel li small{color:var(--dsw-alias-label-tertiary)}.dshRemoteRoutePanel li strong,.dshRemoteRoutePanel li span{overflow:hidden;text-overflow:ellipsis}.dshRemoteRoutePanel li strong{font-size:13px}.dshRemoteRoutePanel li span{color:var(--dsw-alias-label-secondary);font-size:11px}.dshRemoteRoutePanel>p{margin:14px 0 0;padding-top:12px;border-top:1px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.5}@media(max-width:620px){.dshRemoteSessionHeader{top:8px;right:52px}.dshRemoteSessionHeader>svg{display:none}.dshRemoteSessionHeader>span{max-width:130px}.dshRemoteEncrypted{display:none}.dshRemoteRoutePanel{top:42px;right:12px}.dshRemoteRoutePanel ol{flex-direction:column;gap:18px}.dshRemoteRoutePanel li:not(:last-child)::after{content:"\u2193";top:auto;right:auto;bottom:-16px;left:3px}}',
          ".dshRemoteModeButton:focus-visible,.dshRemotePage button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}",
          ".dshRemotePage{width:min(720px,100%);max-height:min(760px,calc(100vh - 40px));display:flex;flex-direction:column;background:var(--dsw-alias-bg-primary,#fff);color:var(--dsw-alias-label-primary);border-radius:14px;overflow:hidden;animation:dshRemotePageIn .18s cubic-bezier(.25,1,.5,1)}",
          ".dshRemotePageHeader{min-height:72px;display:flex;align-items:center;justify-content:space-between;gap:24px;padding:14px 24px;border-bottom:1px solid var(--dsw-alias-border-l2)}.dshRemotePageHeader>div{min-width:0}.dshRemotePageHeader strong{display:block;font-size:18px;line-height:1.4}.dshRemotePageHeader p{max-width:70ch;margin:3px 0 0;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:1.5}.dshRemotePageHeader>button{width:40px;height:40px;border:0;border-radius:8px;background:transparent;color:inherit;font-size:24px;cursor:pointer}.dshRemotePageHeader>button:hover{background:var(--dsw-alias-interactive-bg-hover)}",
          ".dshRemotePageBody{padding:24px;overflow:auto;display:flex;flex-direction:column;gap:24px}.dshRemotePageBody button{font:inherit;color:inherit}",
          ".dshRemoteSectionHeading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:10px}.dshRemoteSectionHeading>strong{font-size:14px}.dshRemoteSectionHeading>button{border:0;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;padding:6px 0}",
          ".dshRemoteSectionHeading>.dshRemoteAddWorkspace{width:30px;height:30px;display:inline-flex;align-items:center;justify-content:center;padding:0;border-radius:50%;font-size:20px;line-height:1}.dshRemoteSectionHeading>.dshRemoteAddWorkspace:hover{color:var(--dsw-alias-label-primary);background:var(--dsw-alias-interactive-bg-hover)}",
          ".dshRemoteHostList{display:flex;flex-direction:column;border-top:1px solid var(--dsw-alias-border-l2)}.dshRemoteHostList>button{min-height:58px;display:flex;align-items:center;justify-content:space-between;gap:16px;text-align:left;border:0;border-bottom:1px solid var(--dsw-alias-border-l2);background:transparent;padding:10px 4px;cursor:pointer}.dshRemoteHostList>button:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}.dshRemoteHostList>button:disabled{opacity:.5;cursor:default}.dshRemoteHostList small,.dshRemoteSelectedHost small{color:var(--dsw-alias-label-secondary)}",
          ".dshRemoteSelectedHost{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 14px;border-radius:10px;background:var(--dsw-alias-bg-layer-2)}",
          '.dshRemoteBrowser{display:flex;flex-direction:column}.dshRemoteCrumbs{display:flex;align-items:center;gap:4px;overflow:auto;padding:2px 0 10px}.dshRemoteCrumbs>button{flex:0 0 auto;border:0;background:transparent;color:var(--dsw-alias-label-secondary);padding:5px 7px;border-radius:6px;cursor:pointer}.dshRemoteCrumbs>button:not(:last-child)::after{content:" /";color:var(--dsw-alias-label-tertiary)}.dshRemoteCrumbs>button:disabled{color:var(--dsw-alias-label-primary);font-weight:600}',
          ".dshRemoteDirectoryList{min-height:72px;display:flex;flex-direction:column;border-top:1px solid var(--dsw-alias-border-l2)}.dshRemoteDirectoryList>button{min-height:52px;display:grid;grid-template-columns:auto 1fr;column-gap:10px;text-align:left;border:0;border-bottom:1px solid var(--dsw-alias-border-l2);background:transparent;padding:8px 4px;cursor:pointer}.dshRemoteDirectoryList>button:hover,.dshRemoteDirectoryList>button.isSelected{background:var(--dsw-alias-interactive-bg-hover)}.dshRemoteDirectoryList>button.isSelected{color:var(--dsw-alias-label-primary)}.dshRemoteDirectoryList>button>span:first-child{grid-row:1/3}.dshRemoteDirectoryList>button>small{grid-column:2;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis}.dshRemoteDirectoryList>p,.dshRemoteHint{margin:12px 0;color:var(--dsw-alias-label-secondary);font-size:13px}",
          ".dshRemotePathField{display:flex;flex-direction:column;gap:6px;margin-top:20px}.dshRemotePathField>span{font-size:13px;font-weight:600}.dshRemotePathField>input{min-height:40px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-3);color:inherit;padding:0 12px;font:inherit}.dshRemotePathField>small{color:var(--dsw-alias-label-secondary)}",
          ".dshRemoteOpenBar{position:sticky;bottom:-96px;display:flex;align-items:center;justify-content:space-between;gap:20px;margin-top:20px;padding:14px 0;background:var(--dsw-alias-bg-primary,#fff);border-top:1px solid var(--dsw-alias-border-l2)}.dshRemoteOpenBar>div{min-width:0;display:flex;flex-direction:column;gap:3px}.dshRemoteOpenBar span{color:var(--dsw-alias-label-secondary);font-size:12px}.dshRemoteOpenBar strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}.dshRemoteOpenBar>button,.dshRemoteEnable>button{min-height:40px;flex:0 0 auto;border:0;border-radius:8px;background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-primary,#fff);padding:8px 16px;cursor:pointer}.dshRemoteOpenBar>button:disabled,.dshRemoteEnable>button:disabled{opacity:.5;cursor:default}",
          ".dshRemoteEnable{max-width:600px;display:flex;flex-direction:column;align-items:flex-start;gap:10px}.dshRemoteEnable p{margin:0;color:var(--dsw-alias-label-secondary);line-height:1.5}",
          ".dshRemoteClientLogin{width:min(440px,100%);display:flex;flex-direction:column;gap:8px}.dshRemoteClientLogin input{min-height:40px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:var(--dsw-alias-bg-layer-3);color:inherit;padding:0 12px;font:inherit}.dshRemoteClientLogin button{align-self:flex-start;min-height:40px;border:0;border-radius:8px;background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-primary,#fff);padding:8px 16px;cursor:pointer}",
          ".dshRemoteLocalLink{align-self:flex-start;border:0;background:transparent;color:var(--dsw-alias-label-secondary);padding:4px 0;cursor:pointer}.dshRemoteLocalLink:hover{color:var(--dsw-alias-label-primary)}",
          "@keyframes dshRemotePageIn{from{opacity:0;transform:translateY(6px) scale(.99)}to{opacity:1;transform:none}}@media(prefers-reduced-motion:reduce){.dshRemotePage{animation:none}}@media(max-width:620px){.dshRemoteBackdrop{padding:12px}.dshRemotePage{max-height:calc(100vh - 24px)}.dshRemotePageHeader{padding:12px 16px}.dshRemotePageBody{padding:20px 16px}.dshRemoteOpenBar{align-items:flex-end}.dshRemoteOpenBar>button{min-height:48px}}",
          ".dshRemoteBackdrop{position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.42);display:grid;place-items:center;padding:20px}",
          ".dshRemoteDialog{width:min(460px,100%);max-height:80vh;overflow:auto;background:var(--dsw-alias-bg-primary,#fff);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l2);border-radius:14px;padding:18px;display:grid;gap:12px;box-shadow:0 18px 60px rgba(0,0,0,.28)}",
          ".dshRemoteDialog button,.dshRemoteDialog input{font:inherit;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:9px 10px;background:transparent;color:inherit}",
          ".dshRemoteDialog button:not(:disabled){cursor:pointer}.dshRemoteDialog button:disabled{opacity:.5}",
          ".dshRemoteHeader{display:flex;align-items:center;justify-content:space-between}.dshRemoteHeader button{border:0;font-size:22px;padding:0 6px}",
          ".dshRemoteDevices{display:grid;gap:8px}.dshRemoteDevices p{margin:4px 0;color:var(--dsw-alias-label-secondary)}",
          ".dshRemoteError{margin:0;color:var(--dsw-alias-state-danger,#c33)}",
          ".dshRemoteHostAccount{display:grid;gap:8px;border-top:1px solid var(--dsw-alias-border-l3);padding-top:12px}.dshRemoteHostAccount p{margin:0;color:var(--dsw-alias-label-secondary);font-size:13px}",
          ".dshRemoteLogin{display:grid;grid-template-columns:1fr 1fr;gap:8px}.dshRemoteLogin button{grid-column:1/-1}",
          ".dshRemotePluginCard{list-style:none;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:12px;transition:border-color .16s,background .16s}",
          ".dshRemotePluginCard:hover{border-color:var(--dsw-alias-label-dimmed)}.dshRemotePluginCard.isOpen{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-label-dimmed)}",
          ".dshRemotePluginCardHeader{display:flex;align-items:center}.dshRemotePluginCardToggle{appearance:none;width:100%;min-width:0;font:inherit;color:inherit;text-align:left;cursor:pointer;background:transparent;border:0;border-radius:12px;display:flex;align-items:center;gap:12px;padding:14px 16px}.dshRemotePluginCardToggle:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:-2px}",
          ".dshRemotePluginCardHeading{display:flex;flex-direction:column;gap:4px;min-width:0;flex:1}.dshRemotePluginCardHeading>strong{color:var(--dsw-alias-label-primary);font-size:15px;font-weight:600;line-height:1.4}.dshRemotePluginCardHeading>span{color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:1.5}.dshRemotePluginCardStatus{white-space:nowrap;background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);border-radius:999px;padding:1px 8px;font-size:11px;font-weight:500;line-height:17px}.dshRemotePluginCardStatus.isOnline{color:var(--dsw-alias-state-success,#287a3d)}.dshRemotePluginCardStatus.isReconnecting{color:var(--dsw-alias-state-warning,#8a5a00)}.dshRemotePluginCardStatus.isOffline{color:var(--dsw-alias-state-danger,#b42318)}.dshRemotePluginCardChevron{color:var(--dsw-alias-label-tertiary);font-size:18px;line-height:14px;transition:transform .16s}.dshRemotePluginCard.isOpen .dshRemotePluginCardChevron{transform:rotate(180deg)}",
          ".dshRemotePluginCardBody{border-top:1px solid var(--dsw-alias-border-l2);margin:0 16px;padding-bottom:8px}.dshRemoteSettings{display:flex;flex-direction:column;max-width:720px}.dshRemoteSettingsTop{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:12px 0}.dshRemoteSettingsState{margin:0;color:var(--dsw-alias-label-tertiary);font-size:13px;line-height:1.5}",
          ".dshRemoteField{display:flex;flex-direction:column;gap:6px;padding:12px 0}.dshRemoteField+.dshRemoteField{border-top:1px solid var(--dsw-alias-border-l2)}.dshRemoteField label{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:500;line-height:1.5}.dshRemoteField input{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);height:34px;font:inherit;color:var(--dsw-alias-label-primary);border-radius:8px;padding:0 12px;font-size:13px;line-height:1.5}.dshRemoteField input:focus-visible{border-color:var(--dsw-alias-brand-primary);outline:none}.dshRemoteField input:disabled{color:var(--dsw-alias-label-tertiary);cursor:default}.dshRemoteField p{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:1.5}",
          ".dshRemoteAssociation{min-width:0;flex:1;display:flex;flex-direction:column;gap:4px}.dshRemoteAssociation>span{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.5}.dshRemoteAssociation strong{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:500;line-height:1.5}.dshRemoteAssociation p{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:1.5}",
          ".dshRemoteConnection{border-top:1px solid var(--dsw-alias-border-l2);display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 0}.dshRemoteConnectionSummary{min-width:0;display:flex;flex-direction:column;gap:4px}.dshRemoteConnectionSummary>span{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.5}.dshRemoteConnectionSummary strong{display:flex;align-items:center;gap:7px;color:var(--dsw-alias-label-primary);font-size:14px;font-weight:500;line-height:1.5}.dshRemoteConnectionSummary p,.dshRemoteConnectionIssue{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:1.5}.dshRemoteConnectionDot{width:8px;height:8px;flex:0 0 auto;border-radius:999px;background:var(--dsw-alias-label-tertiary)}.dshRemoteConnectionDot.isOnline{background:var(--dsw-alias-state-success,#287a3d)}.dshRemoteConnectionDot.isReconnecting{background:var(--dsw-alias-state-warning,#8a5a00)}.dshRemoteConnectionDot.isOffline{background:var(--dsw-alias-state-danger,#b42318)}.dshRemoteConnectionIssue{color:var(--dsw-alias-state-danger,#b42318);padding:0 0 12px}.dshRemoteReconnect{appearance:none;flex:0 0 auto;font:inherit;cursor:pointer;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);min-height:34px;padding:5px 14px;font-size:13px;line-height:1.5}.dshRemoteReconnect:hover:not(:disabled){color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-dimmed);background:var(--dsw-alias-interactive-bg-hover)}.dshRemoteReconnect:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}.dshRemoteReconnect:disabled{opacity:.4;cursor:default}",
          ".dshRemoteSettingsFooter{border-top:1px solid var(--dsw-alias-border-l2);display:flex;justify-content:flex-end;align-items:center;gap:8px;padding:12px 0 4px}.dshRemoteSettingsFooter .dshRemoteError,.dshRemoteNotice{min-width:0;flex:1;margin:0;font-size:12px;line-height:1.5}.dshRemoteNotice{color:var(--dsw-alias-label-tertiary)}.dshRemoteDiscard,.dshRemoteSave{appearance:none;font:inherit;cursor:pointer;border:1px solid transparent;border-radius:8px;padding:5px 14px;font-size:13px;line-height:1.5}.dshRemoteDiscard{border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);background:transparent}.dshRemoteDiscard:hover:not(:disabled){color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-dimmed)}.dshRemoteSave{background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3)}.dshRemoteDiscard:disabled,.dshRemoteSave:disabled{opacity:.4;cursor:default}.dshRemoteDiscard:focus-visible,.dshRemoteSave:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}",
          "@media(max-width:620px){.dshRemotePluginCardStatus{display:none}.dshRemoteSettingsTop{gap:10px}.dshRemoteConnection{align-items:flex-start}.dshRemoteReconnect{min-height:40px}}"
        ].join(""), document.head.append(style), () => style.remove();
      }
      function apply(ctx) {
        let t = ctx.locale.bind(localeNamespace), control = async (endpoint, payload = {}) => {
          let result;
          for (let attempt = 0; ; attempt += 1)
            try {
              result = await ctx.connection.rpc.call("/remote", endpoint, payload);
              break;
            } catch (reason) {
              if (attempt >= 19 || !isPendingControlRoute(reason)) throw reason;
              await delay(100);
            }
          if (!result.ok) throw new Error(result.error?.message ?? t("remoteRequestFailed"));
          return result.value;
        };
        ctx.effect(() => ctx.locale.register(localeNamespace, { zh, en }), "dsh-remote: dictionaries"), ctx.effect(installStyle, "dsh-remote: client styles"), ctx.slots.inject("shell.overlay", () => ctx.slots.register({
          name: "shell.overlay",
          id: "dsh-remote-global-context",
          order: 20,
          locale: localeNamespace,
          inject: () => ({ control })
        }, RemoteSessionHeaderAction)), ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
          name: "sidebar.footer.action",
          id: "dsh-remote-workspace",
          order: -20,
          locale: localeNamespace,
          inject: () => ({ control })
        }, RemoteWorkspaceAction)), ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
          name: "settings.plugin.item",
          id: "dsh-remote",
          order: 30,
          locale: localeNamespace,
          inject: () => ({ control })
        }, RemotePluginOptions));
      }
      function isPendingControlRoute(reason) {
        return reason instanceof Error && /transport failure for \/remote\/[^:]+: HTTP 405$/.test(reason.message);
      }
      function delay(ms) {
        return new Promise((resolve) => window.setTimeout(resolve, ms));
      }
      function messageOf(reason) {
        return reason instanceof Error ? reason.message : String(reason);
      }
      return module.exports.apply = apply, module.exports.inject = inject, module.exports;
    }
  });
})();
