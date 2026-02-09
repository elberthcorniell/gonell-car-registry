import "@bitnation-dev/management/dist/common"

declare global {
    export type Vehicle = {
        id: number
        data: {
            plate: string
            client?: string
            brand: string
            customBrand?: string
            model: string
            customModel?: string
            year: number
            color: string
            customColor?: string
            vin?: string
            notes?: string
            registeredAt: string
            status: 'active' | 'inactive' | 'sold'
        }
    }

    export type VehicleFormData = {
        plate: string
        client: string
        brand: string
        customBrand?: string
        model: string
        customModel?: string
        year: string
        color: string
        customColor?: string
        vin?: string
        notes?: string
    }

    export type InvoiceItem = {
        description: string
        quantity: number
        unitPrice: number
        total: number
    }

    export type Invoice = {
        id: number
        data: {
            invoiceNumber: string
            vehiclePlate: string
            vehicleId: number
            items: InvoiceItem[]
            subtotal: number
            tax: number
            taxRate: number
            total: number
            notes?: string
            status: 'pending' | 'paid' | 'cancelled'
            createdAt: string
            paidAt?: string
        }
    }

    export type InvoiceFormData = {
        items: {
            description: string
            quantity: string
            unitPrice: string
        }[]
        taxRate: string
        notes?: string
    }
}

export { }
