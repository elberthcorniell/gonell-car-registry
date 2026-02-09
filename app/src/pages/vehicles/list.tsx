'use client'
import React, { useCallback, useState } from "react"
import Button from "@bitnation-dev/components/dist/components/Button"
import { ButtonModal } from "@bitnation-dev/components/dist/components/Modal/Modal"
import { useModal } from "@bitnation-dev/components/dist/components/Modal/Provider"
import Input, { Select } from "@bitnation-dev/components/dist/components/Input/Input"
import LoadingFlash from "@bitnation-dev/components/dist/components/LoadingFlash"
import { useForm } from "react-hook-form"
import { Gestiono } from "@bitnation-dev/management"
import { useAlert } from "../../hooks/alert"
import { LayoutColumn } from "@bitnation-dev/management/components/layout/layout-grid"
import { LinkConstants } from "@bitnation-dev/management/consts/links"
import { BreadcrumbAndHeader } from "@bitnation-dev/management/components/breadcrumbs"
import { useGestiono } from "@bitnation-dev/management/gestiono"
import { useRouter } from "../../components/router"
import { motion } from "framer-motion"

const appId = parseInt(process.env.GESTIONO_APP_ID || '0')
const basePath = `/app/${process.env.GESTIONO_APP_ID}`

const VEHICLE_BRANDS = [
    { value: 'toyota', label: 'Toyota' },
    { value: 'honda', label: 'Honda' },
    { value: 'nissan', label: 'Nissan' },
    { value: 'hyundai', label: 'Hyundai' },
    { value: 'kia', label: 'Kia' },
    { value: 'mazda', label: 'Mazda' },
    { value: 'ford', label: 'Ford' },
    { value: 'chevrolet', label: 'Chevrolet' },
    { value: 'jeep', label: 'Jeep' },
    { value: 'bmw', label: 'BMW' },
    { value: 'mercedes', label: 'Mercedes-Benz' },
    { value: 'audi', label: 'Audi' },
    { value: 'volkswagen', label: 'Volkswagen' },
    { value: 'mitsubishi', label: 'Mitsubishi' },
    { value: 'suzuki', label: 'Suzuki' },
    { value: 'subaru', label: 'Subaru' },
    { value: 'lexus', label: 'Lexus' },
    { value: 'acura', label: 'Acura' },
    { value: 'infiniti', label: 'Infiniti' },
    { value: 'other', label: 'Otro' },
]

const VEHICLE_MODELS: Record<string, { value: string; label: string }[]> = {
    toyota: [
        { value: 'corolla', label: 'Corolla' },
        { value: 'camry', label: 'Camry' },
        { value: 'rav4', label: 'RAV4' },
        { value: 'hilux', label: 'Hilux' },
        { value: 'prado', label: 'Land Cruiser Prado' },
        { value: 'yaris', label: 'Yaris' },
        { value: 'fortuner', label: 'Fortuner' },
        { value: 'tacoma', label: 'Tacoma' },
        { value: 'other', label: 'Otro' },
    ],
    honda: [
        { value: 'civic', label: 'Civic' },
        { value: 'accord', label: 'Accord' },
        { value: 'crv', label: 'CR-V' },
        { value: 'hrv', label: 'HR-V' },
        { value: 'pilot', label: 'Pilot' },
        { value: 'fit', label: 'Fit' },
        { value: 'other', label: 'Otro' },
    ],
    nissan: [
        { value: 'sentra', label: 'Sentra' },
        { value: 'altima', label: 'Altima' },
        { value: 'pathfinder', label: 'Pathfinder' },
        { value: 'rogue', label: 'Rogue' },
        { value: 'frontier', label: 'Frontier' },
        { value: 'kicks', label: 'Kicks' },
        { value: 'versa', label: 'Versa' },
        { value: 'other', label: 'Otro' },
    ],
    hyundai: [
        { value: 'elantra', label: 'Elantra' },
        { value: 'sonata', label: 'Sonata' },
        { value: 'tucson', label: 'Tucson' },
        { value: 'santafe', label: 'Santa Fe' },
        { value: 'accent', label: 'Accent' },
        { value: 'creta', label: 'Creta' },
        { value: 'other', label: 'Otro' },
    ],
    kia: [
        { value: 'rio', label: 'Rio' },
        { value: 'forte', label: 'Forte' },
        { value: 'optima', label: 'Optima' },
        { value: 'sportage', label: 'Sportage' },
        { value: 'sorento', label: 'Sorento' },
        { value: 'seltos', label: 'Seltos' },
        { value: 'other', label: 'Otro' },
    ],
    default: [
        { value: 'other', label: 'Otro' },
    ]
}

