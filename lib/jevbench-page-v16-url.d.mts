import type {V16Caps} from './jevbench-presentation-v16.mjs';
import type {V16PageManifest} from './jevbench-page-v16.mjs';
export type V16PageView={caps:V16Caps;scenario:string};
export function normalizeV16PageView(value:unknown,manifest:V16PageManifest):V16PageView;
export function parseV16PageView(search:string,manifest:V16PageManifest):V16PageView;
export function serializeV16PageView(search:string,value:V16PageView,manifest:V16PageManifest):string;
export type V16HistoryBrowser={location:{href:string;search:string};history:{state:unknown;replaceState(data:unknown,unused:string,url:string):void};addEventListener(type:'popstate',listener:()=>void):void;removeEventListener(type:'popstate',listener:()=>void):void};
export function bindV16PageHistory(browser:V16HistoryBrowser,manifest:V16PageManifest,onChange:(value:V16PageView)=>void):{update(value:V16PageView):void;dispose():void};
