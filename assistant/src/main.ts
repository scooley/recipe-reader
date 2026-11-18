import { readConfig } from "./config.ts";
import { createApp } from "./server.ts";
import { AzureStore, MemoryStore } from "./storage.ts";

if (import.meta.main) {
  const config = readConfig(Deno.env.toObject());
  const store = config.storageMode === "memory"
    ? new MemoryStore()
    : new AzureStore(config);
  if (store instanceof AzureStore) {
    await store.verifyPrivateContainer();
  }
  Deno.serve(
    { hostname: config.host, port: config.port },
    createApp(config, store),
  );
}
