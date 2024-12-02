import { FormEvent, useEffect, useMemo, useState } from 'react';
import { AppHero } from '../ui/ui-layout'
import { useWallet } from '@solana/wallet-adapter-react';
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { escrowClient, EscrowOrder, OrderStatus, serializeSellOrder } from '../solana/solona-transactions';

// const BN = require("bn.js");
// import BN from 'bn.js';
// const BN = require('bn.js');

const DashboardFeature = () => {
  const connection = escrowClient.connection
  // const programId_v1 = new PublicKey("DCeoFHjKkbXwNGCCLnfGjjHxKhw6yTn1wBijKzCWcj5f")
  const programId = escrowClient.programId
  const secretKey = import.meta.env.VITE_AUTHORITY_SECRET_KEY as string
  const authority = Keypair.fromSecretKey(Uint8Array.from(Buffer.from(secretKey, "base64")))
  const USDC_DECIMAL = escrowClient.USDC_DECIMAL
  const MAX_DECIMAL = escrowClient.MAX_DECIMAL
  

  const [solValue, setSolValue] = useState<string>('')
  const [price, setPrice] = useState<string>('')
  const wallet = useWallet()

  useEffect(() => {

    // const USDC_TOEKN_ADDRESS = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU")
    // const USDC_TOEKN_ADDRESS = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v")
    // getMint(connection, USDC_TOEKN_ADDRESS).then(res => {
    //   console.log(res);
    // })

    
  
  
    return () => {
      
    }
  }, [])

  const recieveAmount = useMemo(() => {
    return (Number(solValue) * Number(price)).toFixed(5)
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
  

  async function makeSwap(event: FormEvent) {
    event.preventDefault()
    if(!wallet.connected){
      alert("Kindly connect wallet then try again")
      return;
    }
    console.log(wallet.publicKey?.toBase58());
    

    const orderId = await escrowClient.getCurrentOrderCount();

    //Safety check for 
    if (BigInt(orderId.toString()) >= BigInt(Number.MAX_SAFE_INTEGER)){
      throw new Error("")
    }
    // Derive PDA for escrow_account
    const escrowAccountAddress = await escrowClient.deriveOrderPDA(
      wallet.publicKey!,
      Number(orderId),
    )

    const deriveOrderTokenPDA = await escrowClient.deriveOrderTokenPDA(escrowAccountAddress)

    let sellOrder = new EscrowOrder({
      // tokenMint: null,
      orderId: orderId,
      seller: wallet.publicKey?.toBytes()!,
      escrowAccount: escrowAccountAddress.toBytes(),
      amount: BigInt(Number(solValue) * LAMPORTS_PER_SOL),
      price: BigInt(Number(price) * USDC_DECIMAL),
      status: OrderStatus.Active,
    })

    // console.log(sellOrder);
    const serializedOrder = serializeSellOrder(sellOrder);

    //  // 1. Calculate space and rent for the escrow account
    //  const space = serializeSellOrder.length; // Adjust based on your account size needs
    //  const rentExemptionAmount = await connection.getMinimumBalanceForRentExemption(space);
    //   console.log(space);
    
    //  // 4. Create the escrow account
    //  const createEscrowAccountIx = SystemProgram.createAccount({
    //     fromPubkey: authority.publicKey,
    //     newAccountPubkey: escrowAccountAddress,
    //     lamports: rentExemptionAmount,
    //     space,
    //     programId: programId
    //   });

    const counterAccount = await escrowClient.getCounterAddress()
    
    const transaction = new Transaction();

    const createOrderIx = new TransactionInstruction({
        keys: [
            { pubkey: authority.publicKey, isSigner: true, isWritable: true },
            { pubkey: counterAccount, isSigner: false, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: wallet.publicKey!, isSigner: true, isWritable: true },
            { pubkey: new PublicKey(sellOrder.escrowAccount!), isSigner: false, isWritable: true },
            { pubkey: deriveOrderTokenPDA, isSigner: false, isWritable: true },
        ],
        programId: programId,
        data: Buffer.concat([Buffer.from([0]), serializedOrder]),
    });

    transaction.add(createOrderIx);
    // transaction.add(createEscrowAccountIx, createOrderIx);

    try {
      console.log('authority.publicKey', authority.publicKey.toBase58());
      console.log('COunteraccount', counterAccount.toBase58());
      console.log('SystemProgram.programId', SystemProgram.programId.toBase58());
      console.log('wallet.publicKey', wallet.publicKey?.toBase58());
      console.log('new PublicKey(sellOrder.escrowAccount!)', new PublicKey(sellOrder.escrowAccount!).toBase58());
      
      
      transaction.feePayer = wallet.publicKey!;
      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash;

      // transaction.feePayer = new PublicKey(authority)

      transaction.partialSign(authority)
      // transaction.sign(authority)
      const signedTransaction = await wallet.signTransaction!(transaction)

      // const signature = await sendAndConfirmTransaction(connection, signedTransaction, [authority]);
      const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
        skipPreflight: false,
        preflightCommitment: 'confirmed'
      });

      const confirmation = await connection.confirmTransaction(signature, 'confirmed');


      if (confirmation.value.err) {
          throw new Error('Transaction failed to confirm');
      }

      console.log('Transaction successful:', signature);
    } catch (error) {
      console.error("Transactin failed", error);
      
    }
    // console.log("Transaction signature:", signature);
    // await escrowClient.getAllOrders()

    // await createSellOrder(wallet, sellOrder)

  }

  return (
    <div className='w-[35vw]' >
      
      <AppHero title="Swap your tokens" subtitle="" />
      <div className="px-8">
        <form onSubmit={makeSwap} className='flex flex-col gap-y-4' >
          <div className='flex items-center gap-x-3'>
            {/* <label htmlFor="">SOL</label> */}
              <input 
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
                className="input input-bordered w-full"
                value={price}
                onChange={e => setPrice(validateInput(e.target.value, price!))}
                type="text"
                placeholder={`Price $/SOL`}
                >
              </input>
          </div>

          {
            solValue && price && <p>You will recieve {recieveAmount} USDC</p>
          }

          <div className='flex justify-center w-full mt-6'>
            <button type='submit' className='p-3 bg-[#641AE6] rounded-md text-white w-full' >Make Swap</button>
          </div>
        </form>
        {/* <div className='flex justify-center w-full mt-6'>
          <button onClick={fulfilOrder} type='submit' className='p-3 bg-[#641AE6] rounded-md text-white w-full' >Fulfil Order</button>
        </div> */}
      </div>
    </div>
  )
}


export default DashboardFeature