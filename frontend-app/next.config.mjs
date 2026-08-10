/** @type {import('next').NextConfig} */
const nextConfig = {
  // @hells-kitchen/shared ships as raw TypeScript source, no build step
  // (PLAN.md §5.1/§3.14) — Next.js needs to know to compile it rather than
  // treat it as pre-built JS.
  transpilePackages: ["@hells-kitchen/shared"],
};

export default nextConfig;
