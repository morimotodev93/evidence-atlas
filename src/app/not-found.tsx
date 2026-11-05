import { NotFoundContent } from "@/components/errors/not-found-content";
import { getSaasLocale } from "@/lib/i18n/saas-locale";

export default async function NotFound() {
  const locale = await getSaasLocale();
  return <NotFoundContent saasLocale={locale} />;
}
