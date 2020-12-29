import { GoogleFontOptimization } from './lib.mjs';

addEventListener('fetch', (event) => {
    event.respondWith(handleRequest(event))
})

async function handleRequest(event) {
    const request = event.request
    const googleFonts = new GoogleFontOptimization(request);

    if (googleFonts.isGoogleFontRequest()) {
        return googleFonts.serveGoogleFont()
    }

    return transform(request, googleFonts, await fetch(request))
}

function transform(request, googleFonts, response) {
    const rewriter = googleFonts.withGoogleFontTransform(new HTMLRewriter())
    return rewriter.transform(response)
}
