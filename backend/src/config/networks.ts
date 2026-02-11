export interface NetworkConfig {
  chainId: number;
  rpcUrl: string;
  contractAddress: string;
  usdcAddress: string;
}

const NETWORKS: Record<string, NetworkConfig> = {
  localhost: {
    chainId: 1337,
    rpcUrl: "http://127.0.0.1:8545",
    contractAddress: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    usdcAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  },
  baseSepolia: {
    chainId: 84532,
    rpcUrl: "https://sepolia.base.org",
    contractAddress: "0x180860b79d33f5F4e2192db62F2701B80C6A811a",
    usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  },
  base: {
    chainId: 8453,
    rpcUrl: "https://mainnet.base.org",
    contractAddress: "0x5FDD385eb091893628c2b79a7E259cBfCABa6432",
    usdcAddress: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  },
};

export function getNetwork(): NetworkConfig {
  const networkName = process.env.BLOCKCHAIN_NETWORK || "localhost";
  return NETWORKS[networkName] || NETWORKS.localhost;
}

// Lazy getter — reads env at access time, not import time
export const network: NetworkConfig = new Proxy({} as NetworkConfig, {
  get(_, prop: string) {
    return getNetwork()[prop as keyof NetworkConfig];
  },
});
