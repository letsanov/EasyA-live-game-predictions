import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink } from "@trpc/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import MatchDetail from "./pages/MatchDetail";
import ThreadDetail from "./pages/ThreadDetail";
import Portfolio from "./pages/Portfolio";
import NotFound from "./pages/NotFound";
import { trpc } from "./lib/trpc";
import { WalletProvider } from "./contexts/WalletContext";
import NetworkWarning from "./components/NetworkWarning";
import { loadNetworkConfig } from "./config/networks";

const App = () => {
  const [ready, setReady] = useState(false);
  const [queryClient] = useState(() => new QueryClient());
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${import.meta.env.BASE_URL}trpc`,
        }),
      ],
    })
  );

  useEffect(() => {
    loadNetworkConfig().then(() => setReady(true));
  }, []);

  if (!ready) return null;

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <WalletProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter basename={import.meta.env.BASE_URL}>
              <NetworkWarning />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/thread/:matchId" element={<ThreadDetail />} />
                <Route path="/match/:id" element={<MatchDetail />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </WalletProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
};

export default App;
