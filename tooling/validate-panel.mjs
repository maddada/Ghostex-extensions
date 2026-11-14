// Checks a sidebar panel document (schemas/ghostex-sidebar-panel.schema.json) the way Ghostex
// checks it when an extension writes it (gxserver's server/src/extensions/panel.rs). Keep the two
// in step: a panel that passes here must not be refused by Ghostex.

const SCHEMA = 1;
const DOCUMENT_MAX_BYTES = 64 * 1024;
const BLOCKS_MAX = 64;
const TABS_MAX = 8;
const ITEMS_MAX = 200;
const MENU_MAX = 12;
const LABEL_MAX = 200;
const TEXT_MAX = 4000;
const ACTION_DATA_MAX_BYTES = 4 * 1024;
const DOTS = new Set(["green", "yellow", "red", "blue", "gray"]);
const BUTTON_STYLES = new Set(["primary", "default"]);
const IDENT = /^[A-Za-z0-9._-]{1,64}$/;
const REF_PART = /^[A-Za-z0-9_-]{1,64}$/;
const TABLER = /^[a-z0-9-]{1,64}$/;
const ACTION_PERMISSIONS = { openProject: "sessions.open", focusSession: "sessions.open", newAgent: "agents.start" };

const KEYS = {
  document: ["$schema", "schema", "title", "tabs", "blocks"],
  tab: ["id", "title", "icon"],
  blockBase: ["id", "type", "tab", "title"],
  rows: ["items"],
  checklist: ["editable", "items"],
  map: ["root", "groups"],
  progress: ["value", "max", "label"],
  text: ["text"],
  buttons: ["items"],
  empty: ["subtitle", "icon", "action"],
  row: ["id", "icon", "dot", "title", "subtitle", "trailing", "badge", "project", "session", "action", "menu"],
  checklistItem: ["id", "text", "done", "action", "menu"],
  mapRoot: ["title", "subtitle", "icon"],
  mapGroup: ["title", "subtitle", "icon", "items"],
  button: ["id", "title", "icon", "style", "action"],
  menuItem: ["title", "icon", "action"],
  newAgent: ["project", "draft", "agent"],
  extensionTarget: ["name", "data"],
};

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

/**
 * The problems with a panel document, or [] when Ghostex will take it. `permissions` is the set
 * its actions may need (the extension's declared permissions when checking its files).
 */
