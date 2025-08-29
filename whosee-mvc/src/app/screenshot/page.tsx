import { getLocale } from 'next-intl/server';
import { redirect } from 'next/navigation';

export default async function ScreenshotIndex() {
	const locale = await getLocale();
	redirect(`/${locale}/screenshot`);
}


