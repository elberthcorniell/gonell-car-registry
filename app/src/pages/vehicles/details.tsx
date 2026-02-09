'use client'
import React, { startTransition, useCallback, useEffect, useMemo, useState } from "react"
import Button from "@bitnation-dev/components/dist/components/Button"
import Modal, { ButtonModal } from "@bitnation-dev/components/dist/components/Modal/Modal"
import { useModal } from "@bitnation-dev/components/dist/components/Modal/Provider"
import Input, { Select } from "@bitnation-dev/components/dist/components/Input/Input"
import LoadingFlash from "@bitnation-dev/components/dist/components/LoadingFlash"
import { useForm } from "react-hook-form"
import { Gestiono, useOrganization } from "@bitnation-dev/management"
import { useAlert } from "../../hooks/alert"
import { LayoutColumn } from "@bitnation-dev/management/components/layout/layout-grid"
import { BreadcrumbAndHeader } from "@bitnation-dev/management/components/breadcrumbs"
import { useGestiono } from "@bitnation-dev/management/gestiono"
import { useParams, useRouter } from "../../components/router"
import { motion } from "framer-motion"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { LinkConstants } from "@bitnation-dev/management/consts/links"
import { VEHICLE_BRANDS, VEHICLE_MODELS, VEHICLE_COLORS, getBrandLabel, getModelLabel, getColorHex } from "./list"
import { AdvancedSearchFilter, GestionoPendingRecord } from "node_modules/@bitnation-dev/management/dist/common"

type InvoiceState = "PENDING" | "ARCHIVED" | "COMPLETED" | "ACTIVE" | "PAUSED" | "CANCELED" | "PAST_DUE" | "UNPAID" | "ENDED" | "INVOICE_MISSING"

type PendingRecordItemResource = {
    pendingRecordId: number
    resourceId: number
    date: string
}

type PendingRecordItem = Omit<GestionoPendingRecord, "payments" | "labels"> & {
    subTotalWithoutDiscount: number
    afterTaxesDiscount: number
    preTaxesDiscount: number
    creditDue: number
    state: InvoiceState
    labels?: string[]
    elements?: {
        id: number
        description: string
        quantity: number
        price: number
        unit: string
    }[]
}
import { TrashIcon } from "@bitnation-dev/management/icons"
import { ResourceWidget } from "@bitnation-dev/management/components/widgets"
import { BalanceCard } from "@bitnation-dev/management/components/balance-card"
import { Badge } from "@bitnation-dev/management/components/badge"

const appId = parseInt(process.env.GESTIONO_APP_ID || '0')
const basePath = `/app/${process.env.GESTIONO_APP_ID}`

const INVOICE_STATUS: Record<string, { label: string; color: string; textColor: string; bgLight: string }> = {
    PENDING: { label: 'Pendiente', color: 'bg-amber-500', textColor: 'text-amber-700', bgLight: 'bg-amber-50' },
    COMPLETED: { label: 'Pagada', color: 'bg-emerald-500', textColor: 'text-emerald-700', bgLight: 'bg-emerald-50' },
    CANCELED: { label: 'Cancelada', color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50' },
    ARCHIVED: { label: 'Archivada', color: 'bg-gray-500', textColor: 'text-gray-700', bgLight: 'bg-gray-50' },
    PAST_DUE: { label: 'Vencida', color: 'bg-red-600', textColor: 'text-red-800', bgLight: 'bg-red-50' },
}

// Service Categories and Items
const SERVICE_CATEGORIES: { value: ServiceCategory; label: string; icon: string }[] = [
    { value: 'fluids', label: 'Fluidos', icon: '🛢️' },
    { value: 'filters', label: 'Filtros', icon: '🔧' },
    { value: 'parts', label: 'Partes', icon: '⚙️' },
    { value: 'services', label: 'Servicios', icon: '🔩' },
]

const SERVICE_ITEMS: Record<ServiceCategory, { value: string; label: string }[]> = {
    fluids: [
        { value: 'motor_oil', label: 'Aceite Motor' },
        { value: 'coolant', label: 'Coolant' },
        { value: 'power_steering', label: 'Power Steering' },
        { value: 'brake_fluid', label: 'Líquido Freno' },
        { value: 'transmission_oil', label: 'Aceite Transmisión' },
        { value: 'differential_grease', label: 'Grasa Diferencial' },
        { value: 'oil_additive', label: 'Aditivo Aceite' },
        { value: 'transmission_additive', label: 'Aditivo Transmisión' },
        { value: 'fuel_additive', label: 'Aditivo Combustible' },
    ],
    filters: [
        { value: 'oil_filter', label: 'Filtro Aceite' },
        { value: 'air_filter', label: 'Filtro Aire' },
        { value: 'fuel_filter', label: 'Filtro Combustible' },
        { value: 'cabin_filter', label: 'Filtro Cabina' },
    ],
    parts: [
        { value: 'battery', label: 'Batería' },
        { value: 'tires', label: 'Gomas' },
        { value: 'front_belt', label: 'Banda Delantera' },
        { value: 'rear_belt', label: 'Banda Trasera' },
        { value: 'spark_plugs', label: 'Bujías' },
    ],
    services: [
        { value: 'alignment', label: 'Alineación' },
        { value: 'balancing', label: 'Balanceo' },
        { value: 'greasing', label: 'Engrase' },
        { value: 'brake_check', label: 'Chequeo Frenos' },
        { value: 'motor_flush', label: 'Flush Motor' },
        { value: 'radiator_flush', label: 'Flush Radiador' },
        { value: 'front_axle_repair', label: 'Rep. Tren Delantero' },
    ],
}

function getServiceItemLabel(category: ServiceCategory, itemType: string): string {
    const items = SERVICE_ITEMS[category] || []
    return items.find(i => i.value === itemType)?.label || itemType
}

function getCategoryLabel(category: ServiceCategory): string {
    return SERVICE_CATEGORIES.find(c => c.value === category)?.label || category
}

function getCategoryIcon(category: ServiceCategory): string {
    return SERVICE_CATEGORIES.find(c => c.value === category)?.icon || '📦'
}

function getColorLabel(colorName: string, customColor?: string): string {
    if (colorName === 'other' && customColor) return customColor
    return VEHICLE_COLORS.find(c => c.value === colorName)?.label || colorName
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-DO', {
        style: 'currency',
        currency: 'DOP',
        minimumFractionDigits: 2
    }).format(amount)
}

