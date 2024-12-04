import { ExplorerLink } from '@/components/cluster/cluster-ui'
import ConfirmatioModal from '@/components/modal/confirmation-modal'
import { escrowClient, EscrowOrder } from '@/components/solana/solona-transactions'
import { ellipsify, useTransactionToast } from '@/components/ui/ui-layout'
import { useWallet } from '@solana/wallet-adapter-react'
import { LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js'
// import { IconRefresh } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'

export default function Orders() {
    const wallet = useWallet()
    const [allOrders, setAllOrders] = useState<EscrowOrder[]>([])
    const [showModal, setShowModal] = useState<boolean>(false)
    const [isLoading, setIsLoaoding] = useState<boolean>(true)
    const [isProcessing, setIsProcessing] = useState<boolean>(false)
    const [selectedOrder, setSelectedOrder] = useState<EscrowOrder | null>()
    const [allFormattedOrders, setAllFormattedOrders] = useState<FormattedEscroworder[]>([])
    type FormattedEscroworder = {
        amount: number;
        orderId: number;
        price: number;
        sellerPubKey: string;
        signature: string
    }

    useEffect(() => {

        getAllOrders()

        return () => { }
    }, [])
    // const { data } = useGetSignatures({address: new PublicKey(order.escrowAccount!)})

    const getAllOrders = () => {
        setIsLoaoding(true)
        escrowClient.getAllOrders().then(async (orders) => {
            setAllOrders(orders);
        
            const formattedOrdersPromises = orders.map(async (order) => {
                const data = await escrowClient.connection.getSignaturesForAddress(
                    new PublicKey(order.escrowAccount!)
                );
                const signature = data && data[0]?.signature;
                return formatOrders(order, signature);
            });
            const allFormattedOrders = await Promise.all(formattedOrdersPromises);
            setAllFormattedOrders(allFormattedOrders);
        
            setIsLoaoding(false);
        });
    }

    const formatOrders = (order: EscrowOrder, signature: string): FormattedEscroworder => {
        return {
            amount: Number(order.amount) / LAMPORTS_PER_SOL,
            orderId: Number(order.orderId),
            price: Number(order.price),
            signature,
            sellerPubKey: new PublicKey(order.seller).toBase58()
        }
    }

    const getOrderCost = (amount: number, price: number): string => {
        return `$${((amount / escrowClient.USDC_DECIMAL) * price).toFixed(2)}`
    }

    const confirmPurchase = async (orderId: number) => {
        const selectedOrder = allOrders.filter(order => Number(order.orderId) == orderId)[0]
        setShowModal(true)
        setSelectedOrder(selectedOrder)
    }
    
    const closeModal = () => {
        setShowModal(false)
    }
    
    const purchaseOrder = async() => {
        setIsProcessing(true)
        try {
            const signature = await escrowClient.fulfilOrder(selectedOrder!, wallet)
            const transactionToast = useTransactionToast()
            transactionToast(signature!)
        } catch (error) {
            toast.error(`Transaction failed: ${error}`)
        } finally {
            closeModal()
            setIsProcessing(false)
            getAllOrders()
        }
    }
    //Add success handler and toast to make ordeer


    return (
        <div>
            <div className="space-y-8 mt-12 flex flex-col items-center">
                <div className="justify-between">
                    <div className="flex justify-between">
                        <h2 className="text-2xl font-bold">Sell Orders</h2>
                        {/* <div className="space-x-2">
            {query.isLoading ? (
              <span className="loading loading-spinner"></span>
            ) :
              <button
                className="btn btn-sm btn-outline"
                onClick={async () => {
                  await query.refetch()
                  await client.invalidateQueries({
                    queryKey: ['getTokenAccountBalance'],
                  })
                }}
              >
                <IconRefresh size={16} />
              </button>
            )}
          </div> */}
                    </div>
                </div>
                {
                    isLoading 
                    ?
                    <span className="loading loading-spinner"></span>
                    :
                    <table className="table border-4 rounded-lg border-separate border-base-300">
                        <thead>
                            <tr>
                                <th>S/N</th>
                                <th>Signature</th>
                                <th className="text-right">Seller</th>
                                <th>Amount</th>
                                <th>Cost</th>
                                <th className="text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allFormattedOrders.map((item) => (
                                <tr key={item.signature}>
                                    <th className="font-mono">{item.orderId}</th>
                                    <td className="font-mono">
                                        <ExplorerLink path={`tx/${item.signature}`} label={ellipsify(item.signature, 8)} />
                                    </td>
                                    <td className="font-mono text-right">
                                        {item.sellerPubKey}
                                        {/* {ellipsify(item.sellerPubKey)} */}
                                        {/* <ExplorerLink path={`block/${item.slot}`} label={item.slot.toString()} /> */}
                                    </td>
                                    <td>{item.amount}</td>
                                    <td>{getOrderCost(item.amount, item.price)}</td>
                                    <td>
                                        <button onClick={() => confirmPurchase(item.orderId)} className="bg-success text- rounded-btn btn-sm text-black">Buy</button>
                                    </td>
                                    {/* <td>{new Date((item.blockTime ?? 0) * 1000).toISOString()}</td> */}
                                    {/* <td className="text-right">
                        {item.err ? (
                            <div className="badge badge-error" title={JSON.stringify(item.err)}>
                            Failed
                            </div>
                        ) : (
                            <div className="badge badge-success">Success</div>
                        )}
                        </td> */}
                                </tr>
                            ))}
                            {/* {(query.data?.length ?? 0) > 5 && (
                    <tr>
                        <td colSpan={4} className="text-center">
                        <button className="btn btn-xs btn-outline" onClick={() => setShowAll(!showAll)}>
                            {showAll ? 'Show Less' : 'Show All'}
                        </button>
                        </td>
                    </tr>
                    )} */}
                        </tbody>
                    </table>
                }
            </div>
            <ConfirmatioModal submitDisabled={isProcessing} submit={purchaseOrder} hide={closeModal} key={"ConfirmOrderModal"} show={showModal}>
                <p>Are you sure you want to purchase Order <span className="font-bold">{Number(selectedOrder?.orderId)}</span> For <span className="font-bold">{getOrderCost((Number(selectedOrder?.amount) / LAMPORTS_PER_SOL), Number(selectedOrder?.price))}</span>?</p>
            </ConfirmatioModal>
        </div>
    )
}

