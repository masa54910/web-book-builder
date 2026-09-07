import assert from "node:assert/strict";
import { parseGoogleMapsUrl } from "../src/lib/googleMaps";
const valid = parseGoogleMapsUrl("https://www.google.com/maps/embed?pb=!1m");
assert.equal(valid?.provider, "google_maps");
assert.equal(parseGoogleMapsUrl("https://www.google.com/maps/search/Tokyo" )?.provider, "google_maps");
for (const value of ["http://www.google.com/maps", "https://evil.example/maps", "javascript:alert(1)", "data:text/html,<iframe>", "https://www.google.com/other"]) assert.equal(parseGoogleMapsUrl(value), null);
console.log("Google Maps URL validation: PASS");
