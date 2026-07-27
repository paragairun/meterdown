package in.metersahi.app;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import android.webkit.GeolocationPermissions;
import android.webkit.WebChromeClient;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

/**
 * A stock Android WebView does NOT support the browser-standard
 * navigator.geolocation API out of the box, even with the
 * ACCESS_FINE_LOCATION/ACCESS_COARSE_LOCATION permissions declared in
 * AndroidManifest.xml - the host app has to implement
 * WebChromeClient.onGeolocationPermissionsShowPrompt() and drive
 * Android's runtime permission flow itself.
 *
 * This is what makes the site's EXISTING web code work unmodified:
 * attemptAutoLocate() in app.js (the "use my current location"
 * pickup-field feature) calls navigator.geolocation.getCurrentPosition()
 * exactly as it does on mobile Chrome - no Capacitor-specific
 * Geolocation plugin needed, no web code changes needed. This class is
 * the only thing standing between "the feature works in a browser" and
 * "the feature silently never works in the app".
 *
 * If Android denies the permission (or the user denies it), the
 * callback below reports false back to the WebView, and the site's
 * own existing JS already handles that gracefully - falls back to
 * manual address entry, no crash, no error shown to the user. Nothing
 * about that behavior needed to change.
 */
public class MainActivity extends BridgeActivity {
    private static final int LOCATION_PERMISSION_REQUEST_CODE = 6001;
    private GeolocationPermissions.Callback pendingGeoCallback;
    private String pendingGeoOrigin;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        this.bridge.getWebView().getSettings().setGeolocationEnabled(true);
        this.bridge.getWebView().setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                boolean hasFine = ContextCompat.checkSelfPermission(
                    MainActivity.this, Manifest.permission.ACCESS_FINE_LOCATION
                ) == PackageManager.PERMISSION_GRANTED;
                boolean hasCoarse = ContextCompat.checkSelfPermission(
                    MainActivity.this, Manifest.permission.ACCESS_COARSE_LOCATION
                ) == PackageManager.PERMISSION_GRANTED;

                if (hasFine || hasCoarse) {
                    // Already granted at the Android level - let the
                    // WebView proceed immediately.
                    callback.invoke(origin, true, false);
                } else {
                    // Not yet granted - ask Android for it now. The
                    // result comes back in onRequestPermissionsResult
                    // below, where this same callback gets resumed.
                    pendingGeoCallback = callback;
                    pendingGeoOrigin = origin;
                    ActivityCompat.requestPermissions(
                        MainActivity.this,
                        new String[]{
                            Manifest.permission.ACCESS_FINE_LOCATION,
                            Manifest.permission.ACCESS_COARSE_LOCATION
                        },
                        LOCATION_PERMISSION_REQUEST_CODE
                    );
                }
            }
        });
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);

        if (requestCode == LOCATION_PERMISSION_REQUEST_CODE && pendingGeoCallback != null) {
            boolean granted = false;
            for (int result : grantResults) {
                if (result == PackageManager.PERMISSION_GRANTED) {
                    granted = true;
                    break;
                }
            }
            // Relay the result back to the WebView exactly as the
            // browser-standard Geolocation API expects.
            pendingGeoCallback.invoke(pendingGeoOrigin, granted, false);
            pendingGeoCallback = null;
            pendingGeoOrigin = null;
        }
    }
}
