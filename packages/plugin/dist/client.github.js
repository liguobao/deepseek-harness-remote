"use strict";
(() => {
  // src/client.ts
  var clientModuleId = "deepseek-harness-remote";
  window.__ModuleLoader__.load({
    id: clientModuleId,
    factory: (require2) => {
      let module = { exports: {} }, React = require2("react"), inject = ["connection", "slots"];
      function RemoteModeAction(props) {
        let [open, setOpen] = React.useState(!1), [status, setStatus] = React.useState(void 0), [devices, setDevices] = React.useState([]), [code, setCode] = React.useState(""), [pendingPairing, setPendingPairing] = React.useState(void 0), [pendingHost, setPendingHost] = React.useState(void 0), [hostCode, setHostCode] = React.useState(void 0), [hostClaims, setHostClaims] = React.useState([]), [busy, setBusy] = React.useState(!1), [error, setError] = React.useState(void 0), [supported, setSupported] = React.useState(!0), refresh = async () => {
          let [nextStatus, nextDevices] = await Promise.all([
            props.control("status"),
            props.control("devices").catch(() => [])
          ]);
          setStatus(nextStatus), setDevices(nextDevices);
        }, refreshHostClaims = async () => {
          setHostClaims(await props.control("host.pairings").catch(() => []));
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
          refreshHostClaims();
          let timer = window.setInterval(() => {
            refreshHostClaims();
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
              status?.hostPairingAvailable ? React.createElement(
                "div",
                { className: "dshRemoteHostPairing" },
                React.createElement("button", {
                  type: "button",
                  disabled: busy,
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
          ".dshRemoteHostPairing{display:grid;gap:8px;border-top:1px solid var(--dsw-alias-border-l3);padding-top:12px}.dshRemoteClaim{display:grid;grid-template-columns:1fr auto auto;align-items:center;gap:6px;font-size:13px}",
          ".dshRemoteFingerprint{margin:0;font-size:13px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}"
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
        }, RemoteModeAction));
      }
      function messageOf(reason) {
        return reason instanceof Error ? reason.message : String(reason);
      }
      return module.exports.apply = apply, module.exports.inject = inject, module.exports;
    }
  });
})();
