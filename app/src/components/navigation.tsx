import React from 'react'
const pathBase = '/app/1'

export const push = (href: string) => {
    window.history.pushState({}, '', `${pathBase}/${href}`)
}

export const usePathname = () => {
    const [pathname, setPathname] = React.useState<string>('')
    // listen for changes to the current location.
    React.useEffect(() => {
        const onLocationChange = () => {
            setPathname(window.location.pathname.substring(pathBase.length) || '/')
        }
        onLocationChange()
        window.addEventListener('popstate', onLocationChange)
        return () => {
            window.removeEventListener('popstate', onLocationChange)
        }
    }, [])

    return pathname
}

export const useSearchParams = () => {
    const [searchParams, setSearchParams] = React.useState<URLSearchParams>(new URLSearchParams(window.location.search))
    // listen for changes to the current location.
    React.useEffect(() => {
        const onLocationChange = () => {
            setSearchParams(new URLSearchParams(window.location.search))
        }
        onLocationChange()
        window.addEventListener('popstate', onLocationChange)
        return () => {
            window.removeEventListener('popstate', onLocationChange)
        }
    }, [])

    return searchParams
}
