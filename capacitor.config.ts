import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.relicario.arquivo',
  appName: 'Relicário',
  webDir: 'dist',
  android: {
    backgroundColor: '#F6F1E8',
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
  },
};

export default config;
