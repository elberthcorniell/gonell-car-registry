import { useModal } from "@bitnation-dev/components"

export const useAlert = () => useModal<{
        msg: string
        variant: 'success' | 'error'
    }>('notification-alert')