// Locking the app to portrait makes Android add
//   <uses-feature android:name="android.hardware.screen.portrait" android:required="true" />
// Google Play then hides the app from tablets, Chromebooks and XR devices that do not
// report that feature. Declaring it as optional keeps the portrait lock but lets
// those devices install the app.
const { withAndroidManifest } = require('expo/config-plugins');

const OPTIONAL_FEATURES = ['android.hardware.screen.portrait', 'android.hardware.screen.landscape'];

module.exports = function withOptionalScreenFeatures(config) {
    return withAndroidManifest(config, (modConfig) => {
        const manifest = modConfig.modResults.manifest;
        manifest['uses-feature'] = manifest['uses-feature'] || [];

        for (const name of OPTIONAL_FEATURES) {
            const existing = manifest['uses-feature'].find((feature) => feature.$ && feature.$['android:name'] === name);
            if (existing) {
                existing.$['android:required'] = 'false';
            } else {
                manifest['uses-feature'].push({ $: { 'android:name': name, 'android:required': 'false' } });
            }
        }
        return modConfig;
    });
};
