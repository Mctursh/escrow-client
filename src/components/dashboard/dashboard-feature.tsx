import { FormEvent, useMemo, useState } from 'react';
import { AppHero, useTransactionToast } from '../ui/ui-layout'
import { useWallet } from '@solana/wallet-adapter-react';
import { CreateOrderPayload, escrowClient } from '../solana/solona-transactions';
import toast from 'react-hot-toast';
import ConfirmatioModal from '../modal/confirmation-modal';

// const BN = require("bn.js");
// import BN from 'bn.js';
// const BN = require('bn.js');

const DashboardFeature = () => {
  // const programId_v1 = new PublicKey("DCeoFHjKkbXwNGCCLnfGjjHxKhw6yTn1wBijKzCWcj5f")
  // const USDC_TOEKN_ADDRESS = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU")
  // const USDC_TOEKN_ADDRESS = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")
  const MAX_DECIMAL = escrowClient.MAX_DECIMAL
  const [solValue, setSolValue] = useState<string>('')
  const [price, setPrice] = useState<string>('')

  const [showModal, setShowModal] = useState<boolean>(false)
  const [isProcessing, setIsProcessing] = useState<boolean>(false)

  const wallet = useWallet()
  const transactioToast = useTransactionToast()

  const recieveAmount = useMemo(() => {
    return (Number(solValue) * Number(price)).toFixed(2)
  },[solValue, price])

  const validateInput = (input: string, previousInput: string): string => {
    let value = ''
    if (typeof input != 'string') return ''

    // 1. Allow only numbers and a single dot with regex
    const regex = new RegExp(`^\\d*(\\.\\d{0,${MAX_DECIMAL}})?$`);
    if (!regex.test(input)) {
      return previousInput
      // value; // Don't update the value if invalid
    }

    // 2. Enforce maximum decimals dynamically
    const parts = input.split(".");
    if (parts.length === 2 && parts[1].length > MAX_DECIMAL) {
      value = `${parts[0]}.${parts[1].substring(0, MAX_DECIMAL)}`
    } else {
      value = input; // Update value if valid
    }

    return value

  }

  const closeModal = () => {
    setShowModal(false)
}

  const confirmOrder = async(event: FormEvent) => {
    event.preventDefault()
    setShowModal(true)
  }

  async function placeOrder() {
    setIsProcessing(true)
    const payload: CreateOrderPayload = {
      wallet,
      solValue,
      price
    }
    try {
      const signature = await escrowClient.placeSwapOrder(payload)
      transactioToast(signature!)
    } catch (error) {
      toast.error(`Transaction failed: ${error}`)
    } finally {
      closeModal()
      setIsProcessing(false)
    }

  }

  return (
    <div className='w-[35vw]' >
      
      <AppHero title="Swap your tokens" subtitle="" />
      <div className="px-8">
        <form onSubmit={confirmOrder} className='flex flex-col gap-y-4' >
          <div className='flex items-center gap-x-3'>
            {/* <label htmlFor="">SOL</label> */}
              <input
                required
                className="input input-bordered w-full"
                value={solValue} 
                onChange={e => setSolValue(validateInput(e.target.value, solValue!))} 
                type="text"
                placeholder={`Enter SOL`}
                >
              </input>
          </div>
          <p>To receive </p>
          <div className='flex items-center gap-x-3'>
            {/* <label htmlFor="">Price $/SOL</label> */}
              <input
                required
                className="input input-bordered w-full"
                value={price}
                onChange={e => setPrice(validateInput(e.target.value, price!))}
                type="text"
                placeholder={`Price $/SOL`}
                >
              </input>
          </div>

          {
            solValue && price && <p>You will recieve <span className="font-bold">{recieveAmount}</span> USDC</p>
          }

          <div className='flex justify-center w-full mt-6'>
            <button type='submit' className='p-3 bg-[#641AE6] rounded-md text-white w-full' >Make Swap</button>
          </div>
        </form>
      </div>
      <ConfirmatioModal submitDisabled={isProcessing} submit={placeOrder} hide={closeModal} key={"ConfirmOrderModal"} show={showModal}>
          <p>Are you sure you want to place an order of <span className="font-bold">{solValue} SOL</span> For <span className="font-bold">${recieveAmount}</span>?</p>
      </ConfirmatioModal>
    </div>
  )
}


export default DashboardFeature