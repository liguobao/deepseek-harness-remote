# Product

## Register

product

## Users

Developers who run DeepSeek Harness on more than one workstation or server and want their local Harness UI—or Android—to control a paired remote Harness without opening a remote shell.

## Product Purpose

DSH Remote is a secure remote control surface for DeepSeek Harness. The same Plugin can expose a machine as a Host and let another local Harness switch its native UI between Local and a paired Remote Host. Harness and the workspace remain on the selected Host; sessions are never migrated or merged. Android uses the same secure channel. Success means both the local Harness mode switch and Android can complete one reliable, permission-bounded vertical slice.

## Repository Boundary

This repository implements the dual-role Harness Plugin, its Web client face, Android, shared protocol/crypto/transport packages, and mock interoperability tools. It does not implement the DSH Remote Server, Remote Web, Admin backend, Server database, migrations, or deployment.

The Server design and Remote Protocol remain first-class specifications in `docs/server.md` and `docs/protocol.md`. A separate Server project must implement Server, Remote Web, and Admin as one site and conform to those documents; their presence in this repository does not authorize adding that runtime or frontend code here.

## Brand Personality

Quiet, precise, trustworthy. The interface should feel familiar to users of Codex, ChatGPT, Linear, and GitHub Mobile: focused on the current task, clear about connection and security state, and free of decorative ceremony.

## Anti-references

Do not resemble a traditional infrastructure admin console, a marketing landing page, a remote desktop, or a terminal. Avoid dashboard card grids, oversized metrics, excessive status colors, decorative gradients, novelty controls, and security claims that hide platform limitations.

## Design Principles

1. Put the active conversation first; navigation and connection detail support it.
2. Make permission decisions explicit, contextual, and impossible to confuse with ordinary chat actions.
3. Show connection truth plainly, including offline, relay, degraded, and platform-security states.
4. Preserve familiar client patterns so the interface disappears into the developer's workflow.
5. Keep remote authority within Harness permissions and never imply that Remote grants broader access.

## Accessibility & Inclusion

Target WCAG 2.2 AA. Support complete keyboard navigation, visible focus, screen-reader names, non-color status cues, readable contrast, touch targets suitable for mobile use, and reduced-motion preferences. Error and connection states must use plain language rather than raw protocol or server failures.
