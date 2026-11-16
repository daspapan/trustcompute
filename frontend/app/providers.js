"use client";

import { RainbowKitProvider, lightTheme } from "@rainbow-me/rainbowkit";
import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "@/lib/wagmi";
import { RoleProvider, useRole } from "@/lib/RoleContext";

const queryClient = new QueryClient();

// Wallet modal accent follows the role theme in globals.css.
const ROLE_ACCENT = {
  owner: "#c0264a",
  worker: "#5b3fc4",
  seller: "#1b7a45",
  buyer: "#1d5fd1",
  guest: "#1d5fd1",
};

function ThemedRainbowKit({ children }) {
  const { role } = useRole();
  const theme = lightTheme({
    accentColor: ROLE_ACCENT[role],
    accentColorForeground: "#ffffff",
    borderRadius: "medium",
    fontStack: "system",
    overlayBlur: "small",
  });
  return <RainbowKitProvider theme={theme}>{children}</RainbowKitProvider>;
}

export function Providers({ children }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RoleProvider>
          <ThemedRainbowKit>{children}</ThemedRainbowKit>
        </RoleProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
