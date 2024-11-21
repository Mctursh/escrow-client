import { FormEvent, useEffect, useState } from 'react';
import { AppHero } from '../ui/ui-layout'
import { useWallet } from '@solana/wallet-adapter-react';
import { clusterApiUrl, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, sendAndConfirmRawTransaction, sendAndConfirmTransaction, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { EscrowClient, EscrowOrder, OrderStatus, serializeSellOrder } from '../solana/solona-transactions';
// const BN = require("bn.js");
import BN from 'bn.js';
// const BN = require('bn.js');

export default function DashboardFeature() {
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')
  const programId = new PublicKey("DCeoFHjKkbXwNGCCLnfGjjHxKhw6yTn1wBijKzCWcj5f")
  const secretKey = process.env.AUTHORITY_SECRET_KEY as string
  const authority = Keypair.fromSecretKey(Uint8Array.from(Buffer.from(secretKey, "base64")))

  let escrowClient = new EscrowClient(connection, programId)

  const [solValue, setSolValue] = useState<number>(0)
  const [price, setPrice] = useState<number>(0)
  const wallet = useWallet()

  useEffect(() => {
    escrowClient.getAllOrders().then(r => {
      console.log(Number(r[0].amount) / LAMPORTS_PER_SOL);
      console.log(Number(r[0].orderId));
      console.log(Number(r[0].price));
      console.log(new PublicKey(r[0].escrowAccount!).toBase58());
      console.log(new PublicKey(r[0].seller).toBase58());
      console.log((r[0].status));
      
    })
  
    return () => {
      
    }
  }, [])
  
  

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

    let sellOrder = new EscrowOrder({
      // tokenMint: null,
      orderId: orderId,
      seller: wallet.publicKey?.toBytes()!,
      escrowAccount: escrowAccountAddress.toBytes(),
      amount: BigInt(solValue * LAMPORTS_PER_SOL),
      price: BigInt(price),
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
    <div>
      
      <AppHero title="Swap X" subtitle="Swap your tokens" />
      <form onSubmit={makeSwap} className='flex flex-col gap-y-4'>
        <div className='flex items-center gap-x-3'>
          <label htmlFor="">SOL</label>
            <input value={solValue} 
            onChange={e => setSolValue(Number(e.target.value))} type="text" inputMode="decimal" pattern="^\d*(\.\d{0,9})?$" autoComplete="off" autoCorrect="off" spellCheck="false" placeholder="Amount" step="any" minLength={1} maxLength={20} name="amount"></input>
        </div>
        <p>To receive </p>
        <div className='flex items-center gap-x-3'>
          <label htmlFor="">Price $</label>
            <input 
            value={price}
            onChange={e => setPrice(Number(e.target.value))}
            type="text" inputMode="decimal" pattern="^\d*(\.\d{0,9})?$" autoComplete="off" autoCorrect="off" spellCheck="false" placeholder="Amount" step="any" minLength={1} maxLength={20} name="amount"></input>
        </div>

        <p>You will recieve {solValue * price} USDC</p>

        <div className='flex justify-center w-full mt-6'>
          <button type='submit' className='p-3 bg-[#641AE6] rounded-md text-white w-full' >Make Swap</button>
        </div>
      </form>
      {/* <div className="max-w-xl mx-auto py-6 sm:px-6 lg:px-8 text-center">
        <div className="space-y-2">
          <p>Here are some helpful links to get you started.</p>
          {links.map((link, index) => (
            <div key={index}>
              <a href={link.href} className="link" target="_blank" rel="noopener noreferrer">
                {link.label}
              </a>
            </div>
          ))}
        </div>
      </div> */}
    </div>
  )
}
