import { ImageJevSystemDetail, imageJevDetailMetadata } from '../../../components/ImageJevSystemDetail';
import { readImageJevDetails } from '../../../lib/imagejev-details.mjs';
export const dynamicParams = false;
export async function generateStaticParams() {
  return (await readImageJevDetails())!.systems.map((row) => ({ system: row.key }));
}
export async function generateMetadata({ params }: { params: Promise<{ system: string }> }) {
  return imageJevDetailMetadata((await params).system, 'v0.2.0', true);
}
export default async function ImageJevSystemPage({ params }: { params: Promise<{ system: string }> }) {
  return ImageJevSystemDetail({ system: (await params).system });
}
