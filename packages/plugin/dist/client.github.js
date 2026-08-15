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
    hostRegistrationCode: "One-time connection code",
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
    registrationCode: "Connection code",
    registrationCodeHint: "Generate it after signing in on the Server website. Use it once to connect this device.",
    accountHint: "The account must belong to the selected Server.",
    password: "Password",
    passwordHint: "Used only for this HTTPS authorization request and never saved.",
    modeSavedNeedsAuthorization: "Mode saved. Authorize {role} before connecting. Existing registrations were kept.",
    modeSavedReused: "Mode saved. Existing registration reused. Restart Harness to apply.",
    modeSavedOwnedRole: "Mode saved. This owned device was authorized automatically. Restart Harness to apply.",
    enterRegistrationCode: "Enter the connection code.",
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
    registering: "Registering\u2026"
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
    hostRegistrationCode: "\u4E00\u6B21\u6027\u8FDE\u63A5\u7801",
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
    registrationCode: "\u8FDE\u63A5\u7801",
    registrationCodeHint: "\u767B\u5F55 Server \u7F51\u9875\u540E\u751F\u6210\uFF0C\u7528\u4E00\u6B21\u5373\u53EF\u8FDE\u63A5\u8FD9\u53F0\u8BBE\u5907\u3002",
    accountHint: "\u8D26\u53F7\u5FC5\u987B\u5C5E\u4E8E\u6240\u9009 Server\u3002",
    password: "\u5BC6\u7801",
    passwordHint: "\u4EC5\u7528\u4E8E\u672C\u6B21 HTTPS \u6388\u6743\u8BF7\u6C42\uFF0C\u4E0D\u4F1A\u4FDD\u5B58\u3002",
    modeSavedNeedsAuthorization: "\u6A21\u5F0F\u5DF2\u4FDD\u5B58\u3002\u8FDE\u63A5\u524D\u8BF7\u5148\u6388\u6743 {role}\uFF1B\u5DF2\u6709\u6CE8\u518C\u4FE1\u606F\u5DF2\u4FDD\u7559\u3002",
    modeSavedReused: "\u6A21\u5F0F\u5DF2\u4FDD\u5B58\u5E76\u590D\u7528\u5DF2\u6709\u6CE8\u518C\u4FE1\u606F\u3002\u91CD\u542F Harness \u540E\u751F\u6548\u3002",
    modeSavedOwnedRole: "\u6A21\u5F0F\u5DF2\u4FDD\u5B58\uFF0C\u5E76\u5DF2\u81EA\u52A8\u6388\u6743\u6B64\u81EA\u6709\u8BBE\u5907\u3002\u91CD\u542F Harness \u540E\u751F\u6548\u3002",
    enterRegistrationCode: "\u8BF7\u8F93\u5165\u8FDE\u63A5\u7801\u3002",
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
    registering: "\u6B63\u5728\u6CE8\u518C\u2026"
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
        let { t } = props, [open, setOpen] = React.useState(!1), [serverUrl, setServerUrl] = React.useState(""), role = "host", [hostEnrollment, setHostEnrollment] = React.useState("account"), [registrationCode, setRegistrationCode] = React.useState(""), [email, setEmail] = React.useState(""), [password, setPassword] = React.useState(""), [associations, setAssociations] = React.useState({}), [loaded, setLoaded] = React.useState(!1), [writable, setWritable] = React.useState(!1), [busy, setBusy] = React.useState(!1), [reconnectBusy, setReconnectBusy] = React.useState(!1), [hostStatus, setHostStatus] = React.useState(void 0), [notice, setNotice] = React.useState(void 0), [error, setError] = React.useState(void 0), [settingsView, setSettingsView] = React.useState(void 0), persistedServerUrl = settingsView?.config.serverUrl ?? "https://dsh.r2049.cn", association = associations.host, draftDirty = settingsView !== void 0 && serverUrl !== persistedServerUrl || (email !== "" || password !== "" || registrationCode !== ""), applyView = (view) => {
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
              if (hostEnrollment === "host_registration_code" && registrationCode.trim() === "")
                throw new Error(t("enterRegistrationCode"));
              if (hostEnrollment === "account" && (email.trim() === "" || password === ""))
                throw new Error(t("enterAccountPassword"));
              let result = await props.control("settings.configure", {
                serverUrl,
                role,
                ...hostEnrollment === "host_registration_code" ? { registrationCode } : { email, password }
              });
              applyView(result.settings), setNotice({ key: "associationSaved" }), setRegistrationCode(""), setEmail(""), setPassword("");
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
            applyView(view), setEmail(""), setPassword(""), setRegistrationCode(""), setNotice({ key: "signedOut" });
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
          settingsView !== void 0 && applyView(settingsView), setRegistrationCode(""), setEmail(""), setPassword(""), setNotice(void 0), setError(void 0);
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
                { className: "dshRemoteAuthMethod" },
                React.createElement("span", { className: "dshRemoteFieldLabel" }, t("authorizationMethod")),
                React.createElement(
                  "div",
                  { className: "dshRemoteAuthTabs", role: "tablist", "aria-label": t("authorizationMethod") },
                  React.createElement("button", {
                    type: "button",
                    role: "tab",
                    id: "dsh-remote-auth-account-tab",
                    className: hostEnrollment === "account" ? "isActive" : "",
                    "aria-selected": hostEnrollment === "account",
                    "aria-controls": "dsh-remote-auth-account-panel",
                    disabled: busy || !writable,
                    onClick: () => {
                      setHostEnrollment("account"), setNotice(void 0), setError(void 0);
                    }
                  }, t("accountPassword")),
                  React.createElement("button", {
                    type: "button",
                    role: "tab",
                    id: "dsh-remote-auth-code-tab",
                    className: hostEnrollment === "host_registration_code" ? "isActive" : "",
                    "aria-selected": hostEnrollment === "host_registration_code",
                    "aria-controls": "dsh-remote-auth-code-panel",
                    disabled: busy || !writable,
                    onClick: () => {
                      setHostEnrollment("host_registration_code"), setNotice(void 0), setError(void 0);
                    }
                  }, t("registrationCode"))
                )
              ),
              hostEnrollment === "host_registration_code" ? React.createElement(
                "div",
                {
                  className: "dshRemoteAuthPanel",
                  role: "tabpanel",
                  id: "dsh-remote-auth-code-panel",
                  "aria-labelledby": "dsh-remote-auth-code-tab"
                },
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
                )
              ) : React.createElement(
                "div",
                {
                  className: "dshRemoteAuthPanel",
                  role: "tabpanel",
                  id: "dsh-remote-auth-account-panel",
                  "aria-labelledby": "dsh-remote-auth-account-tab"
                },
                React.createElement(
                  "div",
                  { className: "dshRemoteField" },
                  React.createElement("label", { htmlFor: "dsh-remote-account" }, t("account")),
                  React.createElement("input", {
                    id: "dsh-remote-account",
                    type: "email",
                    value: email,
                    disabled: busy || !writable,
                    required: !0,
                    autoComplete: "username",
                    onChange: (event) => {
                      setEmail(event.target.value), setNotice(void 0);
                    }
                  }),
                  React.createElement("p", null, t("accountHint"))
                ),
                React.createElement(
                  "div",
                  { className: "dshRemoteField" },
                  React.createElement("label", { htmlFor: "dsh-remote-password" }, t("password")),
                  React.createElement("input", {
                    id: "dsh-remote-password",
                    type: "password",
                    value: password,
                    disabled: busy || !writable,
                    required: !0,
                    autoComplete: "current-password",
                    onChange: (event) => {
                      setPassword(event.target.value), setNotice(void 0);
                    }
                  }),
                  React.createElement("p", null, t("passwordHint"))
                )
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
      function installStyle() {
        let style = document.createElement("style");
        return style.dataset.pluginCss = "dsh-remote", style.textContent = [
          ".dshRemoteModeButton{min-height:36px;border:0;background:transparent;color:var(--dsw-alias-label-primary);display:flex;align-items:center;gap:8px;padding:0 10px;border-radius:8px;cursor:pointer}",
          ".dshRemoteModeButton:hover{background:var(--dsw-alias-interactive-bg-hover)}",
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
          ".dshRemoteAuthPanel{display:flex;flex-direction:column}.dshRemoteField,.dshRemoteAuthMethod{display:flex;flex-direction:column;gap:6px;padding:12px 0}.dshRemoteField+.dshRemoteField,.dshRemoteField+.dshRemoteAuthMethod,.dshRemoteAuthMethod+.dshRemoteField,.dshRemoteAuthMethod+.dshRemoteAuthPanel>.dshRemoteField:first-child{border-top:1px solid var(--dsw-alias-border-l2)}.dshRemoteField label,.dshRemoteFieldLabel{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:500;line-height:1.5}.dshRemoteField input{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);height:34px;font:inherit;color:var(--dsw-alias-label-primary);border-radius:8px;padding:0 12px;font-size:13px;line-height:1.5}.dshRemoteField input:focus-visible{border-color:var(--dsw-alias-brand-primary);outline:none}.dshRemoteField input:disabled{color:var(--dsw-alias-label-tertiary);cursor:default}.dshRemoteField p{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:1.5}",
          ".dshRemoteAuthTabs{align-self:flex-start;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:8px;display:flex;padding:2px}.dshRemoteAuthTabs button{appearance:none;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-tertiary);font:inherit;font-size:13px;line-height:28px;padding:0 12px;cursor:pointer}.dshRemoteAuthTabs button:hover:not(:disabled){color:var(--dsw-alias-label-primary)}.dshRemoteAuthTabs button.isActive{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);font-weight:500}.dshRemoteAuthTabs button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:0}.dshRemoteAuthTabs button:disabled{cursor:default;opacity:.45}",
          ".dshRemoteAssociation{min-width:0;flex:1;display:flex;flex-direction:column;gap:4px}.dshRemoteAssociation>span{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.5}.dshRemoteAssociation strong{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:500;line-height:1.5}.dshRemoteAssociation p{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:1.5}",
          ".dshRemoteConnection{border-top:1px solid var(--dsw-alias-border-l2);display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 0}.dshRemoteConnectionSummary{min-width:0;display:flex;flex-direction:column;gap:4px}.dshRemoteConnectionSummary>span{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.5}.dshRemoteConnectionSummary strong{display:flex;align-items:center;gap:7px;color:var(--dsw-alias-label-primary);font-size:14px;font-weight:500;line-height:1.5}.dshRemoteConnectionSummary p,.dshRemoteConnectionIssue{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:1.5}.dshRemoteConnectionDot{width:8px;height:8px;flex:0 0 auto;border-radius:999px;background:var(--dsw-alias-label-tertiary)}.dshRemoteConnectionDot.isOnline{background:var(--dsw-alias-state-success,#287a3d)}.dshRemoteConnectionDot.isReconnecting{background:var(--dsw-alias-state-warning,#8a5a00)}.dshRemoteConnectionDot.isOffline{background:var(--dsw-alias-state-danger,#b42318)}.dshRemoteConnectionIssue{color:var(--dsw-alias-state-danger,#b42318);padding:0 0 12px}.dshRemoteReconnect{appearance:none;flex:0 0 auto;font:inherit;cursor:pointer;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);min-height:34px;padding:5px 14px;font-size:13px;line-height:1.5}.dshRemoteReconnect:hover:not(:disabled){color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-dimmed);background:var(--dsw-alias-interactive-bg-hover)}.dshRemoteReconnect:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}.dshRemoteReconnect:disabled{opacity:.4;cursor:default}",
          ".dshRemoteSettingsFooter{border-top:1px solid var(--dsw-alias-border-l2);display:flex;justify-content:flex-end;align-items:center;gap:8px;padding:12px 0 4px}.dshRemoteSettingsFooter .dshRemoteError,.dshRemoteNotice{min-width:0;flex:1;margin:0;font-size:12px;line-height:1.5}.dshRemoteNotice{color:var(--dsw-alias-label-tertiary)}.dshRemoteDiscard,.dshRemoteSave{appearance:none;font:inherit;cursor:pointer;border:1px solid transparent;border-radius:8px;padding:5px 14px;font-size:13px;line-height:1.5}.dshRemoteDiscard{border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);background:transparent}.dshRemoteDiscard:hover:not(:disabled){color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-label-dimmed)}.dshRemoteSave{background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3)}.dshRemoteDiscard:disabled,.dshRemoteSave:disabled{opacity:.4;cursor:default}.dshRemoteDiscard:focus-visible,.dshRemoteSave:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}",
          "@media(max-width:620px){.dshRemotePluginCardStatus{display:none}.dshRemoteSettingsTop{gap:10px}.dshRemoteConnection{align-items:flex-start}.dshRemoteReconnect{min-height:40px}.dshRemoteAuthTabs{align-self:stretch}.dshRemoteAuthTabs button{flex:1;padding:0 8px}}"
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
        ctx.effect(() => ctx.locale.register(localeNamespace, { zh, en }), "dsh-remote: dictionaries"), ctx.effect(installStyle, "dsh-remote: client styles"), ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
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
