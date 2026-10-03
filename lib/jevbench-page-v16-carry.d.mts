import type {V16PageManifest,V16PageProfile,V16Weights} from './jevbench-page-v16.mjs';
import type {V16CarryRegistryProjection,V16CarryProjectionInput} from './jevbench-registry-v16-carry.mjs';
import type {StoredPublicAggregate} from './jevbench-registry-v16.mjs';
import type {DatedOldCarryProfile} from './jevbench-dated-carry-v16.mjs';
export type {V16Weights};
export type V16CarryPageProfile=(Omit<V16PageProfile,'kind'>&{kind:'current'})|DatedOldCarryProfile;
export type V16CarryPage={projection:V16CarryRegistryProjection;manifest:V16PageManifest&{projection_hashes:V16CarryRegistryProjection['source_hashes']};profiles:Record<string,V16CarryPageProfile>};
export function assembleV16PageWithCarry(projection:V16CarryRegistryProjection,manifest:V16CarryPage['manifest'],profiles:Record<string,V16CarryPageProfile>,options?:{allowFixture?:boolean}):V16CarryPage;
export function loadJevV16PageWithCarry(input:{projectionInput:V16CarryProjectionInput;pageManifest:StoredPublicAggregate;categoryProfiles:StoredPublicAggregate;expected:{as_of:string;projection:V16CarryRegistryProjection['source_hashes'];pageManifest:string;categoryProfiles:string}},options?:{allowFixture?:boolean}):Promise<V16CarryPage>;
