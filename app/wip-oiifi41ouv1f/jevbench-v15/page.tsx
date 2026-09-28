import { permanentRedirect } from 'next/navigation';

// Keep the former noindex preview URL off the public index and send visitors to the released canonical page.
export default function ReleasedJevBenchV15PreviewRedirect(): never {
  permanentRedirect('/jev-models/v1.5.0');
}
