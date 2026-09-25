/**
 * Bundles the official public npm packages `@a2ui/web_core/v0_9` and `@a2ui/lit/v0_9`
 * (https://a2ui.org/specification/v0.9.1-a2ui/) into a browser-ready IIFE bundle (`a2ui_public_sdk.js`).
 */
const esbuild = require('esbuild');
const path = require('path');

esbuild
  .build({
    stdin: {
      contents: `
        import * as webCore from "@a2ui/web_core/v0_9";
        import * as litRenderer from "@a2ui/lit/v0_9";
        window.RealA2UI = { ...webCore, ...litRenderer };
        console.log("[Official Public @a2ui/web_core + @a2ui/lit v0.9.1 SDK Loaded]", Object.keys(window.RealA2UI));
      `,
      resolveDir: path.resolve(__dirname, '..'),
      loader: 'js'
    },
    bundle: true,
    outfile: path.resolve(__dirname, '..', 'a2ui_public_sdk.js'),
    format: 'iife'
  })
  .then(() => {
    console.log('Successfully built a2ui_public_sdk.js from public @a2ui npm packages.');
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
