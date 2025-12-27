const path = require('path');
const webpack = require('webpack');
const dotenv = require('dotenv');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

module.exports = () => {
    const env = dotenv.config({
        path: `../.env.${process.env.NODE_ENV}`
    }).parsed;
    const isProduction = process.env.NODE_ENV === 'production';
    return {
        mode: process.env.NODE_ENV || 'development',
        devtool: isProduction ? false : "inline-source-map",
        target: "web",
        cache: false,
        entry: {
            main: "./src/index.tsx",
        },
        output: {
            path: path.resolve(__dirname, '../dist/'),
            filename: "app-bundle.js" // <--- Will be compiled to this single file
        },
        resolve: {
            extensions: [".ts", ".tsx", ".js", ".css"],
            modules: [path.resolve('./node_modules/@bitnation-dev/management/dist'), path.resolve('./node_modules')],
            alias: {
                "next": path.resolve(__dirname, "./src/components"),
                "@bitnation-dev/management/src": path.resolve(__dirname, "./node_modules/@bitnation-dev/management/dist/package/src"),
                "../../common/ui/components/editable-text.module.css": path.resolve(__dirname, "./src/components/editable-text.module.css"),
                "./editable-text.module.css": path.resolve(__dirname, "./src/components/editable-text.module.css"),
            },
            fallback: {
                crypto: false,
            }
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    loader: "ts-loader"
                },
                {
                    test: /\.css$/i,
                    use: ["style-loader", "css-loader", ],
                },
            ],
        },
        plugins: [
            // Ignore missing image assets from @bitnation-dev/management
            new webpack.NormalModuleReplacementPlugin(
                /\.(png|webp|jpg|jpeg|gif|svg)$/,
                (resource) => {
                    if (resource.context && resource.context.includes('@bitnation-dev/management')) {
                        resource.request = require.resolve('./src/stub.js');
                    }
                }
            ),
            // new BundleAnalyzerPlugin({
            //     analyzerMode: 'static',
            //     openAnalyzer: false,
            // }),
            new webpack.DefinePlugin({
                process: {
                    env: {
                        ...Object.keys(env).reduce((acc, key) => {
                            acc[key] = JSON.stringify(env[key]);
                            return acc;
                        }, {}),
                        NEXT_PUBLIC_DOMAIN: JSON.stringify(env.GESTIONO_DOMAIN),
                    }
                }
            })
        ]
    };
}