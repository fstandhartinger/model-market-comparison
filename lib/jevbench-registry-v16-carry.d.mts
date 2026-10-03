import type {V16RegistryProjection,V16ProjectedRow,V16ProjectionInput,StoredPublicAggregate} from './jevbench-registry-v16.mjs';
import type {DatedOldCarryProfile} from './jevbench-dated-carry-v16.mjs';
export type V16CarryProjectedRow=V16ProjectedRow&{carry_categories:DatedOldCarryProfile|null};
export type V16CarryRegistryProjection=Omit<V16RegistryProjection,'rows'|'source_hashes'>&{rows:V16CarryProjectedRow[];source_hashes:V16RegistryProjection['source_hashes']&{carry:string}};
export type V16CarryProjectionInput=V16ProjectionInput&{carry:StoredPublicAggregate};
export function canonicalV16Aggregate(value:unknown):string;
export function projectJevV16RegistryWithCarry(input:V16CarryProjectionInput,options?:{allowFixture?:boolean}):Promise<V16CarryRegistryProjection>;
