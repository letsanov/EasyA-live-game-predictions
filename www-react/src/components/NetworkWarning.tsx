import { useWallet } from "@/contexts/WalletContext";

const EXPECTED_CHAIN_ID = 1337; // Hardhat localhost

const switchToHardhat = async () => {
  if (!window.ethereum) return;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x539" }], // 1337 in hex
    });
  } catch (switchError: any) {
    // Chain not added yet - add it
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0x539",
              chainName: "Hardhat Local",
              nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
              rpcUrls: ["http://127.0.0.1:8545"],
            },
          ],
        });
      } catch (addError) {
        console.error("Failed to add Hardhat network:", addError);
      }
    }
  }
};

const NetworkWarning = () => {
  const { chainId, account } = useWallet();

  if (!account || !chainId || chainId === EXPECTED_CHAIN_ID) {
    return null;
  }

  return (
    <div className="sticky top-14 z-40 bg-destructive/90 backdrop-blur-sm border-b border-destructive px-4 py-2">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-white">
          <span>Wrong network! Please switch to Hardhat Local (Chain ID: 1337)</span>
        </div>
        <button
          onClick={switchToHardhat}
          className="text-xs font-semibold bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-md transition-colors"
        >
          Switch Network
        </button>
      </div>
    </div>
  );
};

export default NetworkWarning;
