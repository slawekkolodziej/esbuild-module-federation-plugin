export type ModuleFederationPluginOptions = {
  shared?: unknown;
  remotes?: unknown;
  exposes?: {
    [key: string]: string;
  };
  filename?: string;
};
