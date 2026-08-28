import { assessWhatsAppReadiness, readWhatsAppConfigFromEnv } from "@matriz/whatsapp";
import { loadEnv } from "@matriz/config";

export function getWhatsAppSetupStatus() {
  const env = loadEnv();
  const config = readWhatsAppConfigFromEnv();
  const readiness = assessWhatsAppReadiness(config, env.appUrl);
  return { config, readiness };
}
