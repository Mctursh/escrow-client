import { getOrCreateAssociatedTokenAccount, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { WalletContextState } from "@solana/wallet-adapter-react";
import {
    clusterApiUrl,
    Connection,
    Keypair,
    LAMPORTS_PER_SOL,
    PublicKey,
    SystemProgram,
    Transaction,
    TransactionInstruction,
} from "@solana/web3.js";
import { serialize, deserialize } from "borsh";


// Define the OrderStatus enum
export enum OrderStatus {
    Active = 0,
    Completed = 1,
    Cancelled = 2,
}
  
// Define the Borsh schema for OrderStatus
export const OrderStatusSchema = new Map([
[OrderStatus.Active, [8]],
[OrderStatus.Completed, [8]],
[OrderStatus.Cancelled, [8]],
]);

const secretKey = import.meta.env.VITE_AUTHORITY_SECRET_KEY as string
const authority = Keypair.fromSecretKey(Uint8Array.from(Buffer.from(secretKey, "base64")))

class OrderCounter {
    totalOrders: BigInt;
    authority: PublicKey;

    constructor(fields: { totalOrders: BigInt; authority: PublicKey }) {
        this.totalOrders = fields.totalOrders;
        this.authority = fields.authority;
    }

    static schema = new Map([
        [
            OrderCounter,
            {
                kind: 'struct',
                fields: [
                    ['totalOrders', 'u64'],
                    ['authority', [32]],
                ],
            },
        ],
    ]);
}

export class EscrowOrder {
    // tokenMint?: Uint8Array;
    orderId: BigInt;
    seller: Uint8Array;
    escrowAccount?: Uint8Array;
    amount: BigInt;
    price: BigInt;
    status: OrderStatus;

    constructor(fields: {
        orderId: BigInt;
        seller: Uint8Array;
        escrowAccount: Uint8Array,
        amount: BigInt;
        price: bigint
        status: OrderStatus;
    }) {
        this.orderId = fields.orderId;
        this.seller = fields.seller;
        this.escrowAccount = fields.escrowAccount
        this.amount = fields.amount;
        this.price = fields.price
        this.status = fields.status;
    }

    static schema = new Map([
        [
            EscrowOrder,
            {
                kind: 'struct',
                fields: [
                    ['orderId', 'u64'],
                    ['seller', [32]],
                    ['escrowAccount', [32]],
                    ['amount', 'u64'],
                    ['price', 'u64'],
                    ['status', 'u8'],
                ],
            },
        ],
    ]);
}
export class BuyOrder {
    // tokenMint?: Uint8Array;
    orderId: BigInt;
    buyer: Uint8Array;
    escrowAccount?: Uint8Array;
    amount: BigInt;

    constructor(fields: {
        orderId: BigInt;
        buyer: Uint8Array;
        escrowAccount: Uint8Array,
        amount: BigInt;
    }) {
        this.orderId = fields.orderId;
        this.buyer = fields.buyer;
        this.escrowAccount = fields.escrowAccount
        this.amount = fields.amount;
    }

    static schema = new Map([
        [
            BuyOrder,
            {
                kind: 'struct',
                fields: [
                    ['orderId', 'u64'],
                    ['buyer', [32]],
                    ['escrowAccount', [32]],
                    ['amount', 'u64'],
                ],
            },
        ],
    ]);
}

// const 


// Function to serialize SellOrder data
export const serializeSellOrder = (order: EscrowOrder): Uint8Array => {
    return serialize(EscrowOrder.schema, order);
}

// Function to serialize SellOrder data
export const serializeBuyOrder = (order: BuyOrder): Uint8Array => {
    return serialize(BuyOrder.schema, order);
}

class EscrowClient {
    readonly connection: Connection
    readonly programId: PublicKey
    readonly USDC_DECIMAL = 1000000;
    readonly USDC_TOEKN_ADDRESS = new PublicKey("Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr");
    readonly MAX_DECIMAL = 5;

    constructor(
        connection: Connection,
        programId: PublicKey,
    ) {
        this.connection = connection
        this.programId = programId
    }

    async fulfilOrder (order: EscrowOrder, wallet: WalletContextState): Promise<string | null> {
        if(!wallet.connected){
          alert("Kindly connect wallet then try again")
          return null;
        }
        // const fulfilOrder = async (order: EscrowOrder) => {
        const { amount, price, escrowAccount, seller, orderId } = order
        try {
          
          const buyerTokenAccount = await getOrCreateAssociatedTokenAccount(
            this.connection,
            authority, // The payer for creating token accounts (if needed)
            this.USDC_TOEKN_ADDRESS, // Mint address for the token (e.g., USDC)
            wallet.publicKey! // Owner of the token account
          );
      
          const sellerTokenAccount = await getOrCreateAssociatedTokenAccount(
            connection,
            authority, // The payer for creating token accounts (if needed)
            this.USDC_TOEKN_ADDRESS, // Mint address for the token (e.g., USDC)
            new PublicKey(seller!) // Owner of the token account
          );
    
          const deriveOrderTokenPDA = await escrowClient.deriveOrderTokenPDA(new PublicKey(escrowAccount!))
      
          const buyerBalance = Number(buyerTokenAccount.amount) / this.USDC_DECIMAL
          const sellingPrice = Number(((Number(amount) / LAMPORTS_PER_SOL) * (Number(price) / this.USDC_DECIMAL)).toFixed(5))
      
          console.log(buyerBalance);
          console.log(sellingPrice);
          
          
          if ( buyerBalance < sellingPrice) {
            alert("Insufficient funds")
            console.log("You don't have enough funds");
            throw new Error("You don't have enough funds")
          }
      
          const buyOrder = new BuyOrder({
            orderId: orderId,
            buyer: wallet.publicKey?.toBytes()!,
            escrowAccount: escrowAccount!,
            amount
          })
      
          const serializedBuyOrder = serializeBuyOrder(buyOrder)
      
          const transaction = new Transaction()
      
          const fulfilOrderTransaction = new TransactionInstruction({
            keys: [
              { pubkey: authority.publicKey, isSigner: false, isWritable: true },
              { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
              { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
              { pubkey: new PublicKey(seller), isSigner: false, isWritable: true },
              { pubkey: wallet.publicKey!, isSigner: true, isWritable: true },
              { pubkey: new PublicKey(escrowAccount!), isSigner: false, isWritable: true },
              { pubkey: sellerTokenAccount.address, isSigner: false, isWritable: true },
              { pubkey: buyerTokenAccount.address, isSigner: false, isWritable: true },
              { pubkey: deriveOrderTokenPDA, isSigner: false, isWritable: true },
            ],
            programId,
            data: Buffer.concat([Buffer.from([1]), serializedBuyOrder])
          })
      
          transaction.add(fulfilOrderTransaction)
          transaction.feePayer = wallet.publicKey!;
          const { blockhash } = await connection.getLatestBlockhash()
          transaction.recentBlockhash = blockhash;
      
          const signedTransaction = await wallet.signTransaction!(transaction)
          const signature = await connection.sendRawTransaction(signedTransaction.serialize(), {
            skipPreflight: false,
            preflightCommitment: 'confirmed'
          })
          
          const confirmation = await connection.confirmTransaction(signature, 'confirmed')
      
          if (confirmation.value.err) {
            throw new Error('Transaction failed to confirm');
          }
      
          console.log('Transaction successful:', signature);
          return signature
        } catch (error) {
          console.error("Transactin failed", error);
          throw error
        }
      }

    async deriveOrderPDA(sellerPublicKey: PublicKey, orderId: number): Promise<PublicKey> {
        const orderIdBuffer = Buffer.alloc(8);
        orderIdBuffer.writeBigUInt64LE(BigInt(orderId));
        let [escrowAccountAddress] = PublicKey.findProgramAddressSync(
            [
              Buffer.from(`escrow_order_v2`),
              sellerPublicKey.toBuffer()!,
              orderIdBuffer,
            ],
            this.programId,
          );
          
        return escrowAccountAddress
    }

    async deriveOrderTokenPDA(orderPdaAddress: PublicKey): Promise<PublicKey> {
        let [escrowSolTokenAddress] = PublicKey.findProgramAddressSync(
            [
              Buffer.from(`escrow_token_order_v2`),
              orderPdaAddress.toBuffer()!,
            ],
            this.programId,
          );
          
        return escrowSolTokenAddress
    }

    async getCounterAddress(): Promise<PublicKey> {
        const [counterPda] = await PublicKey.findProgramAddressSync(
            [Buffer.from('order_counter_v2')],
            this.programId
        );
        return counterPda;
    }

    async getCurrentOrderCount(): Promise<BigInt> {
        const counterAddress = await this.getCounterAddress();
        const accountInfo = await this.connection.getAccountInfo(counterAddress);
        
        if (!accountInfo) {
            // throw new Error('Counter account not found');
            console.log('Counter account not found');
            return BigInt(0)
        }

        const counterData = deserialize(
            OrderCounter.schema,
            OrderCounter,
            accountInfo.data
        ) as OrderCounter;

        console.log(counterData);
        
        const count = counterData.totalOrders
        console.log(Number(count));
        
        return count;
    }

    async getOrderAddress(user: PublicKey, orderId: number): Promise<PublicKey> {
        const orderIdBuffer = Buffer.alloc(8);
        orderIdBuffer.writeBigUInt64LE(BigInt(orderId));

        const [orderPda] = await PublicKey.findProgramAddress(
            [
                Buffer.from('escrow_order'),
                user.toBuffer(),
                orderIdBuffer,
            ],
            this.programId
        );

        return orderPda;
    }

    // async createOrder(
    //     user: PublicKey,
    //     amount: number
    // ): Promise<Transaction> {
    //     const counterAddress = await this.getCounterAddress();
    //     const currentCount = await this.getCurrentOrderCount();
    //     const orderAddress = await this.deriveOrderPDA(user, currentCount);

    //     const instruction = new TransactionInstruction({
    //         keys: [
    //             { pubkey: orderAddress, isSigner: false, isWritable: true },
    //             { pubkey: counterAddress, isSigner: false, isWritable: true },
    //             { pubkey: user, isSigner: true, isWritable: true },
    //             { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    //         ],
    //         programId: this.programId,
    //         data: Buffer.from([/* your instruction data */]),
    //     });

    //     const transaction = new Transaction().add(instruction);
    //     return transaction;
    // }

    async getAllOrders(user?: PublicKey): Promise<EscrowOrder[]> {
        // Get program accounts with optional filter
        const filters = [
            // {
            //     memcmp: {
            //         offset: 0,
            //         bytes: Buffer.from('escrow_order').toString('base64'),
            //     },
            // },
            {
                dataSize: 89
            }
        ];

        if (user) {
            // filters.push({
            //     memcmp: {
            //         offset: 8, // after order_id
            //         bytes: user.toBase58(),
            //     },
            // });
        }

        const accounts = await this.connection.getProgramAccounts(
            this.programId,
            {
                filters,
            }
        );
        

        return accounts.map((account) => {
            return deserialize(
                EscrowOrder.schema,
                EscrowOrder,
                account.account.data
            ) as EscrowOrder;
        });
    }

    async getActiveOrders(user?: PublicKey): Promise<EscrowOrder[]> {
        const allOrders = await this.getAllOrders(user);
        return allOrders.filter(order => order.status === OrderStatus.Completed); // 0 = Active
    }
}

const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')
const programId = new PublicKey(import.meta.env.VITE_PROGRAM_ID as string)
export const escrowClient = new EscrowClient(connection, programId)