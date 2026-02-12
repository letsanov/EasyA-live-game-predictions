export interface NetworkConfig {
  chainId: number;
  chainIdHex: string;
  chainName: string;
  rpcUrl: string;
  contractAddress: string;
  usdcAddress: string;
  blockExplorer: string;
}

const CHAIN_META: Record<number, { chainIdHex: string; chainName: string; blockExplorer: string }> = {
  1337:  { chainIdHex: "0x539",   chainName: "Hardhat Local", blockExplorer: "" },
  84532: { chainIdHex: "0x14a34", chainName: "Base Sepolia",  blockExplorer: "https://sepolia.basescan.org" },
  8453:  { chainIdHex: "0x2105",  chainName: "Base",          blockExplorer: "https://basescan.org" },
};

// Defaults to localhost until backend config is fetched
let _network: NetworkConfig = {
  chainId: 1337,
  chainIdHex: "0x539",
  chainName: "Hardhat Local",
  rpcUrl: "http://127.0.0.1:8545",
  contractAddress: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  usdcAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  blockExplorer: "",
};

let _loaded = false;
let _loadPromise: Promise<void> | null = null;

export function loadNetworkConfig(): Promise<void> {
  if (_loadPromise) return _loadPromise;
  _loadPromise = (async () => {
    try {
      const res = await fetch("/games-alpha/trpc/networkConfig");
      const json = await res.json();
      const data = json.result?.data;
      if (data) {
        const meta = CHAIN_META[data.chainId] || CHAIN_META[1337];
        _network = {
          chainId: data.chainId,
          chainIdHex: meta.chainIdHex,
          chainName: meta.chainName,
          rpcUrl: data.rpcUrl,
          contractAddress: data.contractAddress,
          usdcAddress: data.usdcAddress,
          blockExplorer: meta.blockExplorer,
        };
        _loaded = true;
      }
    } catch {
      console.warn("Failed to fetch network config from backend, using defaults");
    }
  })();
  return _loadPromise;
}

export const network: NetworkConfig = new Proxy({} as NetworkConfig, {
  get(_, prop: string) {
    return _network[prop as keyof NetworkConfig];
  },
});

export const isNetworkLoaded = () => _loaded;
