export type PublicImageJevOption = { label: string; text: string };
export type PublicImageJevLicenseLink = { label: string; url: string };
export type PublicImageJevExample = {
  key: string;
  split: 'public';
  sourceItemId: string;
  category: string;
  title: string;
  image: string;
  width: number;
  height: number;
  alt: string;
  question: string;
  options: PublicImageJevOption[];
  correctLabel: string;
  sourceName: string;
  sourceUrl: string | null;
  license: string;
  sourceRevision: string | null;
  sourceRow: string;
  licenseLinks?: PublicImageJevLicenseLink[];
  changeNote?: string;
};

export declare const PUBLIC_IMAGE_JEV_EXAMPLES: PublicImageJevExample[];
