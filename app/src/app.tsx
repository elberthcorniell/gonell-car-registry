import React from 'react'
import { createGlobalStyle } from 'styled-components'
import { GestionoProvider } from "@bitnation-dev/management"
import VehiclesList from './pages/vehicles/list'
import VehicleDetails from './pages/vehicles/details'
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
    --color-brand-primary: #2563EB;
    --color-brand-primary-hover: #1D4ED8;
}

/* Vehicle card styles */
.vehicle-card {
    position: relative;
    overflow: hidden;
}

.vehicle-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #2563EB, #3B82F6);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.3s ease;
}

.vehicle-card:hover::before {
    transform: scaleX(1);
}

/* Plate badge animation */
.plate-badge {
    position: relative;
    overflow: hidden;
}

.plate-badge::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    animation: shimmer 3s infinite;
}

@keyframes shimmer {
    0% { left: -100%; }
    100% { left: 100%; }
}
`

const basePath = `/app/${process.env.GESTIONO_APP_ID}`

const NotFound = () => {
    const [location] = useLocation()
    return (
        <div className="col-span-full p-8">
            <h1 className="text-2xl font-bold mb-2">404 - No Encontrado</h1>
            <p className="text-gray-500">Ruta: <code className="bg-gray-100 px-2 py-1 rounded">{location}</code></p>
        </div>
    )
}

export const Root = () => {
    const theme = useLocalStorage<'light' | 'dark'>('theme', {
        initialValue: 'light',
        serialize: v => v,
        deserialize: v => v as 'light' | 'dark',
    })

    return (
        <ThemeProvider theme={theme.value || 'light'}>
            <ModalProvider>
                <UserProvider defaultRedirectPath={basePath}>
                    <GestionoProvider pathname="/">
                        <LayoutGrid>
                            <Switch>
                                <Route path={basePath} component={VehiclesList} />
                                <Route path={`${basePath}/vehicle/:id`} component={VehicleDetails} />
                                <Route component={NotFound} />
                            </Switch>
                        </LayoutGrid>
                        <GlobalStyle />
                    </GestionoProvider>
                </UserProvider>
            </ModalProvider>
        </ThemeProvider>
    )
}
