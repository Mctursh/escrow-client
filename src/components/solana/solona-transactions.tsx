import {
    Connection,
    PublicKey,
} from "@solana/web3.js";
import { serialize, deserialize } from "borsh";
// const BN = require("bn.js");

// Define the connection and program ID
// const programId = new PublicKey("YOUR_PROGRAM_ID");

// type OrderStatus = "Active" | "Completed" | "Canceled";

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

// Define SellOrder structure to serialize/deserialize
// export class SellOrder {
//     order_id: number
//     seller: PublicKey;
//     tokenMint?: PublicKey;
//     escrow_account?: PublicKey;
//     amount: number;
//     price: number;
//     status: OrderStatus;

//     constructor(fields: { seller: Uint8Array, tokenMint: Uint8Array, escrowAccount: Uint8Array, amount: number, price: number, order_id: number, status: OrderStatus }) {
//         this.seller = new PublicKey(fields.seller);
//         this.tokenMint = new PublicKey(fields.tokenMint);
//         this.escrow_account = new PublicKey(fields.escrowAccount);
//         this.amount = fields.amount;
//         this.price = fields.price;
//         this.status = fields.status;
//         this.order_id = fields.order_id
//     }
// }

// // Borsh schema for SellOrder
// const SellOrderSchema = new Map([
//     [SellOrder, {kind: 'struct', fields: [
//         ['seller', [32]],
//         ['tokenMint', [32]],
//         ['escrowAccount', [32]],
//         ['amount', 'u64'],
//         ['price', 'u64'],
//         ['status', 'enum'],
//     ]}],
// ]);

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


// ['tokenMint', [32]],
// ['status', { type: 'string', length: 32 }],


// Function to serialize SellOrder data
export const serializeSellOrder = (order: EscrowOrder): Uint8Array => {
    return serialize(EscrowOrder.schema, order);
}

// Function to serialize SellOrder data
export const serializeBuyOrder = (order: BuyOrder): Uint8Array => {
    return serialize(BuyOrder.schema, order);
}

// Function to create a sell order transaction
// export async function createSellOrder(wallet: any, order: EscrowOrder) {
//     const transaction = new Transaction();
//     const serializedOrder = serializeSellOrder(order);

//     const createOrderIx = new TransactionInstruction({
//         keys: [
//             { pubkey: wallet.publicKey, isSigner: true, isWritable: true },
//             // { pubkey: new PublicKey(order.escrowAccount), isSigner: false, isWritable: true },
//         ],
//         programId: programId,
//         data: Buffer.concat([Buffer.from([0]), serializedOrder]),
//     });

//     transaction.add(createOrderIx);
//     const signature = await connection.sendTransaction(transaction, [wallet], { skipPreflight: false, preflightCommitment: "confirmed" });
//     console.log("Transaction signature:", signature);
// }

export class EscrowClient {
    private connection: Connection
    private programId: PublicKey
    constructor(
        // private connection: Connection,
        // private programId: PublicKey,
        connection: Connection,
        programId: PublicKey,
    ) {
        this.connection = connection
        this.programId = programId
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
