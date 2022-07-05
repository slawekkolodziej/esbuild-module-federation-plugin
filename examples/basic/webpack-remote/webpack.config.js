const path = require("path");

const { ESBuildMinifyPlugin } = require("esbuild-loader");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const webpack = require("webpack");
const FederatedStatsPlugin = require("webpack-federated-stats-plugin");
const nodeExternals = require("webpack-node-externals");
const { StatsWriterPlugin } = require("webpack-stats-plugin");

/**
 * @type {webpack.Configuration}
 */

function esmRemote(name, url) {
  return `promise new Promise(resolve => {
    const script = document.createElement('script');
    script.src = '${url}';
    script.type = 'module';
    script.onload = () => {
      const proxy = {
        get: (request) => window.${name}.get(request),
        init: (arg) => {
          try {
            return window.${name}.init(arg);
          } catch(e) {
            console.log('remote container already initialized')
          }
        }
      }
      resolve(proxy)
    }
    document.head.appendChild(script);
  })`;
}

const clientConfig = {
  entry: { app: ["./src/index.js"] },
  output: {
    path: path.resolve("./public/build"),
  },
  resolve: {
    extensions: [".js", ".jsx", ".css"],
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        use: {
          loader: "esbuild-loader",
          options: {
            loader: "jsx",
          },
        },
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, "css-loader"],
      },
    ],
  },
  plugins: [
    new MiniCssExtractPlugin(),
    new StatsWriterPlugin({
      filename: "stats.json",
      stats: { all: true },
    }),
    new FederatedStatsPlugin({
      filename: "federation-stats.json",
    }),
    new webpack.container.ModuleFederationPlugin({
      name: "webpackRemote",
      filename: "remote-entry.js",
      exposes: {
        "./header": "./src/components/header.jsx",
        "./box": "./src/components/box.jsx",
      },
      remotes: {
        esbuildRemote: esmRemote(
          "esbuildRemote",
          "http://localhost:3002/build/remote-entry.js"
        ),
      },
      shared: {
        react: {
          singleton: true,
          eager: true,
        },
        "react-dom": {
          singleton: true,
          eager: true,
        },
      },
    }),
  ],
  optimization: {
    // minimizer: [new ESBuildMinifyPlugin({})],
    minimize: false,
    moduleIds: "named",
  },
};

/**
 * @type {webpack.Configuration}
 */
const serverConfig = {
  target: "node",
  entry: { app: "./src/components/app.jsx" },
  output: {
    path: path.resolve("./dist"),
    library: { type: "commonjs" },
  },
  externals: [nodeExternals(), "esbuildRemote/header", "esbuildRemote/box"],
  externalsPresets: { node: true },
  resolve: {
    extensions: [".js", ".jsx", ".css"],
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        use: {
          loader: "esbuild-loader",
          options: {
            loader: "jsx",
          },
        },
      },
      {
        test: /\.css$/,
        use: {
          loader: "css-loader",
          options: {
            modules: {
              exportOnlyLocals: true,
            },
          },
        },
      },
    ],
  },
  plugins: [
    new webpack.container.ModuleFederationPlugin({
      name: "webpackRemote",
      filename: "remote-entry.js",
      library: { type: "commonjs" },
      exposes: {
        "./header": "./src/components/header.jsx",
        "./box": "./src/components/box.jsx",
      },
      // remotes: {
      //   'esbuildRemote': "esbuildRemote@http://localhost:3002/remoteEntry.js"
      // },
      shared: {
        react: {
          singleton: true,
          eager: true,
        },
        "react-dom": {
          singleton: true,
          eager: true,
        },
      },
    }),
  ],
  optimization: {
    minimize: false,
    moduleIds: "named",
  },
};

module.exports = [clientConfig, serverConfig];
