import { Route as WouterRoute, useLocation, useParams, Router } from "wouter"

// Re-export wouter components with same names for compatibility
export const Route = WouterRoute
export { useParams, Router }

export const useRouter = () => {
    const [location, setLocation] = useLocation()
    
    return {
        push: (href: string, config?: { isOutOfApp?: boolean }) => {
            if (config?.isOutOfApp) {
                window.location.href = href
                return
            }
            setLocation(href)
        },
        location
    }
}

export const usePathname = () => {
    const [location] = useLocation()
    return location
}
