'use client'
import React, { useCallback, useEffect, useMemo, useState } from "react"
import Button from "@bitnation-dev/components/dist/components/Button"
import { ButtonModal } from "@bitnation-dev/components/dist/components/Modal/Modal"
import { useModal } from "@bitnation-dev/components/dist/components/Modal/Provider"
import Input, { Select } from "@bitnation-dev/components/dist/components/Input/Input"
import LoadingFlash from "@bitnation-dev/components/dist/components/LoadingFlash"
import { useForm } from "react-hook-form"
import { Gestiono } from "@bitnation-dev/management"
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

const appId = parseInt(process.env.GESTIONO_APP_ID || '0')
const basePath = `/app/${process.env.GESTIONO_APP_ID}`

const INVOICE_STATUS: Record<string, { label: string; color: string; textColor: string; bgLight: string }> = {
    PENDING: { label: 'Pendiente', color: 'bg-amber-500', textColor: 'text-amber-700', bgLight: 'bg-amber-50' },
    COMPLETED: { label: 'Pagada', color: 'bg-emerald-500', textColor: 'text-emerald-700', bgLight: 'bg-emerald-50' },
    CANCELED: { label: 'Cancelada', color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50' },
    ARCHIVED: { label: 'Archivada', color: 'bg-gray-500', textColor: 'text-gray-700', bgLight: 'bg-gray-50' },
    PAST_DUE: { label: 'Vencida', color: 'bg-red-600', textColor: 'text-red-800', bgLight: 'bg-red-50' },
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
                        <EditVehicleModal vehicle={vehicle} onSubmit={() => vehiclesData.update()} />
                        <Button fit variant="secondary" onClick={handleDelete}>
                            <TrashIcon />
                        </Button>
                    </div>
                }
            />

            {/* Vehicle Info Section */}
            <LayoutColumn size={2}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl border border-gray-100"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-gray-700">Información del Vehículo</h3>
                        <span className="text-sm text-gray-400">ID: #{vehicle.id}</span>
                    </div>

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
                    </div>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <h3 className="text-lg font-semibold text-gray-700 mb-4">Registro</h3>
                    
                    <InfoItem 
                        label="Fecha de registro" 
                        value={format(new Date(vehicle.data.registeredAt), "d 'de' MMMM, yyyy 'a las' HH:mm", { locale: es })}
                        icon="📅"
                    />

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
                </motion.div>
            </LayoutColumn>
            {/* Invoices Section - Full Width */}
            <LayoutColumn size={1}>
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
                        <Button onClick={() => window.open(`/accounting/pending-records/add?isSell=true&clientdata.plate=${vehicle.data.plate}`, '_blank')}>
                            Facturar
                        </Button>
                    </div>

                    {/* Invoice Summary Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-gray-50 rounded-xl p-4">
                            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
                                Total Facturas
                            </p>
                            <p className="text-2xl font-bold text-gray-800">
                                {vehicleInvoices.length}
                            </p>
                        </div>
                        <div className="bg-amber-50 rounded-xl p-4">
                            <p className="text-xs font-medium text-amber-600 uppercase tracking-wide mb-1">
                                Pendiente
                            </p>
                            <p className="text-2xl font-bold text-amber-700">
                                {formatCurrency(totalPending)}
                            </p>
                        </div>
                        <div className="bg-emerald-50 rounded-xl p-4">
                            <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide mb-1">
                                Pagado
                            </p>
                            <p className="text-2xl font-bold text-emerald-700">
                                {formatCurrency(totalPaid)}
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
            className={`border rounded-xl overflow-hidden transition-all ${
                expanded ? 'border-blue-200 shadow-md' : 'border-gray-100 hover:border-gray-200'
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

    return (
        <ButtonModal id="edit-vehicle" cta="Editar">
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
        </ButtonModal>
    )
}

export default VehicleDetails
