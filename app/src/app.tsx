import React from 'react'
import { createGlobalStyle } from 'styled-components'
import { GestionoProvider } from "@bitnation-dev/management"
import Projects from './pages/page'
import { ModalProvider } from '@bitnation-dev/components/dist/components/Modal/Provider'
import { Route, Switch, useLocation } from 'wouter'
import './index.css'
import { useLocalStorage } from '@bitnation-dev/management/hooks/local-storage'
import { LayoutGrid } from '@bitnation-dev/management/components/layout/layout-grid'
import { UserProvider } from '@bitnation-dev/management/hooks/user'
import { ThemeProvider } from '@bitnation-dev/management/src/provider/theme'

const GlobalStyle = createGlobalStyle`
:root {
    --color-ui-input: #F4F6F9;
    --color-brand-primary-100: #D6E4FD;
}
`
const basePath = `/app/${process.env.GESTIONO_APP_ID}`
const NotFound = () => {
    const [location] = useLocation()
    return (
        <div className="col-span-full p-8">
            <h1 className="text-2xl font-bold mb-2">404 - Not Found</h1>
            <p className="text-gray-500">Path: <code className="bg-gray-100 px-2 py-1 rounded">{location}</code></p>
        </div>
    )
}

export const Root = () => {
    const theme = useLocalStorage<'light' | 'dark'>('theme', {
        initialValue: 'light',
        serialize: v => v,
        deserialize: v => v as 'light' | 'dark',
    })

    return <ThemeProvider theme={theme.value || 'light'}>
        <ModalProvider>
            <UserProvider>
                <GestionoProvider pathname="/">
                    <LayoutGrid>
                        <Switch>
                            <Route path={basePath} component={Projects} />
                            <Route component={NotFound} />
                        </Switch>
                    </LayoutGrid>
                    <GlobalStyle />
                </GestionoProvider>
            </UserProvider>
        </ModalProvider>
    </ThemeProvider>
}