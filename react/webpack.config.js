const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const ESLintPlugin = require("eslint-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const Dotenv = require("dotenv-webpack");
const fs = require("fs");

module.exports = {
  mode: "development",
  entry: "./src/index.tsx",
  output: {
    path: path.resolve(__dirname, "builded"),
    filename: "index.js",
    publicPath: "/",
    iife: true,
    globalObject: "this",
    clean: true,
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  cache: {
    type: "filesystem",
    cacheDirectory: path.resolve(__dirname, ".webpack_cache"),
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: ["ts-loader"],
        exclude: /node_modules/,
        use: {
          loader: "babel-loader",
          options: {
            cacheDirectory: true,
          },
        },
      },
      {
        test: /\.scss$/,
        use: ["style-loader", "css-loader", "postcss-loader", "sass-loader"],
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader", "postcss-loader"],
      },
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: "asset/inline",
      },
    ],
  },
  optimization: {
    minimize: true,
    splitChunks: false,
    runtimeChunk: false,
    minimizer: [
      new TerserPlugin({
        extractComments: false,
        terserOptions: {
          mangle: { reserved: ["action"] },
        },
      }),
    ],
  },
  plugins: [
    new ESLintPlugin({
      extensions: ["ts", "tsx"],
      failOnError: false,
    }),
    new HtmlWebpackPlugin({
      template: "./src/index.html",
      filename: "index.html",
      inject: "body",
    }),
    new Dotenv(), // Thêm plugin dotenv-webpack
    {
      apply: (compiler) => {
        compiler.hooks.afterEmit.tap("CopyIndexJS", (compilation) => {
          const sourceFile = path.resolve(__dirname, "builded/index.js");
          const targetFile = path.resolve(__dirname, "../static/index.js");

          if (fs.existsSync(sourceFile)) {
            const targetDir = path.dirname(targetFile);
            if (!fs.existsSync(targetDir)) {
              fs.mkdirSync(targetDir, { recursive: true });
            }
            // Nếu file đã tồn tại thì xóa trước khi copy
            if (fs.existsSync(targetFile)) {
              fs.unlinkSync(targetFile);
              console.log("✓ Deleted old index.js in static folder");
            }
            fs.copyFileSync(sourceFile, targetFile);
            console.log("✓ Copied index.js to static folder");
          }
        });
      },
    },
  ],
  performance: {
    hints: false,
  },
  devServer: {
    historyApiFallback: true,
    static: {
      directory: path.resolve(__dirname, "builded"),
    },
    compress: true,
    port: 3001, // hoặc cổng bạn muốn
    hot: true, // bật hot reload (HMR)
    open: false, // tự mở trình duyệt khi chạy
    client: {
      overlay: false, // hiện lỗi trên trình duyệt nếu có
    },
    watchFiles: ["src/**/*"],
  },
};
