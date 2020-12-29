addEventListener('fetch', (event) => {
    event.respondWith(handleRequest(event))
})

async function handleRequest(event) {
    const request = event.request
    const { protocol, pathname } = new URL(request.url)

    if (request.method === 'GET' && pathname.startsWith('/fonts.gstatic.com/')) {
        return fetch(`${protocol}/${pathname}`)
    }

    return transform(request, await fetch(request))
}

const styleTag = ({ media, id, onload }, content) => {
    if (onload) {
        return `<style id="${id}" media="${media}" onload="${onload}">${content}</style>`
    }
    return `<style id="${id}" media="${media}">${content}</style>`
}

function transform(request, response) {
    return new HTMLRewriter()
        .on('link', {
            async element(e) {
                const src =
                    e.getAttribute('href') || e.getAttribute('data-href') || ''
                const rel = e.getAttribute('rel')
                const isGoogleFont = src.includes('//fonts.googleapis.com')

                if (isGoogleFont && rel === 'stylesheet' && src) {
                    const media = e.getAttribute('media') || 'all'
                    const id = e.getAttribute('id') || ''
                    const onload = e.getAttribute('onload') || ''

                    const content = await fetchCSS(src, request)
                    if (!content) {
                        return
                    }

                    const tag = styleTag({ media, id, onload }, content)

                    e.replace(tag, {
                        html: true,
                    })
                }
            },
        })
        .transform(response)
}

function getCacheKey(userAgent) {
    let os = ''
    const osRegex = /^[^(]*\(\s*(\w+)/gim
    let match = osRegex.exec(userAgent)
    if (match) {
        os = match[1]
    }

    let mobile = ''
    if (userAgent.match(/Mobile/gim)) {
        mobile = 'Mobile'
    }

    // Detect Opera first since it includes Chrome and Safari
    const operaRegex = /\s+OPR\/(\d+)/gim
    match = operaRegex.exec(userAgent)
    if (match) {
        return 'Opera' + match[1] + os + mobile
    }

    // Detect Edge first since it includes Chrome and Safari
    const edgeRegex = /\s+Edge\/(\d+)/gim
    match = edgeRegex.exec(userAgent)
    if (match) {
        return 'Edge' + match[1] + os + mobile
    }

    // Detect Chrome next (and browsers using the Chrome UA/engine)
    const chromeRegex = /\s+Chrome\/(\d+)/gim
    match = chromeRegex.exec(userAgent)
    if (match) {
        return 'Chrome' + match[1] + os + mobile
    }

    // Detect Safari and Webview next
    const webkitRegex = /\s+AppleWebKit\/(\d+)/gim
    match = webkitRegex.exec(userAgent)
    if (match) {
        return 'WebKit' + match[1] + os + mobile
    }

    // Detect Firefox
    const firefoxRegex = /\s+Firefox\/(\d+)/gim
    match = firefoxRegex.exec(userAgent)
    if (match) {
        return 'Firefox' + match[1] + os + mobile
    }
    return null
}

async function fetchCSS(url, request) {
    url = fixFontStylesURL(url)

    const userAgent = request.headers.get('user-agent') || ''
    const browser = getCacheKey(userAgent)

    let headers = { Referer: request.url }
    if (browser) {
        headers['User-Agent'] = userAgent
    } else {
        headers['User-Agent'] =
            'Mozilla/4.0 (compatible; MSIE 8.0; Windows NT 6.0; Trident/4.0)'
    }

    try {
        const cache = caches.default
        const cacheKey = getCSSCacheKey(url, browser)

        const cachedRes = await cache.match(cacheKey)
        if (cachedRes) {
            return await cachedRes.text()
        }

        const response = await fetch(url, { headers })
        if (response.status !== 200) {
            console.warn(`fetchCSS non 200 status for url ${url}`)
            return null
        }

        let fontCSS = await response.text()
        fontCSS = rewriteFontsUrls(fontCSS)

        // FIXME: we should cache the headers directly? confirm in APO
        await cache.put(cacheKey, new Response(fontCSS, { headers }))
        return fontCSS
    } catch (e) {
        console.error(e)

        // gracefully handle the failure, HTML Rewriter can't recover from exception
        const response = await fetch(url, { headers })
        if (response.status !== 200) {
            console.warn(`fetchCSS non 200 status for url ${url}`)
            return null
        }

        let fontCSS = await response.text()
        fontCSS = rewriteFontsUrls(fontCSS)
        return fontCSS
    }
}

function getCSSCacheKey(url, browser) {
    let cacheKey = new URL(browser ? url + '&' + browser : url)
    return cacheKey
}

function rewriteFontsUrls(fontCSS) {
    // Rewrite all of the font URLs to come through the worker
    return fontCSS.replace(
        /(https?:)?\/\/fonts\.gstatic\.com\//gim,
        '/fonts.gstatic.com/'
    )
}

function fixFontStylesURL(url) {
    if (url.startsWith('/')) {
        url = 'https:' + url
    }

    // fonts url contains different versions of ampersand encoding
    // without the fix we don't pass display=swap parameter properly

    if (url.includes('&#038;')) {
        url = url.replace(/&#038;/g, '&')
    }

    if (url.includes('&amp;')) {
        url = url.replace(/&amp;/g, '&')
    }

    if (url.endsWith('[]}')) {
        url = url.replace(/\[]}$/, '')
    }

    // remove whitespaces
    return url.replace(/\s/g, '')
}