const VEHICLE_COLORS = [
    { value: 'white', label: 'Blanco' },
    { value: 'black', label: 'Negro' },
    { value: 'silver', label: 'Plateado' },
    { value: 'gray', label: 'Gris' },
    { value: 'red', label: 'Rojo' },
    { value: 'blue', label: 'Azul' },
    { value: 'green', label: 'Verde' },
    { value: 'yellow', label: 'Amarillo' },
    { value: 'orange', label: 'Naranja' },
    { value: 'brown', label: 'Marrón' },
    { value: 'beige', label: 'Beige' },
    { value: 'gold', label: 'Dorado' },
    { value: 'other', label: 'Otro' },
]

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    active: { label: 'Activo', color: 'bg-emerald-500' },
    inactive: { label: 'Inactivo', color: 'bg-amber-500' },
    sold: { label: 'Vendido', color: 'bg-slate-500' },
}

const VehiclesList = () => {
    const router = useRouter()
    const [search, setSearch] = useState('')

    const vehiclesData = useGestiono('getAppData', {
        appId,
        type: 'vehicles.v1'
    }, {
        cache: true,
        swr: true
    })

    const vehicles = (vehiclesData.data as unknown as Vehicle[] | undefined) || []

    const filteredVehicles = vehicles.filter(vehicle => {
        if (!search) return true
        const searchLower = search.toLowerCase()
        const brandLabel = getBrandLabel(vehicle.data.brand, vehicle.data.customBrand)
        const modelLabel = getModelLabel(vehicle.data.brand, vehicle.data.model, vehicle.data.customModel)
        return (
            vehicle.data.plate.toLowerCase().includes(searchLower) ||
            (vehicle.data.client?.toLowerCase().includes(searchLower)) ||
            brandLabel.toLowerCase().includes(searchLower) ||
            modelLabel.toLowerCase().includes(searchLower)
        )
    })

    return (
        <>
            <BreadcrumbAndHeader
                href={LinkConstants.APPS}
                title="Registro de Vehículos"
                actions={
                    <RegisterVehicleModal onSubmit={() => vehiclesData.update()} />
                }
            />

            <LayoutColumn size={1}>
                <div className="mb-6">
                    <Input
                        label=""
                        placeholder="🔍 Buscar por placa, cliente, marca o modelo..."
                        value={search}
                        onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
                    />
                </div>
            </LayoutColumn>

            <LoadingFlash loading={vehiclesData.loading} />

            {!vehiclesData.loading && filteredVehicles.length === 0 && (
                <LayoutColumn size={1}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center py-16"
                    >
                        <div className="text-6xl mb-4">🚗</div>
                        <h3 className="text-xl font-semibold text-gray-700 mb-2">
                            {search ? 'No se encontraron vehículos' : 'Sin vehículos registrados'}
                        </h3>
                        <p className="text-gray-500">
                            {search
                                ? 'Intenta con otros términos de búsqueda'
                                : 'Registra tu primer vehículo usando el botón "Nuevo Vehículo"'}
                        </p>
                    </motion.div>
                </LayoutColumn>
            )}

            {filteredVehicles.map((vehicle, index) => (
                <LayoutColumn size={3} key={vehicle.id}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => router.push(`${basePath}/vehicle/${vehicle.id}`)}
                        className="vehicle-card group cursor-pointer bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-xl hover:border-blue-200 transition-all duration-300 hover:-translate-y-1"
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div
                                    className="w-4 h-4 rounded-full ring-2 ring-offset-2 ring-gray-200"
                                    style={{ backgroundColor: getColorHex(vehicle.data.color) }}
                                />
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${STATUS_LABELS[vehicle.data.status]?.color || 'bg-gray-500'}`}>
                                    {STATUS_LABELS[vehicle.data.status]?.label || vehicle.data.status}
                                </span>
                            </div>
                            <span className="text-xs text-gray-400">
                                #{vehicle.id}
                            </span>
                        </div>

                        <div className="plate-badge bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg font-mono font-bold text-xl tracking-wider text-center mb-4 shadow-md">
                            {vehicle.data.plate}
                        </div>

                        <div className="space-y-1">
                            <h3 className="font-semibold text-gray-800 text-lg leading-tight">
                                {getBrandLabel(vehicle.data.brand, vehicle.data.customBrand)} {getModelLabel(vehicle.data.brand, vehicle.data.model, vehicle.data.customModel)}
                            </h3>
                            {vehicle.data.client && (
                                <p className="text-gray-600 text-sm font-medium">
                                    👤 {vehicle.data.client}
                                </p>
                            )}
                            <p className="text-gray-500 text-xs">
                                Año: {vehicle.data.year}
                            </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-gray-100 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs text-gray-400">
                                Click para ver detalles
                            </span>
                            <span className="text-blue-500">→</span>
                        </div>
                    </motion.div>
                </LayoutColumn>
            ))}
        </>
    )
}

function getBrandLabel(brand: string, customBrand?: string): string {
    if (brand === 'other' && customBrand) return customBrand
    return VEHICLE_BRANDS.find(b => b.value === brand)?.label || brand
}

function getModelLabel(brand: string, model: string, customModel?: string): string {
    if (model === 'other' && customModel) return customModel
    const models = VEHICLE_MODELS[brand] || VEHICLE_MODELS.default
    return models.find(m => m.value === model)?.label || model
}

function getColorHex(colorName: string): string {
    const colors: Record<string, string> = {
        white: '#FFFFFF',
        black: '#1a1a1a',
        silver: '#C0C0C0',
        gray: '#808080',
        red: '#DC2626',
        blue: '#2563EB',
        green: '#16A34A',
        yellow: '#EAB308',
        orange: '#EA580C',
        brown: '#78350F',
        beige: '#D4C4A8',
        gold: '#D4AF37',
        other: '#6B7280',
    }
    return colors[colorName] || colors.other
}

const RegisterVehicleModal = ({ onSubmit }: { onSubmit: () => void }) => {
    const alert = useAlert()
    const modal = useModal('register-vehicle')
    const { register, handleSubmit, formState: { errors, isSubmitting }, reset, watch, setValue } = useForm<VehicleFormData>({
        mode: 'onBlur',
        defaultValues: {
            brand: '',
            model: '',
            color: '',
        }
    })

    const watchedBrand = watch('brand')
    const watchedModel = watch('model')
    const watchedColor = watch('color')

    const availableModels = VEHICLE_MODELS[watchedBrand] || VEHICLE_MODELS.default

    const submit = useCallback(async (data: VehicleFormData) => {
        try {
            await Gestiono.insertAppData({
                appId,
                type: 'vehicles.v1',
                data: {
                    plate: data.plate.toUpperCase().trim(),
                    client: data.client?.trim(),
                    brand: data.brand,
                    customBrand: data.brand === 'other' ? data.customBrand?.trim() : undefined,
                    model: data.model,
                    customModel: data.model === 'other' ? data.customModel?.trim() : undefined,
                    year: parseInt(data.year),
                    color: data.color,
                    customColor: data.color === 'other' ? data.customColor?.trim() : undefined,
                    vin: data.vin?.trim() || undefined,
                    notes: data.notes?.trim() || undefined,
                    registeredAt: new Date().toISOString(),
                    status: 'active' as const
                }
            })

            onSubmit?.()
            reset()
            modal?.close()
            alert?.open({
                msg: 'Vehículo registrado exitosamente',
                variant: 'success'
            })
        } catch (error) {
            alert?.open({
                msg: 'Error al registrar el vehículo',
                variant: 'error'
            })
        }
    }, [onSubmit, modal, alert, reset])

    const currentYear = new Date().getFullYear()

    return (
        <ButtonModal id="register-vehicle" cta="Nuevo Vehículo">
            <h2 className="text-2xl font-bold mb-2">Registrar Vehículo</h2>
            <p className="text-sm text-gray-500 mb-6">
                Ingresa los datos del vehículo para agregarlo al registro.
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
                        {...register('client', {
                        })}
                        label="Cliente"
                        placeholder="Juan Pérez"
                        error={errors.client?.message}
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
                        Registrar Vehículo
                    </Button>
                </div>
            </form>
        </ButtonModal>
    )
}

export { VEHICLE_BRANDS, VEHICLE_MODELS, VEHICLE_COLORS, getBrandLabel, getModelLabel, getColorHex }
export default VehiclesList
