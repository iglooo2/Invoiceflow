import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const config = defineCloudflareConfig();

// pg-cloudflare's "workerd" export points at dist/index.js, which OpenNext's
// package copy step does not include. Use the default condition so `pg` falls
// back to nodejs_compat sockets instead of a missing file.
config.cloudflare = {
  ...config.cloudflare,
  useWorkerdCondition: false,
};

export default config;
