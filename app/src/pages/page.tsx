'use client'
import React, { useState } from "react";
import Button from "@bitnation-dev/components/dist/components/Button"
import { ButtonModal } from "@bitnation-dev/components/dist/components/Modal/Modal"
import { useModal } from "@bitnation-dev/components/dist/components/Modal/Provider"
import Input, { Select } from "@bitnation-dev/components/dist/components/Input/Input"
import LoadingFlash from "@bitnation-dev/components/dist/components/LoadingFlash"
import { useForm } from "react-hook-form";
import { useCallback } from "react";
import { Gestiono } from "@bitnation-dev/management";
import { useOrganization } from "@bitnation-dev/management";
import { useAlert } from "../../src/hooks/alert";
import { LayoutColumn } from "@bitnation-dev/management/components/layout/layout-grid";
import { LinkConstants } from "@bitnation-dev/management/consts/links";
import { BreadcrumbAndHeader } from "@bitnation-dev/management/components/breadcrumbs";
import { DivisionWidget } from "@bitnation-dev/management/components/widgets";
import { useGestiono } from "@bitnation-dev/management/gestiono";
import { TrashIcon } from "@bitnation-dev/management/icons";
import { DivisionSelect } from "@bitnation-dev/management/src/forms/division-select";

const appId = parseInt(process.env.GESTIONO_APP_ID || '0')

const AVAILABLE_WEBHOOKS: { id: WooCommerceWebhook; label: string }[] = [
    { id: 'order.created', label: 'Orden creada' },
    { id: 'order.updated', label: 'Orden actualizada' },
    { id: 'order.deleted', label: 'Orden eliminada' },
    { id: 'product.updated', label: 'Producto actualizado' },
]

const Project = () => {
    const alert = useAlert()
    const { divisions, accounts } = useOrganization()
    const appData = useGestiono('getAppData', {
        appId,
        type: 'woocommerce:store'
    }, {
        cache: true,
        swr: true
    })
    if (divisions.loading) return <p>Cargando...</p>

    return (<>
        <BreadcrumbAndHeader
            href={LinkConstants.APPS}
            title="WooCommerce"
            actions={<>
                <LinkWooCommerceStore onSubmit={() => {
                    appData.update()
                }} />
            </>}
        />
        <LayoutColumn size={1}>
            <h2 className="mb-5">Tus tiendas</h2>
        </LayoutColumn>
        <LoadingFlash loading={appData.loading} />
            {(appData.data as unknown as WooCommerceStore[] | undefined)?.map((store) => {
                return <LayoutColumn size={2} key={store.id}>
                    <div className="outlined-card group">
                        <div>
                            <div>
                                <p>{store.data.storeUrl}</p>
                                <DivisionWidget id={store.data.divisionId} />
                            </div>
                            <TrashIcon />
                        </div>
                        <WebhookConfiguration store={store} onUpdate={() => appData.update()} />
                        <h2 className="mt-5">Mapeo de cuentas</h2>
                        <p className="mb-5 mt-1 text-sm">Selecciona a que cuentas se asignarán los pagos de esta tienda</p>
                        {['DOP', 'USD', 'EUR'].map((currency) => {
                            return <div key={currency}>
                                <Select label={`Cuenta para ${currency}`} defaultValue={store.data.accounts?.[currency as keyof typeof store.data.accounts]} onChange={(e) => {
                                    Gestiono.updateAppData({
                                        id: store.id,
                                        appId,
                                        type: 'woocommerce:store',
                                        strategy: 'merge',
                                        data: {
                                            accounts: {
                                                [currency]: Number((e.target as HTMLSelectElement).value)
                                            }
                                        }
                                    }).then(() => {
                                        alert?.open({
                                            msg: `Cuenta para ${currency} actualizada`,
                                            variant: 'success'
                                        })
                                    })
                                }}>
                                    {accounts.data?.filter((account: any) => account.currency === currency).map((account: any) => {
                                        return <option key={account.id} value={account.id}>{account.name}</option>
                                    })}
                                </Select>
                            </div>
                        })}
                    </div>
                </LayoutColumn>
            })}
    </>)
}

type WebhookConfigurationProps = {
    store: WooCommerceStore
    onUpdate: () => void
}

