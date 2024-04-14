import { defineConfig, externalizeDepsPlugin, UserConfig } from 'electron-vite';
import react from '@vitejs/plugin-react-swc';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';

/**
 * To prevent access type comparison,
 * extract deeper into type
 */
type PluginOption = ((UserConfig['main'] & Record<string, unknown>)['plugins'] &
  Record<string, unknown>)[number];

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), nxViteTsPaths()],
  },
  preload: {
    plugins: [externalizeDepsPlugin(), nxViteTsPaths()],
  },
  renderer: {
    plugins: [react(), nxViteTsPaths()] as PluginOption[],
  },
});
