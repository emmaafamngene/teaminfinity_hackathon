import type { NextConfig } from "next";
const config: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "xtjhomifqgftegvapfew.supabase.co",
        pathname: "/storage/v1/object/sign/**",
      },
    ],
  },
};
export default config;
