const SHARED_SCOPE_MODULE_NAME = "federation-shared";
const MODULE_CACHE_TYPES = {
  remote: "remote",
  shared: "shared",
};
const FEDERATED_MODULE_RE_STR = `@runtime/federation/(${Object.keys(
  MODULE_CACHE_TYPES
).join("|")})/(.+)`;
const FEDERATED_MODULE_RE = new RegExp(FEDERATED_MODULE_RE_STR);
const REMOTE_MODULE_PREFIX = `@runtime/federation/${MODULE_CACHE_TYPES.remote}/`;
const SHARED_MODULE_PREFIX = `@runtime/federation/${MODULE_CACHE_TYPES.shared}/`;

export {
  FEDERATED_MODULE_RE_STR,
  FEDERATED_MODULE_RE,
  MODULE_CACHE_TYPES,
  REMOTE_MODULE_PREFIX,
  SHARED_MODULE_PREFIX,
  SHARED_SCOPE_MODULE_NAME,
};
