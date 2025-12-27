import React from 'react'
import { useSearchParams } from './navigation'
import { useRouter } from './router'
const pathBase = '/app/1'

export const useUrl = () => {
    const searchParams = useSearchParams()
    return (href: string) => `${pathBase}/${href}?${searchParams.toString()}`.replace(/\/+/g, '/')
}

const Link = ({ href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    const url = useUrl()
    const router = useRouter()
    return <a href={props.onClick ? '#' : url(href as string)} onClick={(e) => {
        e.preventDefault()
        router.push(href as string)
    }} {...props} />
}


export default Link