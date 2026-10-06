import { readJevbenchSeoData } from '../lib/jevbench-seo.mjs';
import { escapeJsonLd, jevbenchMainJsonLd, jevbenchFaq } from '../lib/jevbench-seo-jsonld.mjs';
import { JevFaq } from './JevBenchSeoBlocks';

/** Lead wires this server component into the live board; Q&As are visible and match the JSON-LD. */
export async function JevBenchMainJsonLd() {
  const data = await readJevbenchSeoData();
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html: escapeJsonLd(jevbenchMainJsonLd(data))}}/>
    <JevFaq items={jevbenchFaq(data)}/>
  </>;
}
