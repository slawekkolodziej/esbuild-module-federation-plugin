export type RemoteConfigObject = {
  src: string;
  type: "var";
  global: string;
};
export type RemoteConfig = string | RemoteConfigObject;

export type Remotes = {
  [localName: string]: RemoteConfig;
};

export type ModuleFederationPluginOptions = {
  shared?: unknown;
  remotes?: Remotes;
  exposes?: {
    [key: string]: string;
  };
  filename?: string;
};