export function validatePanelDocument(document, { permissions = new Set() } = {}) {
  const errors = [];
  const fail = (message) => errors.push(message);
  const only = (value, keys, at) => {
    if (!isObject(value)) return;
    for (const key of Object.keys(value)) {
      if (value[key] !== null && !keys.includes(key)) fail(`${at}/${key} is not a key the panel schema knows`);
    }
  };
  const label = (value, at, optional = false) => {
    if (value === undefined && optional) return;
    if (typeof value !== "string" || value.trim().length === 0) fail(`${at} must be a non-empty string`);
    else if ([...value].length > LABEL_MAX) fail(`${at} is longer than ${LABEL_MAX} characters`);
  };
  const ident = (value, at) => {
    if (typeof value !== "string" || !IDENT.test(value)) fail(`${at} must be 1-64 letters, digits, '.', '_' or '-'`);
  };
  const sessionRef = (value, at) => {
    const [project, session, extra] = typeof value === "string" ? value.split(":") : [];
    if (extra !== undefined || !REF_PART.test(project ?? "") || !REF_PART.test(session ?? "")) {
      fail(`${at} must be <projectId>:<sessionId>`);
    }
  };
  const icon = (value, at) => {
    if (value === undefined) return;
    if (typeof value === "string" && TABLER.test(value)) return;
    if (typeof value === "string" && value.toLowerCase().endsWith(".svg") && !value.startsWith("/") && !value.split(/[\\/]/).includes("..")) return;
    fail(`${at} must be a Tabler icon name or an .svg file in the extension`);
  };
  const action = (value, at) => {
    if (!isObject(value) || Object.keys(value).length !== 1) {
      fail(`${at} must have exactly one of openProject, focusSession, newAgent, openUrl, openView, extension`);
      return;
    }
    const [kind, target] = Object.entries(value)[0];
    switch (kind) {
      case "openProject":
        label(target, `${at}/openProject`);
        break;
      case "focusSession":
        sessionRef(target, `${at}/focusSession`);
        break;
      case "newAgent":
        if (!isObject(target)) {
          fail(`${at}/newAgent must be an object`);
          break;
        }
        only(target, KEYS.newAgent, `${at}/newAgent`);
        label(target.project, `${at}/newAgent/project`);
        if (target.draft !== undefined && (typeof target.draft !== "string" || [...target.draft].length > TEXT_MAX)) {
          fail(`${at}/newAgent/draft must be a string of at most ${TEXT_MAX} characters`);
        }
        if (target.agent !== undefined) ident(target.agent, `${at}/newAgent/agent`);
        break;
      case "openUrl": {
        let url;
        try {
          url = new URL(target);
        } catch {
          fail(`${at}/openUrl is not a URL`);
          break;
        }
        const loopback = ["localhost", "[::1]"].includes(url.hostname) || /^127\./.test(url.hostname);
        if (!(url.protocol === "https:" || (url.protocol === "http:" && loopback))) {
          fail(`${at}/openUrl must be https (http only for localhost)`);
        }
        break;
      }
      case "openView":
        ident(target, `${at}/openView`);
        break;
      case "extension":
        if (typeof target === "string") ident(target, `${at}/extension`);
        else if (isObject(target)) {
          only(target, KEYS.extensionTarget, `${at}/extension`);
          ident(target.name, `${at}/extension/name`);
          if (target.data !== undefined && JSON.stringify(target.data).length > ACTION_DATA_MAX_BYTES) {
            fail(`${at}/extension/data is over ${ACTION_DATA_MAX_BYTES} bytes`);
          }
        } else fail(`${at}/extension must be a name or {name, data}`);
        break;
      default:
        fail(`${at} has an unknown action ${JSON.stringify(kind)}`);
        return;
    }
    const needs = ACTION_PERMISSIONS[kind];
    if (needs && !permissions.has(needs)) {
      fail(`${at} needs the ${needs} permission, which the extension doesn't declare`);
    }
  };
  const menu = (value, at) => {
    if (value === undefined) return;
    if (!Array.isArray(value) || value.length > MENU_MAX) {
      fail(`${at} must be a list of at most ${MENU_MAX} items`);
      return;
    }
    value.forEach((item, index) => {
      const itemAt = `${at}/${index}`;
      if (!isObject(item)) return fail(`${itemAt} must be an object`);
      only(item, KEYS.menuItem, itemAt);
      label(item.title, `${itemAt}/title`);
      icon(item.icon, `${itemAt}/icon`);
      action(item.action, `${itemAt}/action`);
    });
  };
  const row = (value, at) => {
    if (!isObject(value)) return fail(`${at} must be an object`);
    only(value, KEYS.row, at);
    if (value.id !== undefined) ident(value.id, `${at}/id`);
    if (value.title === undefined && value.project === undefined && value.session === undefined) {
      fail(`${at} needs a title, a project or a session`);
    }
    if (value.project !== undefined && value.session !== undefined) fail(`${at} shows a project or a session, not both`);
    for (const key of ["title", "subtitle", "trailing", "badge", "project"]) label(value[key], `${at}/${key}`, true);
    if (value.session !== undefined) sessionRef(value.session, `${at}/session`);
    icon(value.icon, `${at}/icon`);
    if (value.dot !== undefined && !DOTS.has(value.dot)) fail(`${at}/dot must be green, yellow, red, blue or gray`);
    if (value.action !== undefined) action(value.action, `${at}/action`);
    menu(value.menu, `${at}/menu`);
  };
  const items = (value, at, check) => {
    if (!Array.isArray(value)) return fail(`${at} must be a list`);
    if (value.length > ITEMS_MAX) fail(`${at} has more than ${ITEMS_MAX} items`);
    value.forEach((item, index) => check(item, `${at}/${index}`));
  };

  if (!isObject(document)) return ["the panel must be a JSON object"];
  const size = new TextEncoder().encode(JSON.stringify(document)).length;
  if (size > DOCUMENT_MAX_BYTES) fail(`the panel is ${size} bytes; the limit is ${DOCUMENT_MAX_BYTES}`);
  only(document, KEYS.document, "");
  if (document.schema !== SCHEMA) fail(`/schema must be ${SCHEMA}`);
  label(document.title, "/title", true);
  const tabIds = new Set();
  if (document.tabs !== undefined) {
    if (!Array.isArray(document.tabs) || document.tabs.length > TABS_MAX) fail(`/tabs must be a list of at most ${TABS_MAX} tabs`);
    else
      document.tabs.forEach((tab, index) => {
        const at = `/tabs/${index}`;
        if (!isObject(tab)) return fail(`${at} must be an object`);
        only(tab, KEYS.tab, at);
        ident(tab.id, `${at}/id`);
        label(tab.title, `${at}/title`);
        icon(tab.icon, `${at}/icon`);
        if (tabIds.has(tab.id)) fail(`two tabs have the id ${JSON.stringify(tab.id)}`);
        tabIds.add(tab.id);
      });
  }
  if (!Array.isArray(document.blocks)) {
    fail("/blocks must be a list");
    return errors;
  }
  if (document.blocks.length > BLOCKS_MAX) fail(`a panel has at most ${BLOCKS_MAX} blocks`);
  const blockIds = new Set();
  document.blocks.forEach((block, index) => {
    const at = `/blocks/${index}`;
    if (!isObject(block)) return fail(`${at} must be an object`);
    ident(block.id, `${at}/id`);
    if (blockIds.has(block.id)) fail(`two blocks have the id ${JSON.stringify(block.id)}`);
    blockIds.add(block.id);
    if (block.tab !== undefined && !tabIds.has(block.tab)) fail(`${at}/tab names a tab the panel doesn't have`);
    label(block.title, `${at}/title`, true);
    const bodyKeys = KEYS[block.type];
    if (block.type === "web") return fail(`${at}: web blocks come in a later version of Ghostex; use the native blocks for now`);
    if (!["rows", "checklist", "map", "progress", "text", "buttons", "empty"].includes(block.type)) {
      return fail(`${at}/type must be rows, checklist, map, progress, text, buttons or empty`);
    }
    only(block, [...KEYS.blockBase, ...bodyKeys], at);
    switch (block.type) {
      case "rows":
        items(block.items, `${at}/items`, row);
        break;
      case "checklist": {
        if (block.editable !== undefined && typeof block.editable !== "boolean") fail(`${at}/editable must be true or false`);
        const ids = new Set();
        items(block.items, `${at}/items`, (item, itemAt) => {
          if (!isObject(item)) return fail(`${itemAt} must be an object`);
          only(item, KEYS.checklistItem, itemAt);
          ident(item.id, `${itemAt}/id`);
          if (ids.has(item.id)) fail(`two items have the id ${JSON.stringify(item.id)}`);
          ids.add(item.id);
          label(item.text, `${itemAt}/text`);
          if (typeof item.done !== "boolean") fail(`${itemAt}/done must be true or false`);
          if (item.action !== undefined) action(item.action, `${itemAt}/action`);
          menu(item.menu, `${itemAt}/menu`);
        });
        break;
      }
      case "map": {
        if (block.root !== undefined) {
          if (!isObject(block.root)) fail(`${at}/root must be an object`);
          else {
            only(block.root, KEYS.mapRoot, `${at}/root`);
            label(block.root.title, `${at}/root/title`);
            label(block.root.subtitle, `${at}/root/subtitle`, true);
            icon(block.root.icon, `${at}/root/icon`);
          }
        }
        let total = 0;
        items(block.groups, `${at}/groups`, (group, groupAt) => {
          if (!isObject(group)) return fail(`${groupAt} must be an object`);
          only(group, KEYS.mapGroup, groupAt);
          label(group.title, `${groupAt}/title`);
          label(group.subtitle, `${groupAt}/subtitle`, true);
          icon(group.icon, `${groupAt}/icon`);
          total += Array.isArray(group.items) ? group.items.length : 0;
          items(group.items, `${groupAt}/items`, row);
        });
        if (total > ITEMS_MAX) fail(`${at} has more than ${ITEMS_MAX} items`);
        break;
      }
      case "progress": {
        const max = block.max ?? 100;
        if (typeof block.value !== "number" || typeof max !== "number" || !(max > 0) || block.value < 0 || block.value > max) {
          fail(`${at} needs 0 <= value <= max, with max above 0`);
        }
        label(block.label, `${at}/label`, true);
        break;
      }
      case "text":
        if (typeof block.text !== "string") fail(`${at}/text must be a string`);
        else if ([...block.text].length > TEXT_MAX) fail(`${at}/text is longer than ${TEXT_MAX} characters`);
        break;
      case "buttons":
        if (!Array.isArray(block.items) || block.items.length === 0 || block.items.length > MENU_MAX) {
          fail(`${at}/items must have 1 to ${MENU_MAX} buttons`);
          break;
        }
        block.items.forEach((button, buttonIndex) => {
          const buttonAt = `${at}/items/${buttonIndex}`;
          if (!isObject(button)) return fail(`${buttonAt} must be an object`);
          only(button, KEYS.button, buttonAt);
          if (button.id !== undefined) ident(button.id, `${buttonAt}/id`);
          label(button.title, `${buttonAt}/title`);
          icon(button.icon, `${buttonAt}/icon`);
          if (button.style !== undefined && !BUTTON_STYLES.has(button.style)) fail(`${buttonAt}/style must be primary or default`);
          action(button.action, `${buttonAt}/action`);
        });
        break;
      case "empty":
        if (block.title === undefined) fail(`${at} (empty) needs a title`);
        label(block.subtitle, `${at}/subtitle`, true);
        icon(block.icon, `${at}/icon`);
        if (block.action !== undefined) action(block.action, `${at}/action`);
        break;
    }
  });
  return errors;
}
