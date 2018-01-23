const path = require('path');
const webpack = require('webpack');
const { stringified: env } = require('@remy/envy')();

module.exports = {
  entry: './public/client.js',
  module: {
    // rules: [
    //   {
    //     test: /\.js$/,
    //     exclude: /(node_modules|bower_components)/,
    //     use: {
    //       loader: 'babel-loader',
    //       options: {
    //         presets: ['env', 'stage-0'],
    //       },
    //     },
    //   },
    // ],
  },
  output: {
    filename: 'client.js',
    path: path.resolve(__dirname, 'public'),
  },
  plugins: [
    new webpack.DefinePlugin(env),
    new webpack.optimize.UglifyJsPlugin({
      include: /\.js$/,
      minimize: true,
    }),
  ],
};
