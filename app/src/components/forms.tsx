'use client'
import React, { useState } from 'react'
import { Modal } from '@bitnation-dev/components'
import { useModal } from '@bitnation-dev/components/dist/components/Modal/Provider'
import { ResourceSelectModalSetup } from '@bitnation-dev/management/src/forms/resource-select'
import { AddResourceProductionRecord } from '@bitnation-dev/management/src/forms/add-production-record'
import { AddAccount } from '@bitnation-dev/management/src/forms/add-account'
import { AddProduction } from '@bitnation-dev/management/src/forms/add-production'
import { AddBeneficiary } from '@bitnation-dev/management/src/forms/add-beneficiary'
import { AddBeneficiaryTaxId } from '@bitnation-dev/management/src/forms/add-beneficiary-tax-id'
import { AddDivision } from '@bitnation-dev/management/src/forms/add-division'
import { AddResource } from '@bitnation-dev/management/src/forms/add-resource'
import { AddBulkResourceRecord } from '@bitnation-dev/management/src/forms/add-bulk-resource-record'
import { TransferAccountBalance } from '@bitnation-dev/management/src/forms/transfer-account-balance'
import { MakeCreditPayment } from '@bitnation-dev/management/src/forms/make-credit-payment'
import { MakeCapitalPayment } from '@bitnation-dev/management/src/forms/make-capital-payment'
import { AddTask } from '@bitnation-dev/management/src/forms/add-task'
import { AddBoardForm } from '@bitnation-dev/management/src/forms/add-board'
import type { TransferProps } from '@bitnation-dev/management/src/forms'