const VehicleDetails = () => {
    const params = useParams<{ id: string }>()
    const router = useRouter()
    const alert = useAlert()
    const vehicleId = parseInt(params.id || '0')

    const vehiclesData = useGestiono('getAppData', {
        appId,
        type: 'vehicles.v1'
    }, {
        cache: true,
        swr: true
    })


    const vehicles = useMemo(() => (vehiclesData.data as unknown as Vehicle[] | undefined) || [], [vehiclesData.data])
    const vehicle = useMemo(() => vehicles.find(v => v.id === vehicleId) as Vehicle | undefined, [vehicles, vehicleId])

    const invoicesData = useGestiono('v2GetPendingRecords', {
        query: {
            type: 'INVOICE',
            advancedSearch: JSON.stringify([{
                field: '@plate',
                value: vehicle?.data.plate || '',
                method: '='
            } satisfies AdvancedSearchFilter]) as unknown as AdvancedSearchFilter[]
        },
    }, {
        cache: true,
        swr: true
    })

    useEffect(() => {
        invoicesData.update()
    }, [vehicle])

    const vehicleInvoices = invoicesData.data?.items || []

    // Fetch invoiced items for this vehicle
    const [invoicedItems, setInvoicedItems] = useState<PendingRecordItemResource[]>([])
    const [invoicedItemsLoading, setInvoicedItemsLoading] = useState(false)
    const [beneficiaryData, setBeneficiaryData] = useState<any>(null)
    const [beneficiaryDataLoading, setBeneficiaryDataLoading] = useState(false)

    useEffect(() => {
        if (!vehicle?.data.plate) return

        const fetchInvoicedItems = async () => {
            setInvoicedItemsLoading(true)
            try {
                const response = await Gestiono.call('/v2/record/pending/items', {
                    query: {
                        type: 'INVOICE',
                        advancedSearch: JSON.stringify([{
                            field: '@plate',
                            value: vehicle.data.plate,
                            method: '='
                        } satisfies AdvancedSearchFilter])
                    }
                })
                setInvoicedItems(response as PendingRecordItemResource[] || [])
            } catch (error) {
                console.error('Error fetching invoiced items:', error)
                setInvoicedItems([])
            } finally {
                setInvoicedItemsLoading(false)
            }
        }

        fetchInvoicedItems()
    }, [vehicle?.data.plate])

    useEffect(() => {
        if (!vehicle?.data) return
        const fetchBeneficiary = async () => {
            try {
                const response = await Gestiono.getBeneficiaryById({
                    beneficiaryId: vehicle?.data.beneficiaryId || 0
                })
                setBeneficiaryData(response || null)
            } catch (error) {
                console.error('Error fetching beneficiary:', error)
                setBeneficiaryData(null)
            } finally {
                setBeneficiaryDataLoading(false)
            }
        }

        fetchBeneficiary()
    }, [])

    const handleDelete = useCallback(async () => {
        if (!vehicle) return

        const confirmed = window.confirm('¿Estás seguro de que deseas eliminar este vehículo? Esta acción no se puede deshacer.')
        if (!confirmed) return

        try {
            await Gestiono.deleteAppData({
                appId,
                appDataId: vehicle.id
            })
            alert?.open({
                msg: 'Vehículo eliminado',
                variant: 'success'
            })
            router.push(basePath)
        } catch (error) {
            alert?.open({
                msg: 'Error al eliminar el vehículo',
                variant: 'error'
            })
        }
    }, [vehicle, alert, router])

    if (vehiclesData.loading) {
        return (
            <>
                <BreadcrumbAndHeader
                    href={basePath as LinkConstants}
                    title="Cargando..."
                />
                <LoadingFlash loading={true} />
            </>
        )
    }

    if (!vehicle) {
        return (
            <>
                <BreadcrumbAndHeader
                    href={basePath as LinkConstants}
                    title="Vehículo no encontrado"
                />
                <LayoutColumn size={1}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-16"
                    >
                        <div className="text-6xl mb-4">🔍</div>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">
                            Vehículo no encontrado
                        </h3>
                        <p className="text-gray-500 mb-6">
                            El vehículo que buscas no existe o fue eliminado.
                        </p>
                        <Button onClick={() => router.push(basePath)}>
                            Volver al listado
                        </Button>
                    </motion.div>
                </LayoutColumn>
            </>
        )
    }

    const totalPending = invoicesData.data?.resume.toCharge || 0
    const totalPaid = invoicesData.data?.resume.totalPaid || 0

    const brandDisplay = getBrandLabel(vehicle.data.brand, vehicle.data.customBrand)
    const modelDisplay = getModelLabel(vehicle.data.brand, vehicle.data.model, vehicle.data.customModel)
    const colorDisplay = getColorLabel(vehicle.data.color, vehicle.data.customColor)

    return (
        <>
            <BreadcrumbAndHeader
                href={basePath as LinkConstants}
                title={`${brandDisplay} ${modelDisplay}`}
                actions={
                    <div className="flex gap-2">
                        <Button fit variant="secondary" onClick={handleDelete}>
                            <TrashIcon />
                        </Button>
                        <EditVehicleModal vehicle={vehicle} onSubmit={() => vehiclesData.update()} />

                        <Button fit onClick={() => {
                            window.location.href = `/accounting/pending-records/add?isSell=true&clientdata.plate=${vehicle.data.plate}`
                        }}>
                            Facturar
                        </Button>
                    </div>
                }
            />

            {/* Vehicle Info Section */}
            <LayoutColumn size={1}>
                <Badge>#{vehicle.id}</Badge>
                {/* Invoice Summary Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <BalanceCard
                        label="Total Facturas"
                        amount={vehicleInvoices.length}
                        currency="ignore"
                    />
                    <BalanceCard
                        label="Pendiente"
                        amount={parseFloat(formatCurrency(totalPending || 0))}
                    />
                    <BalanceCard
                        label="Pagado"
                        amount={parseFloat(formatCurrency(totalPaid || 0))}
                    />
                </div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-gray-100"
                >
                    <div className="plate-badge px-6 py-4 rounded-xl font-mono font-bold text-3xl tracking-widest text-center mb-6 shadow-lg">
                        <p className="m-auto text-center">{vehicle.data.plate}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <InfoItem label="Marca" value={brandDisplay} />
                        <InfoItem label="Modelo" value={modelDisplay} />
                        <InfoItem label="Año" value={vehicle.data.year.toString()} />
                        <InfoItem
                            label="Color"
                            value={
                                <div className="flex items-center gap-2">
                                    <span
                                        className="w-4 h-4 rounded-full border border-gray-200"
                                        style={{ backgroundColor: getColorHex(vehicle.data.color) }}
                                    />
                                    {colorDisplay}
                                </div>
                            }
                        />
                        {vehicle.data.vin && (
                            <div className="col-span-2">
                                <InfoItem label="VIN" value={vehicle.data.vin} />
                            </div>
                        )}
                        <InfoItem
                            label="Fecha de registro"
                            value={format(new Date(vehicle.data.registeredAt), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                            icon="📅"
                        />
                        {vehicle.data.beneficiaryId && (
                            <InfoItem
                                label="Cliente"
                                value={beneficiaryDataLoading ? 'Cargando...' : ((beneficiaryData as any)?.name || `#${vehicle.data.beneficiaryId}`)}
                                icon="👤"
                            />
                        )}

                        {vehicle.data.notes && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">
                                    Notas
                                </label>
                                <p className="text-gray-700 bg-gray-50 rounded-lg p-3">
                                    {vehicle.data.notes}
                                </p>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Service History Section */}
                <ServiceHistorySection vehicle={vehicle} onUpdate={() => vehiclesData.update()} />

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-700">Facturas</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Historial de facturas asociadas a este vehículo
                            </p>
                        </div>
                    </div>

                    {/* Invoices List */}
                    {invoicesData.loading ? (
                        <LoadingFlash loading={true} />
                    ) : vehicleInvoices.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-xl">
                            <div className="text-4xl mb-3">📄</div>
                            <p className="text-gray-500">No hay facturas registradas</p>
                            <p className="text-sm text-gray-400 mt-1">
                                Crea la primera factura para este vehículo
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {vehicleInvoices
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .map((invoice, index) => (
                                    <InvoiceCard
                                        key={invoice.id}
                                        invoice={invoice}
                                        index={index}
                                    />
                                ))
                            }
                        </div>
                    )}
                </motion.div>
            </LayoutColumn>

            {/* Invoiced Items Section */}
            <LayoutColumn size={1}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                >
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-700">Artículos Facturados</h3>
                            <p className="text-sm text-gray-500 mt-1">
                                Recursos asociados a las facturas de este vehículo
                            </p>
                        </div>
                    </div>

                    {invoicedItemsLoading ? (
                        <LoadingFlash loading={true} />
                    ) : invoicedItems.length === 0 ? (
                        <div className="text-center py-12 bg-gray-50 rounded-xl">
                            <div className="text-4xl mb-3">📦</div>
                            <p className="text-gray-500">No hay artículos facturados</p>
                            <p className="text-sm text-gray-400 mt-1">
                                Los artículos aparecerán cuando se facturen recursos
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {invoicedItems
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .map((item, index) => (
                                    <ResourceRecordCard
                                        key={`${item.pendingRecordId}-${item.resourceId}`}
                                        item={item}
                                        index={index}
                                    />
                                ))
                            }
                        </div>
                    )}
                </motion.div>
            </LayoutColumn>
        </>
    )
}