const WebhookConfiguration = ({ store, onUpdate }: WebhookConfigurationProps) => {
    const alert = useAlert()
    const [webhooks, setWebhooks] = useState<WooCommerceWebhook[]>(store.data.webhooks || [])
    const [copied, setCopied] = useState(false)

    // Webhook delivery URL for this store
    const webhookUrl = `${process.env.GESTIONO_API_URL}/v1/apps/woocommerce/webhook/${store.id}`

    const copyWebhookUrl = useCallback(() => {
        navigator.clipboard.writeText(webhookUrl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }, [webhookUrl])

    const toggleWebhook = useCallback((webhookId: WooCommerceWebhook) => {
        const newWebhooks = webhooks.includes(webhookId)
            ? webhooks.filter(w => w !== webhookId)
            : [...webhooks, webhookId]
        
        setWebhooks(newWebhooks)
        
        Gestiono.updateAppData({
            id: store.id,
            appId,
            type: 'woocommerce:store',
            strategy: 'merge',
            data: {
                webhooks: newWebhooks
            }
        }).then(() => {
            alert?.open({
                msg: 'Webhooks actualizados',
                variant: 'success'
            })
            onUpdate()
        }).catch(() => {
            alert?.open({
                msg: 'Error al actualizar webhooks',
                variant: 'error'
            })
            setWebhooks(store.data.webhooks || [])
        })
    }, [webhooks, store.id, alert, onUpdate, store.data.webhooks])

    return (
        <>
            <h2 className="mt-5">Configuración de Webhook</h2>
            <p className="mb-2 mt-1 text-sm">Configura estos valores en WooCommerce → Configuración → Avanzado → Webhooks</p>
            
            <div className="space-y-3">
                <div>
                    <label className="text-xs text-ui-text-secondary">URL de entrega</label>
                    <div className="flex items-center gap-2 p-3 bg-ui-input rounded-lg">
                        <code className="text-sm flex-1 break-all">{webhookUrl}</code>
                        <button 
                            type="button"
                            onClick={copyWebhookUrl}
                            className="px-3 py-1 text-sm bg-brand-primary text-white rounded hover:bg-brand-primary-hover transition-colors shrink-0"
                        >
                            {copied ? '✓ Copiado' : 'Copiar'}
                        </button>
                    </div>
                </div>
                
                {store.data.webhookSecret && (
                    <div>
                        <label className="text-xs text-ui-text-secondary">Secret</label>
                        <div className="p-3 bg-ui-input rounded-lg">
                            <code className="text-sm">{store.data.webhookSecret}</code>
                        </div>
                    </div>
                )}
            </div>
            
            <h2 className="mt-5">Eventos</h2>
            <p className="mb-3 mt-1 text-sm">Eventos soportados</p>
            <div className="grid grid-cols-3 gap-2">
                {AVAILABLE_WEBHOOKS.map((webhook) => {
                    return <div key={webhook.id}>
                        <p>{webhook.label}</p>
                    </div>
                })}
            </div>
        </>
    )
}

type StoreForm = {
    storeUrl: string
    webhookSecret: string
    divisionId: string
}

const LinkWooCommerceStore = ({ onSubmit }: { onSubmit: () => any }) => {
    const { divisions: { update } } = useOrganization()
    const alert = useAlert()
    const { register, handleSubmit, formState: { errors, isSubmitting }, watch, setValue } = useForm<StoreForm>({
        mode: 'onBlur',
    })
    const modal = useModal('link-new-store')
    
    const submit = useCallback(async (query: StoreForm) => {
        window.alert(appId)
        try {
            await Gestiono.insertAppData({
                appId,
                type: 'woocommerce:store',
                data: {
                    storeUrl: query.storeUrl,
                    webhookSecret: query.webhookSecret,
                    divisionId: Number(query.divisionId),
                    webhooks: []
                }
            })
            
            onSubmit?.()
            update()
            modal?.close()
            alert?.open({
                msg: 'Tienda vinculada',
                variant: 'success'
            })
        } catch (error) {
            alert?.open({
                msg: 'Error al vincular la tienda',
                variant: 'error'
            })
        }
    }, [onSubmit, update, modal, alert])

    return <ButtonModal id="link-new-store" cta="Nueva tienda">
        <h2 className="mb-4">Vincular tienda WooCommerce</h2>
        <p className="text-sm text-ui-text-secondary mb-4">
            Agrega tu tienda para configurar los webhooks de sincronización.
        </p>
        {errors.root?.message && <div className="p-4 rounded-lg bg-ui-error text-ui-white">{errors.root?.message}</div>}
        <form onSubmit={handleSubmit(submit)}>
            <Input 
                {...register('storeUrl', {
                    required: 'El campo es requerido',
                    pattern: {
                        value: /^https?:\/\/.+/,
                        message: 'Debe ser una URL válida (ej: https://mitienda.com)'
                    }
                })} 
                label="URL de la tienda" 
                placeholder="https://mitienda.com"
                error={errors.storeUrl?.message} 
            />
            <Input 
                {...register('webhookSecret', {
                    required: 'El campo es requerido',
                    minLength: {
                        value: 12,
                        message: 'El secreto debe tener al menos 12 caracteres'
                    }
                })} 
                label="Webhook Secret" 
                placeholder="mi-secreto-seguro-123"
                error={errors.webhookSecret?.message} 
            />
            <p className="text-xs text-ui-text-secondary -mt-2 mb-4">
                Este secreto debe coincidir con el configurado en WooCommerce para verificar los webhooks.
            </p>
            <DivisionSelect 
                value={watch('divisionId')}
                setValue={(key, value) => {
                    setValue('divisionId', value)
                }}
                label="División"
            >
            </DivisionSelect>
            {errors.divisionId?.message && <p className="text-ui-error text-sm mt-1">{errors.divisionId?.message}</p>}
            <Button type="submit" loading={isSubmitting}>Vincular</Button>
        </form>
    </ButtonModal>
}

export default Project
