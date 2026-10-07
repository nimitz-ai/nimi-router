import { getProviders } from "@/lib/config";
import PlaygroundClient from "@/components/PlaygroundClient";

export const dynamic = "force-dynamic";

export default function PlaygroundPage() {
  const providers = getProviders();
  const first = providers.find((p) => p.enabled);
  const defaultModel =
    first && !first.models.includes("*") ? first.models[0] : "gpt-4o-mini";

  return <PlaygroundClient defaultModel={defaultModel} />;
}
