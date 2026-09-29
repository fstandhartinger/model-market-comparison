import { permanentRedirect } from 'next/navigation';

// CR-214 (29 Sep 2026): the hidden preview became the public /audio-jev-bench page (same precedent as ImageJev).
export default function WipAudioJevPreview() {
  permanentRedirect('/audio-jev-bench');
}
