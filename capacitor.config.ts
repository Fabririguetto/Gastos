import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.fabririguetto.gastos",
  appName: "Gastos",
  webDir: "www",
  server: {
    url: "https://gastos-five-chi.vercel.app/",
    androidScheme: "https",
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
