/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
    eslint: {
        // 在构建过程中忽略 ESLint 错误
        ignoreDuringBuilds: true,
    },
    // 如果你也想忽略 TypeScript 类型检查错误，可以添加以下配置
    typescript: {
        ignoreBuildErrors: true,
    },
};

export default config;