const Modals = () => {
    const addBeneficiary = useModal('add-beneficiary')
    const addDivision = useModal('add-division')
    const addResource = useModal('add-resource')
    const transferBalance = useModal('transfer-balance')

    const [transferTabs, setTransferTabs] = useState(['Cuentas', 'Divisiones'])

    return <>
        <ResourceSelectModalSetup />
        <Modal<{ onSubmit?: () => void, close: () => void, productionId: number, type: 'IN' | 'OUT', resourceId: number }> id="add-production-record">
            {({ onSubmit, close, productionId, type, resourceId }) => <>
                <h2 className="mb-4">Agregar registro de producción</h2>
                <AddResourceProductionRecord productionId={productionId} type={type} resourceId={resourceId} onSuccess={() => {
                    onSubmit?.()
                    close()
                }} />
            </>}
        </Modal>
        <Modal<{ onSubmit?: () => void, close: () => void }> id="add-account">
            {({ onSubmit, close }) => <>
                <h2 className="mb-4">Agregar cuenta</h2>
                <AddAccount onSubmit={() => {
                    onSubmit?.()
                    close()
                }} />
            </>}
        </Modal>
        <Modal<{ onSubmit?: () => void, close: () => void }> id="add-production">
            {({ onSubmit, close }) => <>
                <h2 className="mb-4">Agregar producción</h2>
                <AddProduction onSuccess={() => {
                    onSubmit?.()
                    close()
                }} />
            </>}
        </Modal>
        <Modal<{ onSubmit?: (id: any) => {}, type: GestionoSchema['beneficiary']['type'] }> id="add-beneficiary">
            {({ onSubmit, type }) => <>
                <h2 className="mb-4">Agregar contacto</h2>
                <AddBeneficiary type={type} onSubmit={async ({ id }: { id: number }) => {
                    // @ts-ignore
                    addBeneficiary && addBeneficiary?.close()
                    onSubmit && onSubmit(id)
                }} />
            </>}
        </Modal>
        <Modal<{ id: number, close: () => void, amount: GestionoDataTypes.CleanCreditPayment, currency: GestionoDataTypes.Currency, onSubmit?: () => void }> id={`pay-credit-modal`}>
            {({ close, id, amount, currency, onSubmit }) => <>
                <h2>Pagar credito</h2>
                <MakeCreditPayment id={id} onSubmit={() => {
                    close()
                    onSubmit?.()
                }} amount={amount} />
            </>}
        </Modal>
        <Modal<{ id: number, close: () => void, pendingCapital: GestionoDataTypes.CleanCreditPayment, currency: GestionoDataTypes.Currency, onSubmit?: () => void }> id={`pay-capital-modal`}>
            {({ close, id, pendingCapital, currency, onSubmit }) => <>
                <h2>Pagar capital</h2>
                <MakeCapitalPayment id={id} onSubmit={() => {
                    close()
                    onSubmit?.()
                }} pendingCapital={pendingCapital} />
            </>}
        </Modal>
        <Modal<{ onSubmit?: (id: any) => {}, beneficiaryId: GestionoSchema['beneficiary']['id'] }> id="add-beneficiary-tax-id">
            {({ onSubmit, beneficiaryId }) => <>
                <h2 className="mb-4">Agregar RNC/Cédula</h2>
                <AddBeneficiaryTaxId beneficiaryId={beneficiaryId} onSubmit={(id: any) => {
                    // @ts-ignore
                    addBeneficiary && addBeneficiary?.close()
                    onSubmit && onSubmit(id)
                }} />
            </>}
        </Modal>
        <Modal<{ onSubmit?: (id: any) => {} }> id="add-division">
            {({ onSubmit }) => <>
                <h2 className="mb-4">Agregar division</h2>
                <AddDivision onSubmit={(id) => {
                    // @ts-ignore
                    addDivision && addDivision?.close()
                    onSubmit && onSubmit(id)
                }} />
            </>}
        </Modal>
        <Modal<{ onSubmit?: (id: any) => {} }> id="add-resource" minWidth={920}>
            {({ onSubmit }) => <>
                <h2 className="mb-4">Agregar recurso</h2>
                <AddResource onSubmit={(id) => {
                    // @ts-ignore
                    addResource && addResource?.close()
                    onSubmit && onSubmit(id)
                }} />
            </>}
        </Modal>
        <Modal<{ onSubmit?: () => void, close: () => void }> minWidth={920} id="add-bulk-resource-record">
            {({ onSubmit, close }) => <>
                <h2 className="mb-4">Movimiento Masivo</h2>
                <AddBulkResourceRecord onSubmit={() => {
                    onSubmit?.()
                    close()
                }} />
            </>}
        </Modal>
        <Modal<TransferProps> id="transfer-balance"
            minWidth={800}
            onOpen={(data) => {
                if (!data) return
                setTransferTabs(['Cuentas'])
            }}
            onClose={() => {
                setTransferTabs(['Cuentas', 'Divisiones'])
            }}
        >
            {({ onSubmit, ...transferProps }) => <>
                <h2 className="my-5">Transferir balances</h2>
                <p className="mb-5">Los balances se transferiran a la cuenta seleccionada</p>
                <TransferAccountBalance {...transferProps} onSubmit={async () => {
                    onSubmit?.()
                    transferBalance?.close()
                }} />
            </>}
        </Modal>
        {/* TODO: pay-modal - requires PayInvoiceTabs (not available in current package version) */}
        <Modal<{ onSubmit?: (x?: { taskId?: number }) => void, close: () => void, clientId?: number, startDate?: Date, assignedTo?: number, defaultBoardId?: number, defaultColumnId?: number, defaultDivisionId?: number }> id="add-task">
            {({ onSubmit, close, clientId, startDate, assignedTo, defaultBoardId, defaultColumnId, defaultDivisionId }) => <>
                <h2 className="mb-4">Agregar tarea</h2>
                <AddTask clientId={clientId} startDate={startDate} assignedTo={assignedTo} onSubmit={(x) => {
                    onSubmit?.(x)
                    close()
                }} />
            </>}
        </Modal>
        <Modal<{ onSubmit?: (boardId: number) => void, divisionId: number, close: () => void }> id="add-board">
            {({ onSubmit, close, divisionId }) => <>
                <h2 className="mb-4">Agregar tablero</h2>
                <AddBoardForm onSubmit={(boardId) => {
                    onSubmit?.(boardId)
                    close()
                }} divisionId={divisionId} />
            </>}
        </Modal>
    </>
}

export const Forms = {
    Modals
}
