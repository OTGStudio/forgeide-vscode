const path = require('path');

module.exports = [
  // Extension host bundle (Node.js target)
  {
    target: 'node',
    mode: 'none',
    entry: './src/extension.ts',
    output: {
      path: path.join(__dirname, 'dist'),
      filename: 'extension.js',
      libraryTarget: 'commonjs2',
    },
    externals: { vscode: 'commonjs vscode' },
    resolve: { extensions: ['.ts', '.js', '.json'] },
    module: {
      rules: [{ test: /\.tsx?$/, loader: 'ts-loader', exclude: /node_modules/ }],
    },
    devtool: 'nosources-source-map',
  },
  // Webview bundle (browser target)
  {
    target: 'web',
    mode: 'none',
    entry: './src/chat/webview/main.tsx',
    output: {
      path: path.join(__dirname, 'dist'),
      filename: 'webview.js',
    },
    resolve: { extensions: ['.tsx', '.ts', '.js', '.json'] },
    module: {
      rules: [{ test: /\.tsx?$/, loader: 'ts-loader', exclude: /node_modules/ }],
    },
    devtool: 'nosources-source-map',
  },
];
