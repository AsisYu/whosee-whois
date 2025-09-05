import { getLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';

export default async function HealthIndex() {
	const locale = await getLocale();
	redirect(`/${locale}/health`);
}