const InvoiceCard = ({
    invoice,
    index
}: {
    invoice: PendingRecordItem
    index: number
}) => {
    const [expanded, setExpanded] = useState(false)
    const statusConfig = INVOICE_STATUS[invoice.state] || INVOICE_STATUS.PENDING

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`border rounded-xl overflow-hidden transition-all ${expanded ? 'border-blue-200 shadow-md' : 'border-gray-100 hover:border-gray-200'
                }`}
        >
            <div
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`w-2 h-2 rounded-full ${statusConfig.color}`} />
                        <div>
                            <p className="font-mono font-semibold text-gray-800">
                                #{invoice.id}
                            </p>
                            <p className="text-xs text-gray-500">
                                {format(new Date(invoice.date), "d MMM yyyy", { locale: es })}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusConfig.bgLight} ${statusConfig.textColor}`}>
                            {statusConfig.label}
                        </span>
                        <p className="font-bold text-gray-800 text-lg">
                            {formatCurrency(invoice.amount)}
                        </p>
                        <span className={`text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>
                            ▼
                        </span>
                    </div>
                </div>
            </div>

            {expanded && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="border-t border-gray-100 bg-gray-50 p-4"
                >
                    {/* Description */}
                    {invoice.description && (
                        <div className="mb-4">
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Descripción</p>
                            <p className="text-sm text-gray-700">{invoice.description}</p>
                        </div>
                    )}

                    {/* Totals */}
                    <div className="border-t border-gray-200 pt-3 space-y-1">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Subtotal</span>
                            <span className="text-gray-700">{formatCurrency(invoice.subTotal)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500">Impuestos</span>
                            <span className="text-gray-700">{formatCurrency(invoice.taxes)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-300">
                            <span>Total</span>
                            <span>{formatCurrency(invoice.amount)}</span>
                        </div>
                        {invoice.paid > 0 && (
                            <div className="flex justify-between text-sm text-emerald-600">
                                <span>Pagado</span>
                                <span>{formatCurrency(invoice.paid)}</span>
                            </div>
                        )}
                        {invoice.dueToPay > 0 && (
                            <div className="flex justify-between text-sm text-amber-600 font-medium">
                                <span>Por pagar</span>
                                <span>{formatCurrency(invoice.dueToPay)}</span>
                            </div>
                        )}
                    </div>

                    {invoice.notes && (
                        <div className="mt-4 p-3 bg-white rounded-lg">
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Notas</p>
                            <p className="text-sm text-gray-700">{invoice.notes}</p>
                        </div>
                    )}

                    {invoice.state === 'COMPLETED' && (
                        <p className="text-xs text-emerald-600 mt-3">
                            ✓ Factura completada
                        </p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200">
                        <a href={`/accounting/pending-records/${invoice.id}`} target="_blank">
                            Ver factura
                        </a>
                    </div>
                </motion.div>
            )}
        </motion.div>
    )
}

const InfoItem = ({
    label,
    value,
    icon
}: {
    label: string
    value: React.ReactNode
    icon?: string
}) => (
    <div>
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1 block">
            {label}
        </label>
        <div className="text-gray-800 font-medium flex items-center gap-2">
            {icon && <span className="text-gray-400">{icon}</span>}
            {value}
        </div>
    </div>
)

const ResourceRecordCard = ({
    item,
    index
}: {
    item: PendingRecordItemResource
    index: number
}) => {
    const resource = useGestiono('getResourceById', item.resourceId, {
        cache: true,
        swr: true
    })
    console.log(resource)
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition-colors bg-white"
        >
            <div className="flex items-center justify-between">
                {/* @ts-ignore */}
                <ResourceWidget data={resource.data} />
                <div className="flex items-center gap-3">
                    <a
                        href={`/accounting/pending-records/${item.pendingRecordId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
                    >
                        Factura #{item.pendingRecordId}
                    </a>
                </div>
            </div>
        </motion.div>
    )
}

const EditVehicleModal = ({ vehicle, onSubmit }: { vehicle: Vehicle; onSubmit: () => void }) => {
    const alert = useAlert()
    const modal = useModal('edit-vehicle')
    const { register, handleSubmit, formState: { errors, isSubmitting }, watch, setValue } = useForm<VehicleFormData>({
        mode: 'onBlur',
        defaultValues: {
            plate: vehicle.data.plate,
            brand: vehicle.data.brand,
            customBrand: vehicle.data.customBrand || '',
            model: vehicle.data.model,
            customModel: vehicle.data.customModel || '',
            year: vehicle.data.year.toString(),
            color: vehicle.data.color,
            customColor: vehicle.data.customColor || '',
            vin: vehicle.data.vin || '',
            notes: vehicle.data.notes || '',
            tireType: vehicle.data.tireType || '',
            filterType: vehicle.data.filterType || '',
        }
    })

    const watchedBrand = watch('brand')
    const watchedModel = watch('model')
    const watchedColor = watch('color')

    const availableModels = VEHICLE_MODELS[watchedBrand] || VEHICLE_MODELS.default

    const submit = useCallback(async (data: VehicleFormData) => {
        try {
            await Gestiono.updateAppData({
                id: vehicle.id,
                appId,
                type: 'vehicles.v1',
                strategy: 'merge',
                data: {
                    plate: data.plate.toUpperCase().trim(),
                    brand: data.brand,
                    customBrand: data.brand === 'other' ? data.customBrand?.trim() : undefined,
                    model: data.model,
                    customModel: data.model === 'other' ? data.customModel?.trim() : undefined,
                    year: parseInt(data.year),
                    color: data.color,
                    customColor: data.color === 'other' ? data.customColor?.trim() : undefined,
                    vin: data.vin?.trim() || undefined,
                    notes: data.notes?.trim() || undefined,
                    tireType: data.tireType?.trim() || undefined,
                    filterType: data.filterType?.trim() || undefined,
                }
            })

            onSubmit?.()
            modal?.close()
            alert?.open({
                msg: 'Vehículo actualizado',
                variant: 'success'
            })
        } catch (error) {
            alert?.open({
                msg: 'Error al actualizar el vehículo',
                variant: 'error'
            })
        }
    }, [vehicle.id, onSubmit, modal, alert])

    const currentYear = new Date().getFullYear()

    const handleClose = useCallback(() => {
        startTransition(() => {
            modal?.close()
        })
    }, [modal])

    return (
        <Modal id="edit-vehicle" className="hide-modal-close" Trigger={({ onClick }) => <Button fit variant="tertiary" onClick={onClick}>Editar</Button>}>
            <button
                type="button"
                onClick={handleClose}
                className="absolute top-2 right-3 text-2xl text-gray-500 !bg-brand-gray-100 border-0 hover:text-gray-800 z-10"
                aria-label="Cerrar"
            >
                ×
            </button>
            <h2 className="text-2xl font-bold mb-2">Editar Vehículo</h2>
            <p className="text-sm text-gray-500 mb-6">
                Modifica los datos del vehículo.
            </p>

            <form onSubmit={handleSubmit(submit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <Input
                        {...register('plate', {
                            required: 'La placa es requerida',
                            pattern: {
                                value: /^[A-Za-z0-9-]+$/,
                                message: 'Formato de placa inválido'
                            }
                        })}
                        label="Placa *"
                        placeholder="ABC-1234"
                        error={errors.plate?.message}
                    />
                    <Input
                        {...register('vin')}
                        label="VIN (opcional)"
                        placeholder="1HGBH41JXMN109186"
                        error={errors.vin?.message}
                    />
                </div>

                {/* Brand */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Select
                            {...register('brand', {
                                required: 'La marca es requerida',
                                onChange: () => setValue('model', '')
                            })}
                            label="Marca *"
                        >
                            <option value="">Seleccionar marca</option>
                            {VEHICLE_BRANDS.map(brand => (
                                <option key={brand.value} value={brand.value}>
                                    {brand.label}
                                </option>
                            ))}
                        </Select>
                        {errors.brand?.message && (
                            <p className="text-red-500 text-sm mt-1">{errors.brand.message}</p>
                        )}
                    </div>

                    {watchedBrand === 'other' ? (
                        <Input
                            {...register('customBrand', {
                                required: watchedBrand === 'other' ? 'Especifica la marca' : false
                            })}
                            label="Especificar Marca *"
                            placeholder="Ej: Ferrari"
                            error={errors.customBrand?.message}
                        />
                    ) : (
                        <div>
                            <Select
                                {...register('model', {
                                    required: 'El modelo es requerido'
                                })}
                                label="Modelo *"
                                disabled={!watchedBrand}
                            >
                                <option value="">Seleccionar modelo</option>
                                {availableModels.map(model => (
                                    <option key={model.value} value={model.value}>
                                        {model.label}
                                    </option>
                                ))}
                            </Select>
                            {errors.model?.message && (
                                <p className="text-red-500 text-sm mt-1">{errors.model.message}</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Custom Model (when brand is not 'other' but model is 'other') */}
                {watchedBrand !== 'other' && watchedModel === 'other' && (
                    <Input
                        {...register('customModel', {
                            required: watchedModel === 'other' ? 'Especifica el modelo' : false
                        })}
                        label="Especificar Modelo *"
                        placeholder="Ej: Supra GR"
                        error={errors.customModel?.message}
                    />
                )}

                {/* When brand is 'other', also need custom model */}
                {watchedBrand === 'other' && (
                    <Input
                        {...register('customModel', {
                            required: watchedBrand === 'other' ? 'Especifica el modelo' : false
                        })}
                        label="Modelo *"
                        placeholder="Ej: 488 GTB"
                        error={errors.customModel?.message}
                    />
                )}

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        {...register('year', {
                            required: 'El año es requerido',
                            pattern: {
                                value: /^\d{4}$/,
                                message: 'Ingresa un año válido (4 dígitos)'
                            },
                            min: { value: 1900, message: 'Año inválido' },
                            max: { value: currentYear + 1, message: 'Año inválido' }
                        })}
                        label="Año *"
                        type="number"
                        placeholder={currentYear.toString()}
                        min={1900}
                        max={currentYear + 1}
                        error={errors.year?.message}
                    />
                    <div>
                        <Select
                            {...register('color', {
                                required: 'El color es requerido'
                            })}
                            label="Color *"
                        >
                            <option value="">Seleccionar color</option>
                            {VEHICLE_COLORS.map(color => (
                                <option key={color.value} value={color.value}>
                                    {color.label}
                                </option>
                            ))}
                        </Select>
                        {errors.color?.message && (
                            <p className="text-red-500 text-sm mt-1">{errors.color.message}</p>
                        )}
                    </div>
                </div>

                {/* Custom Color */}
                {watchedColor === 'other' && (
                    <Input
                        {...register('customColor', {
                            required: watchedColor === 'other' ? 'Especifica el color' : false
                        })}
                        label="Especificar Color *"
                        placeholder="Ej: Verde metálico"
                        error={errors.customColor?.message}
                    />
                )}

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        {...register('tireType')}
                        label="Tipo de Goma"
                        placeholder="Ej: 205/55R16"
                        error={errors.tireType?.message}
                    />
                    <Input
                        {...register('filterType')}
                        label="Tipo de Filtro"
                        placeholder="Ej: Mann HU 816 x"
                        error={errors.filterType?.message}
                    />
                </div>

                <Input
                    {...register('notes')}
                    label="Notas adicionales"
                    placeholder="Información adicional sobre el vehículo..."
                />

                <div className="pt-4">
                    <Button type="submit" loading={isSubmitting}>
                        Guardar Cambios
                    </Button>
                </div>
            </form>
        </Modal>
    )
}

type ServiceFormData = {
    category: ServiceCategory | ''
    itemType: string
    brand: string
    date: string
    km: string
    notes?: string
}

const AddServiceModal = ({
    vehicle,
    onSubmit
}: {
    vehicle: Vehicle
    onSubmit: () => void
}) => {
    const alert = useAlert()
    const modal = useModal('add-service')

    // Get last service record for smart defaults
    const lastRecord = useMemo(() => {
        const records = vehicle.data.serviceRecords || []
        if (records.length === 0) return null
        return [...records].sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0]
    }, [vehicle.data.serviceRecords])

    const { register, handleSubmit, formState: { errors, isSubmitting }, watch, setValue, reset } = useForm<ServiceFormData>({
        mode: 'onBlur',
        defaultValues: {
            category: '',
            itemType: '',
            brand: '',
            date: lastRecord?.date || format(new Date(), 'yyyy-MM-dd'),
            km: lastRecord?.km?.toString() || '',
            notes: '',
        }
    })

    const watchedCategory = watch('category')
    const availableItems = watchedCategory ? SERVICE_ITEMS[watchedCategory] : []

    // Reset itemType when category changes
    useEffect(() => {
        setValue('itemType', '')
    }, [watchedCategory, setValue])

    const submit = useCallback(async (data: ServiceFormData) => {
        if (!data.category) return

        const newRecord: ServiceRecord = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            category: data.category as ServiceCategory,
            itemType: data.itemType,
            brand: data.brand.trim(),
            date: data.date,
            km: parseInt(data.km) || 0,
            notes: data.notes?.trim() || undefined,
        }

        const existingRecords = vehicle.data.serviceRecords || []

        try {
            await Gestiono.updateAppData({
                id: vehicle.id,
                appId,
                type: 'vehicles.v1',
                strategy: 'merge',
                data: {
                    serviceRecords: [...existingRecords, newRecord]
                }
            })

            onSubmit?.()
            modal?.close()
            // Reset form with the new record's date and km as defaults for next entry
            reset({
                category: '',
                itemType: '',
                brand: '',
                date: newRecord.date,
                km: newRecord.km.toString(),
                notes: '',
            })
            alert?.open({
                msg: 'Registro de servicio agregado',
                variant: 'success'
            })
        } catch (error) {
            alert?.open({
                msg: 'Error al agregar el registro',
                variant: 'error'
            })
        }
    }, [vehicle, onSubmit, modal, alert, reset])

    const handleClose = useCallback(() => {
        startTransition(() => {
            modal?.close()
        })
    }, [modal])

    return (
        <Modal
            id="add-service"
            className="hide-modal-close"
            Trigger={({ onClick }) => (
                <Button fit variant="secondary" onClick={onClick}>
                    + Agregar Registro
                </Button>
            )}
        >
            <button
                type="button"
                onClick={handleClose}
                className="absolute top-2 right-3 text-2xl text-gray-500 !bg-brand-gray-100 border-0 hover:text-gray-800 z-10"
                aria-label="Cerrar"
            >
                ×
            </button>
            <h2 className="text-2xl font-bold mb-2">Agregar Registro de Servicio</h2>
            <p className="text-sm text-gray-500 mb-6">
                Registra un servicio realizado al vehículo.
            </p>

            <form onSubmit={handleSubmit(submit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Select
                            {...register('category', {
                                required: 'La categoría es requerida'
                            })}
                            label="Categoría *"
                        >
                            <option value="">Seleccionar categoría</option>
                            {SERVICE_CATEGORIES.map(cat => (
                                <option key={cat.value} value={cat.value}>
                                    {cat.icon} {cat.label}
                                </option>
                            ))}
                        </Select>
                        {errors.category?.message && (
                            <p className="text-red-500 text-sm mt-1">{errors.category.message}</p>
                        )}
                    </div>

                    <div>
                        <Select
                            {...register('itemType', {
                                required: 'El tipo es requerido'
                            })}
                            label="Tipo *"
                            disabled={!watchedCategory}
                        >
                            <option value="">Seleccionar tipo</option>
                            {availableItems.map(item => (
                                <option key={item.value} value={item.value}>
                                    {item.label}
                                </option>
                            ))}
                        </Select>
                        {errors.itemType?.message && (
                            <p className="text-red-500 text-sm mt-1">{errors.itemType.message}</p>
                        )}
                    </div>
                </div>

                <Input
                    {...register('brand', {
                        required: 'La marca/producto es requerida'
                    })}
                    label="Marca / Producto *"
                    placeholder="Ej: Mobil 1, Prestone, Bosch..."
                    error={errors.brand?.message}
                />

                <div className="grid grid-cols-2 gap-4">
                    <Input
                        {...register('date', {
                            required: 'La fecha es requerida'
                        })}
                        label="Fecha *"
                        type="date"
                        error={errors.date?.message}
                    />

                    <Input
                        {...register('km', {
                            required: 'El kilometraje es requerido',
                            pattern: {
                                value: /^\d+$/,
                                message: 'Ingresa un número válido'
                            }
                        })}
                        label="KM / Millas *"
                        type="number"
                        placeholder="Ej: 45000"
                        error={errors.km?.message}
                    />
                </div>

                <Input
                    {...register('notes')}
                    label="Notas (opcional)"
                    placeholder="Observaciones adicionales..."
                />

                <Button full type="submit" loading={isSubmitting}>
                    Guardar Registro
                </Button>
            </form>
        </Modal>
    )
}

const ServiceRecordCard = ({
    record,
    index,
    onDelete
}: {
    record: ServiceRecord
    index: number
    onDelete: () => void
}) => {
    const [expanded, setExpanded] = useState(false)

    const categoryIcon = getCategoryIcon(record.category)
    const categoryLabel = getCategoryLabel(record.category)
    const itemLabel = getServiceItemLabel(record.category, record.itemType)

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
            className={`border rounded-xl overflow-hidden transition-all bg-white ${expanded ? 'border-blue-200 shadow-md' : 'border-gray-100 hover:border-gray-200'
                }`}
        >
            <div
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">{categoryIcon}</span>
                        <div>
                            <p className="font-semibold text-gray-800">
                                {itemLabel}
                            </p>
                            <p className="text-xs text-gray-500">
                                {categoryLabel}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-sm font-medium text-gray-700">
                                {record.brand}
                            </p>
                            <p className="text-xs text-gray-500">
                                {format(new Date(record.date), "d MMM yyyy", { locale: es })}
                            </p>
                        </div>
                        <div className="bg-gray-100 px-3 py-1 rounded-full">
                            <p className="text-xs font-mono font-medium text-gray-600">
                                {record.km.toLocaleString()} km
                            </p>
                        </div>
                        <span className={`text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>
                            ▼
                        </span>
                    </div>
                </div>
            </div>

            {expanded && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="border-t border-gray-100 bg-gray-50 p-4"
                >
                    <div className="grid grid-cols-3 gap-4 mb-4">
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Categoría</p>
                            <p className="text-sm text-gray-700 flex items-center gap-1">
                                {categoryIcon} {categoryLabel}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Tipo</p>
                            <p className="text-sm text-gray-700">{itemLabel}</p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Marca/Producto</p>
                            <p className="text-sm text-gray-700 font-medium">{record.brand}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Fecha</p>
                            <p className="text-sm text-gray-700">
                                {format(new Date(record.date), "d 'de' MMMM, yyyy", { locale: es })}
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Kilometraje</p>
                            <p className="text-sm text-gray-700 font-mono">{record.km.toLocaleString()} km</p>
                        </div>
                    </div>

                    {record.notes && (
                        <div className="mb-4 p-3 bg-white rounded-lg">
                            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Notas</p>
                            <p className="text-sm text-gray-700">{record.notes}</p>
                        </div>
                    )}

                    <div className="flex justify-end pt-3 border-t border-gray-200">
                        <Button
                            fit
                            variant="secondary"
                            onClick={(e) => {
                                e.stopPropagation()
                                if (window.confirm('¿Estás seguro de que deseas eliminar este registro?')) {
                                    onDelete()
                                }
                            }}
                        >
                            <TrashIcon /> Eliminar
                        </Button>
                    </div>
                </motion.div>
            )}
        </motion.div>
    )
}

