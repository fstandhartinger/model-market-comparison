import { ImageJevSystemDetail, imageJevDetailMetadata } from '../../../../components/ImageJevSystemDetail';
import { readImageJevDetails } from '../../../../lib/imagejev-details.mjs';
export const dynamicParams = false;
export async function generateStaticParams() {
  return (await readImageJevDetails('v0.2.0'))!.systems.map((row) => ({ system: row.key }));
}
export async function generateMetadata({ params }: { params: Promise<{ system: string }> }) {
  return imageJevDetailMetadata((await params).system, 'v0.2.0');
}
export default async function ImageJevVersionedSystemPage({ params }: { params: Promise<{ system: string }> }) {
  return ImageJevSystemDetail({ system: (await params).system, revision: 'v0.2.0' });
}
