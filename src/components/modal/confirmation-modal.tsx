import { ReactNode } from 'react'
import { AppModal } from '../ui/ui-layout'

type ModalProps = {
    show: boolean
    hide: () => void
    submit: () => void
    children: ReactNode
    submitDisabled: boolean
}
const ConfirmatioModal = ({
    show,
    submit,
    hide,
    children,
    submitDisabled
}: ModalProps) => {

    return (
        <AppModal
            title={'Confirm Tansaction?'}
            hide={hide}
            show={show}
            submit={submit}
            submitLabel="Pay"
            submitDisabled={submitDisabled}
        >
            {children}
            {/* <input
                type="text"
                placeholder="Name"
                className="input input-bordered w-full"
                value={name}
                onChange={(e) => setName(e.target.value)}
            />
            <input
                type="text"
                placeholder="Endpoint"
                className="input input-bordered w-full"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
            /> */}
            {/* <select
                className="select select-bordered w-full"
                value={network}
                onChange={(e) => setNetwork(e.target.value as ClusterNetwork)}
            >
                <option value={undefined}>Select a network</option>
                <option value={ClusterNetwork.Devnet}>Devnet</option>
                <option value={ClusterNetwork.Testnet}>Testnet</option>
                <option value={ClusterNetwork.Mainnet}>Mainnet</option>
            </select> */}
        </AppModal>
    )
}

export default ConfirmatioModal