const ServiceHistorySection = ({
    vehicle,
    onUpdate
}: {
    vehicle: Vehicle
    onUpdate: () => void
}) => {
    const alert = useAlert()
    const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | 'all'>('all')
    const serviceRecords = vehicle.data.serviceRecords || []

    const filteredRecords = useMemo(() => {
        if (selectedCategory === 'all') return serviceRecords
        return serviceRecords.filter(r => r.category === selectedCategory)
    }, [serviceRecords, selectedCategory])

    const sortedRecords = useMemo(() => {
        return [...filteredRecords].sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        )
    }, [filteredRecords])

    const handleDeleteRecord = useCallback(async (recordId: string) => {
        const updatedRecords = serviceRecords.filter(r => r.id !== recordId)

        try {
            await Gestiono.updateAppData({
                id: vehicle.id,
                appId,
                type: 'vehicles.v1',
                strategy: 'merge',
                data: {
                    serviceRecords: updatedRecords
                }
            })

            onUpdate()
            alert?.open({
                msg: 'Registro eliminado',
                variant: 'success'
            })
        } catch (error) {
            alert?.open({
                msg: 'Error al eliminar el registro',
                variant: 'error'
            })
        }
    }, [vehicle.id, serviceRecords, onUpdate, alert])

    // Group records by category for summary
    const categorySummary = useMemo(() => {
        const summary: Record<ServiceCategory, number> = {
            fluids: 0,
            filters: 0,
            parts: 0,
            services: 0
        }
        serviceRecords.forEach((r: ServiceRecord) => {
            summary[r.category]++
        })
        return summary
    }, [serviceRecords])

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
        >
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-lg font-semibold text-gray-700">Historial de Servicios</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Registros de mantenimiento y servicios del vehículo
                    </p>
                </div>
                <AddServiceModal vehicle={vehicle} onSubmit={onUpdate} />
            </div>

            {/* Category Summary Pills */}
            {serviceRecords.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                    <button
                        onClick={() => setSelectedCategory('all')}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedCategory === 'all'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                    >
                        Todos ({serviceRecords.length})
                    </button>
                    {SERVICE_CATEGORIES.map(cat => (
                        <button
                            key={cat.value}
                            onClick={() => setSelectedCategory(cat.value)}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedCategory === cat.value
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {cat.icon} {cat.label} ({categorySummary[cat.value]})
                        </button>
                    ))}
                </div>
            )}

            {/* Records List */}
            {sortedRecords.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                    <div className="text-4xl mb-3">🔧</div>
                    <p className="text-gray-500">
                        {selectedCategory === 'all'
                            ? 'No hay registros de servicio'
                            : `No hay registros de ${getCategoryLabel(selectedCategory as ServiceCategory).toLowerCase()}`
                        }
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                        Agrega un registro para llevar el historial del vehículo
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {sortedRecords.map((record, index) => (
                        <ServiceRecordCard
                            key={record.id}
                            record={record}
                            index={index}
                            onDelete={() => handleDeleteRecord(record.id)}
                        />
                    ))}
                </div>
            )}
        </motion.div>
    )
}

export default VehicleDetails
