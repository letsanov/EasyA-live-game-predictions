import { useWallet } from "@/contexts/WalletContext";
import { network } from "@/config/networks";

const switchNetwork = async () => {
  if (!window.ethereum) return;

  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: network.chainIdHex }],
    });
  } catch (switchError: any) {
    // Chain not added yet - add it
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: network.chainIdHex,
              chainName: network.chainName,
              nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
              rpcUrls: [network.rpcUrl],
              ...(network.blockExplorer ? { blockExplorerUrls: [network.blockExplorer] } : {}),
            },
          ],
        });
      } catch (addError) {
        console.error("Failed to add network:", addError);
      }
    }
  }
};

const NetworkWarning = () => {
  const { chainId, account } = useWallet();

  if (!account || !chainId || chainId === network.chainId) {
    return null;
  }

  return (
    <div className="sticky top-14 z-40 bg-destructive/90 backdrop-blur-sm border-b border-destructive px-4 py-2">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-white">
          <span>Wrong network! Please switch to {network.chainName}</span>
        </div>
        <button
          onClick={switchNetwork}
          className="text-xs font-semibold bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-md transition-colors"
        >
          Switch Network
        </button>
      </div>
    </div>
  );
};

export default NetworkWarning;
