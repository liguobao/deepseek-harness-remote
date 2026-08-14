"use strict";
(() => {
  // src/client.ts
  var clientModuleId = "dsh-remote";
  window.__ModuleLoader__.load({
    id: clientModuleId,
    factory: (require2) => {
      let module = { exports: {} }, React = require2("react"), inject = ["connection", "slots"];
      function RemotePluginOptions(props) {
        let [open, setOpen] = React.useState(!1), [serverUrl, setServerUrl] = React.useState(""), [role, setRole] = React.useState("host"), [deviceName, setDeviceName] = React.useState(""), [authorizationCode, setAuthorizationCode] = React.useState(""), [email, setEmail] = React.useState(""), [password, setPassword] = React.useState(""), [pending, setPending] = React.useState(void 0), [loaded, setLoaded] = React.useState(!1), [writable, setWritable] = React.useState(!1), [busy, setBusy] = React.useState(!1), [saved, setSaved] = React.useState(!1), [dirty, setDirty] = React.useState(!1), [error, setError] = React.useState(void 0), load = async () => {
          let view = await props.control("settings.get");
          setServerUrl(view.config.serverUrl ?? "https://dsh.r2049.cn"), setRole(view.config.role === "client" ? "client" : "host"), setDeviceName(view.deviceName), setPending(view.pendingPairing), setWritable(view.writable), setDirty(!1), setLoaded(!0);
        };
        React.useEffect(() => {
          load().catch((reason) => setError(messageOf(reason)));
        }, []);
        let save = async (event) => {
          if (event.preventDefault(), !!writable) {
            setBusy(!0), setSaved(!1), setError(void 0);
            try {
              let result = await props.control("settings.configure", {
                serverUrl,
                role,
                ...role === "client" ? { authorizationCode } : { email, password }
              });
              setPending(result.settings.pendingPairing), setSaved(result.status === "authorized"), setDirty(!1), setAuthorizationCode(""), setPassword("");
            } catch (reason) {
              setError(messageOf(reason));
            } finally {
              setBusy(!1);
            }
          }
        };
        React.useEffect(() => {
          if (pending === void 0) return;
          let poll = () => {
            props.control("settings.pairing.status", { pairingId: pending.pairingId }).then((result) => {
              setPending(result.settings.pendingPairing), result.status === "paired" && setSaved(!0), (result.status === "rejected" || result.status === "expired") && setError(`Authorization ${result.status}.`);
            }).catch((reason) => setError(messageOf(reason)));
          };
          poll();
          let timer = window.setInterval(poll, 1200);
          return () => window.clearInterval(timer);
        }, [pending?.pairingId]);
        let exitOptions = () => {
          setOpen(!1);
        };
        return React.createElement(
          "li",
          { className: `dshRemotePluginCard${open ? " isOpen" : ""}` },
          React.createElement(
            "button",
            {
              type: "button",
              className: "dshRemotePluginCardHeader",
              "aria-expanded": open,
              onClick: () => setOpen((current) => !current)
            },
            React.createElement(
              "span",
              { className: "dshRemotePluginCardHeading" },
              React.createElement("strong", null, "DSH Remote"),
              React.createElement("span", null, "Remote Host and Client connection")
            ),
            dirty ? React.createElement("span", { className: "dshRemotePluginCardStatus" }, "Unsaved") : null,
            pending === void 0 ? null : React.createElement("span", { className: "dshRemotePluginCardStatus" }, "Pairing\u2026"),
            React.createElement("span", { className: "dshRemotePluginCardChevron", "aria-hidden": !0 }, "\u2304")
          ),
          open ? React.createElement(
            "div",
            { className: "dshRemotePluginCardBody" },
            loaded ? React.createElement(
              "form",
              { className: "dshRemoteSettings", onSubmit: (event) => void save(event) },
              React.createElement(
                "div",
                { className: "dshRemoteSettingsIntro" },
                React.createElement("p", null, `Device: ${deviceName}. Choose a role and authorize it with the Server.`)
              ),
              React.createElement(
                "label",
                null,
                React.createElement("span", null, "Server URL"),
                React.createElement("input", {
                  type: "url",
                  value: serverUrl,
                  disabled: busy || !writable,
                  required: !0,
                  placeholder: "https://dsh.r2049.cn",
                  onChange: (event) => {
                    setServerUrl(event.target.value), setSaved(!1), setDirty(!0);
                  }
                })
              ),
              React.createElement(
                "div",
                { className: "dshRemoteRoleField" },
                React.createElement("span", null, "Role"),
                React.createElement(
                  "button",
                  {
                    type: "button",
                    className: "dshRemoteRoleSwitch",
                    role: "switch",
                    "aria-checked": role === "client",
                    disabled: busy || !writable,
                    onClick: () => {
                      setRole((current) => current === "host" ? "client" : "host"), setSaved(!1), setDirty(!0), setError(void 0);
                    }
                  },
                  React.createElement("span", { className: role === "host" ? "isActive" : "" }, "Host"),
                  React.createElement("span", { className: role === "client" ? "isActive" : "" }, "Client")
                )
              ),
              role === "client" ? React.createElement(
                "label",
                { className: "dshRemoteSettingsWide" },
                React.createElement("span", null, "Authorization code"),
                React.createElement("input", {
                  value: authorizationCode,
                  disabled: busy || !writable || pending !== void 0,
                  required: pending === void 0,
                  autoComplete: "one-time-code",
                  placeholder: "Enter the code shown on the Host",
                  onChange: (event) => {
                    setAuthorizationCode(event.target.value), setSaved(!1), setDirty(!0);
                  }
                })
              ) : React.createElement(
                React.Fragment,
                null,
                React.createElement(
                  "label",
                  null,
                  React.createElement("span", null, "Account"),
                  React.createElement("input", {
                    type: "email",
                    value: email,
                    disabled: busy || !writable,
                    required: !0,
                    autoComplete: "username",
                    onChange: (event) => {
                      setEmail(event.target.value), setSaved(!1), setDirty(!0);
                    }
                  })
                ),
                React.createElement(
                  "label",
                  null,
                  React.createElement("span", null, "Password"),
                  React.createElement("input", {
                    type: "password",
                    value: password,
                    disabled: busy || !writable,
                    required: !0,
                    autoComplete: "current-password",
                    onChange: (event) => {
                      setPassword(event.target.value), setSaved(!1), setDirty(!0);
                    }
                  })
                )
              ),
              pending === void 0 ? null : React.createElement(
                "p",
                { className: "dshRemotePending" },
                `Waiting for ${pending.host.name} to approve. Verify fingerprint: ${pending.host.fingerprint}`
              ),
              React.createElement(
                "div",
                { className: "dshRemoteSettingsActions" },
                React.createElement("button", { type: "submit", disabled: busy || !writable || pending !== void 0 }, busy ? "Authorizing\u2026" : "Save"),
                React.createElement("button", { type: "button", disabled: busy || pending !== void 0, onClick: exitOptions }, "Exit"),
                saved ? React.createElement("span", null, "Saved. Restart Harness to apply.") : null
              ),
              writable ? null : React.createElement("p", { className: "dshRemoteError" }, "This DSH profile does not provide writable user settings."),
              error === void 0 ? null : React.createElement("p", { className: "dshRemoteError", role: "alert" }, error)
            ) : React.createElement("p", { className: "dshRemoteSettingsState" }, error ?? "Loading DSH Remote settings\u2026")
          ) : null
        );
      }
      function RemoteModeAction(props) {
        let [open, setOpen] = React.useState(!1), [status, setStatus] = React.useState(void 0), [devices, setDevices] = React.useState([]), [code, setCode] = React.useState(""), [pendingPairing, setPendingPairing] = React.useState(void 0), [pendingHost, setPendingHost] = React.useState(void 0), [hostCode, setHostCode] = React.useState(void 0), [hostClaims, setHostClaims] = React.useState([]), [email, setEmail] = React.useState(""), [password, setPassword] = React.useState(""), [busy, setBusy] = React.useState(!1), [error, setError] = React.useState(void 0), [supported, setSupported] = React.useState(!0), refresh = async () => {
          let [nextStatus, nextDevices] = await Promise.all([
            props.control("status"),
            props.control("devices").catch(() => [])
          ]);
          setStatus(nextStatus), setDevices(nextDevices);
        }, refreshHostClaims = async () => {
          setHostClaims(await props.control("host.pairings").catch(() => []));
        }, refreshStatus = async () => {
          setStatus(await props.control("status"));
        };
        React.useEffect(() => {
          refresh().catch((reason) => {
            setError(messageOf(reason)), setSupported(!1);
          });
        }, []), React.useEffect(() => {
          if (pendingPairing === void 0) return;
          let timer = window.setInterval(() => {
            props.control("pairing.status", { pairingId: pendingPairing }).then((result) => {
              result.status === "paired" && (setPendingPairing(void 0), setPendingHost(void 0), refresh()), (result.status === "rejected" || result.status === "expired") && (setPendingPairing(void 0), setPendingHost(void 0), setError(`Pairing ${result.status}.`));
            }).catch((reason) => setError(messageOf(reason)));
          }, 1200);
          return () => window.clearInterval(timer);
        }, [pendingPairing]), React.useEffect(() => {
          if (!open) return;
          Promise.all([refreshHostClaims(), refreshStatus()]);
          let timer = window.setInterval(() => {
            refreshHostClaims(), refreshStatus();
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
        }, pair = async () => {
          if (code.trim() !== "") {
            setBusy(!0), setError(void 0);
            try {
              let claim = await props.control("pairing.claim", { code: code.trim() });
              setPendingPairing(claim.pairingId), setPendingHost(claim.host), setCode("");
            } catch (reason) {
              setError(messageOf(reason));
            } finally {
              setBusy(!1);
            }
          }
        }, createHostPairing = async () => {
          setBusy(!0), setError(void 0);
          try {
            let result = await props.control("host.pairing.create");
            setHostCode(result.code);
          } catch (reason) {
            setError(messageOf(reason));
          } finally {
            setBusy(!1);
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
        }, confirmHostPairing = async (pairingId, decision) => {
          setBusy(!0), setError(void 0);
          try {
            await props.control("host.pairing.confirm", { pairingId, decision }), await refreshHostClaims();
          } catch (reason) {
            setError(messageOf(reason));
          } finally {
            setBusy(!1);
          }
        }, label = status?.mode === "remote" ? `Remote \xB7 ${status.target?.name ?? "Host"}` : "Local";
        return supported ? React.createElement(
          React.Fragment,
          null,
          React.createElement("button", {
            type: "button",
            className: "dshRemoteModeButton",
            title: "Switch Local / Remote Harness target",
            "aria-label": "Switch Local / Remote Harness target",
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
                "aria-label": "Harness target"
              },
              React.createElement(
                "div",
                { className: "dshRemoteHeader" },
                React.createElement("strong", null, "Harness target"),
                React.createElement("button", { type: "button", onClick: () => setOpen(!1), "aria-label": "Close" }, "\xD7")
              ),
              React.createElement("button", {
                type: "button",
                disabled: busy || status?.mode === "local",
                onClick: () => void switchMode("local")
              }, "This machine (Local)"),
              React.createElement("div", { className: "dshRemoteDevices" }, devices.length === 0 ? React.createElement("p", null, "No paired remote Host.") : devices.map((device) => React.createElement("button", {
                type: "button",
                key: device.deviceId,
                disabled: busy || !device.online || status?.target?.deviceId === device.deviceId,
                onClick: () => void switchMode("remote", device.deviceId)
              }, `${device.name} \xB7 ${device.online ? "Online" : "Offline"}`))),
              React.createElement(
                "div",
                { className: "dshRemotePair" },
                React.createElement("input", {
                  value: code,
                  disabled: busy || pendingPairing !== void 0,
                  placeholder: "Pairing code",
                  "aria-label": "Pairing code",
                  onChange: (event) => setCode(event.target.value)
                }),
                React.createElement("button", {
                  type: "button",
                  disabled: busy || pendingPairing !== void 0 || code.trim() === "",
                  onClick: () => void pair()
                }, pendingPairing === void 0 ? "Pair" : "Waiting for Host\u2026")
              ),
              pendingHost === void 0 ? null : React.createElement(
                "p",
                { className: "dshRemoteFingerprint" },
                `Verify on the Host: ${pendingHost.name} \xB7 ${pendingHost.fingerprint}`
              ),
              status?.hostPairingAvailable && status.host !== void 0 ? React.createElement(
                "div",
                { className: "dshRemoteHostAccount" },
                React.createElement("strong", null, "This machine as Remote Host"),
                React.createElement("p", null, status.host.online ? `Connected${status.host.account === void 0 ? "" : ` as ${status.host.account}`}` : status.host.accountRequired ? "Sign in to authorize this Host on the selected Server." : status.host.error === void 0 ? "Checking Host registration\u2026" : `Host unavailable: ${status.host.error}`),
                status.host.accountRequired ? React.createElement(
                  "div",
                  { className: "dshRemoteLogin" },
                  React.createElement("input", {
                    type: "email",
                    value: email,
                    disabled: busy,
                    autoComplete: "username",
                    placeholder: "Server account email",
                    "aria-label": "Server account email",
                    onChange: (event) => setEmail(event.target.value)
                  }),
                  React.createElement("input", {
                    type: "password",
                    value: password,
                    disabled: busy,
                    autoComplete: "current-password",
                    placeholder: "Password",
                    "aria-label": "Server account password",
                    onChange: (event) => setPassword(event.target.value)
                  }),
                  React.createElement("button", {
                    type: "button",
                    disabled: busy || email.trim() === "" || password === "",
                    onClick: () => void loginHost()
                  }, busy ? "Signing in\u2026" : "Sign in and register Host")
                ) : null
              ) : null,
              status?.hostPairingAvailable ? React.createElement(
                "div",
                { className: "dshRemoteHostPairing" },
                React.createElement("button", {
                  type: "button",
                  disabled: busy || status.host?.online !== !0,
                  onClick: () => void createHostPairing()
                }, hostCode === void 0 ? "Pair another client to this Host" : `Code: ${hostCode}`),
                ...hostClaims.map((claim) => React.createElement(
                  "div",
                  { className: "dshRemoteClaim", key: claim.pairingId },
                  React.createElement("span", null, `${claim.client.name} \xB7 ${claim.client.fingerprint}`),
                  React.createElement("button", { type: "button", disabled: busy, onClick: () => void confirmHostPairing(claim.pairingId, "approve") }, "Approve"),
                  React.createElement("button", { type: "button", disabled: busy, onClick: () => void confirmHostPairing(claim.pairingId, "deny") }, "Deny")
                ))
              ) : null,
              error === void 0 ? null : React.createElement("p", { className: "dshRemoteError", role: "alert" }, error)
            )
          ) : null
        ) : null;
      }
      function installStyle() {
        let style = document.createElement("style");
        return style.dataset.pluginCss = "@dsh-remote/plugin", style.textContent = [
          ".dshRemoteModeButton{min-height:36px;border:0;background:transparent;color:var(--dsw-alias-label-primary);display:flex;align-items:center;gap:8px;padding:0 10px;border-radius:8px;cursor:pointer}",
          ".dshRemoteModeButton:hover{background:var(--dsw-alias-interactive-bg-hover)}",
          ".dshRemoteBackdrop{position:fixed;inset:0;z-index:1000;background:rgba(0,0,0,.42);display:grid;place-items:center;padding:20px}",
          ".dshRemoteDialog{width:min(460px,100%);max-height:80vh;overflow:auto;background:var(--dsw-alias-bg-primary,#fff);color:var(--dsw-alias-label-primary);border:1px solid var(--dsw-alias-border-l2);border-radius:14px;padding:18px;display:grid;gap:12px;box-shadow:0 18px 60px rgba(0,0,0,.28)}",
          ".dshRemoteDialog button,.dshRemoteDialog input{font:inherit;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:9px 10px;background:transparent;color:inherit}",
          ".dshRemoteDialog button:not(:disabled){cursor:pointer}.dshRemoteDialog button:disabled{opacity:.5}",
          ".dshRemoteHeader{display:flex;align-items:center;justify-content:space-between}.dshRemoteHeader button{border:0;font-size:22px;padding:0 6px}",
          ".dshRemoteDevices{display:grid;gap:8px}.dshRemoteDevices p{margin:4px 0;color:var(--dsw-alias-label-secondary)}",
          ".dshRemotePair{display:grid;grid-template-columns:1fr auto;gap:8px}.dshRemoteError{margin:0;color:var(--dsw-alias-state-danger,#c33)}",
          ".dshRemoteHostAccount{display:grid;gap:8px;border-top:1px solid var(--dsw-alias-border-l3);padding-top:12px}.dshRemoteHostAccount p{margin:0;color:var(--dsw-alias-label-secondary);font-size:13px}",
          ".dshRemoteLogin{display:grid;grid-template-columns:1fr 1fr;gap:8px}.dshRemoteLogin button{grid-column:1/-1}",
          ".dshRemoteHostPairing{display:grid;gap:8px;border-top:1px solid var(--dsw-alias-border-l3);padding-top:12px}.dshRemoteClaim{display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:6px;font-size:13px}",
          ".dshRemoteFingerprint{margin:0;font-size:13px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}",
          ".dshRemotePluginCard{list-style:none;border:1px solid var(--dsw-alias-border-l2);border-radius:12px;overflow:hidden;background:var(--dsw-alias-bg-primary)}",
          ".dshRemotePluginCard.isOpen{border-color:var(--dsw-alias-border-l1)}.dshRemotePluginCardHeader{width:100%;border:0!important;border-radius:0!important;display:flex;align-items:center;gap:12px;padding:14px 16px!important;background:transparent!important;text-align:left;color:var(--dsw-alias-label-primary)!important}.dshRemotePluginCardHeader:not(:disabled){cursor:pointer}",
          ".dshRemotePluginCardHeading{display:grid;gap:3px;min-width:0;flex:1}.dshRemotePluginCardHeading>span{color:var(--dsw-alias-label-secondary);font-size:13px}.dshRemotePluginCardStatus{font-size:12px;color:var(--dsw-alias-label-secondary)}.dshRemotePluginCardChevron{font-size:18px;transition:transform .16s ease}.dshRemotePluginCard.isOpen .dshRemotePluginCardChevron{transform:rotate(180deg)}",
          ".dshRemotePluginCardBody{border-top:1px solid var(--dsw-alias-border-l3);padding:16px}.dshRemoteSettings{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;max-width:720px}",
          ".dshRemoteSettingsIntro,.dshRemoteSettingsActions,.dshRemoteSettingsWide,.dshRemotePending,.dshRemoteSettings>.dshRemoteError{grid-column:1/-1}.dshRemoteSettingsIntro p,.dshRemoteSettingsState{margin:5px 0 0;color:var(--dsw-alias-label-secondary);line-height:1.5}",
          ".dshRemoteSettings label,.dshRemoteRoleField{display:grid;gap:6px;color:var(--dsw-alias-label-secondary);font-size:13px}.dshRemoteSettings label>span:first-child,.dshRemoteRoleField>span:first-child{font-weight:600;color:var(--dsw-alias-label-primary)}",
          ".dshRemoteSettings input,.dshRemoteSettings select,.dshRemoteSettings button{min-height:38px;border:1px solid var(--dsw-alias-border-l2);border-radius:8px;padding:8px 10px;background:transparent;color:var(--dsw-alias-label-primary);font:inherit}",
          ".dshRemoteRoleSwitch{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:3px!important}.dshRemoteRoleSwitch span{display:grid;place-items:center;border-radius:6px;color:var(--dsw-alias-label-secondary)}.dshRemoteRoleSwitch span.isActive{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);font-weight:600}",
          ".dshRemotePending{margin:0;padding:10px 12px;border-radius:8px;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary);font-size:13px;font-variant-numeric:tabular-nums}.dshRemoteSettingsActions{display:flex;align-items:center;gap:12px}.dshRemoteSettingsActions button:not(:disabled){cursor:pointer}.dshRemoteSettingsActions span{color:var(--dsw-alias-label-secondary);font-size:13px}",
          "@media(max-width:700px){.dshRemoteSettings{grid-template-columns:1fr}.dshRemoteSettingsIntro,.dshRemoteSettingsActions,.dshRemoteSettingsWide,.dshRemotePending,.dshRemoteSettings>.dshRemoteError{grid-column:1}}"
        ].join(""), document.head.append(style), () => style.remove();
      }
      function apply(ctx) {
        let control = async (endpoint, payload = {}) => {
          let result = await ctx.connection.rpc.call("/remote", endpoint, payload);
          if (!result.ok) throw new Error(result.error?.message ?? "Remote mode request failed.");
          return result.value;
        };
        ctx.effect(installStyle, "dsh-remote: client styles"), ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
          name: "sidebar.footer.action",
          id: "dsh-remote-mode",
          order: -20,
          inject: () => ({ control })
        }, RemoteModeAction)), ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
          name: "settings.plugin.item",
          id: "dsh-remote",
          order: 30,
          inject: () => ({ control })
        }, RemotePluginOptions));
      }
      function messageOf(reason) {
        return reason instanceof Error ? reason.message : String(reason);
      }
      return module.exports.apply = apply, module.exports.inject = inject, module.exports;
    }
  });
})();
