// Server-only release inputs for the on-demand all-data endpoint. Explicit loaders never discover draft data.
import { readJevbenchV16Release, readJevbenchV161Release } from './jevbench-v16-release.mjs';
import { readCurrentJevbench } from './jevbench-current.mjs';
import { readJevbenchV157Release, withPublicAdapterIds } from './jevbench-v15-release.mjs';
import { historicalCatalogue } from './jevbench-v162-release.mjs';
import { assembleJevBoard } from './jevbench-live-board.mjs';
import { jevScopeClassifier, jevbenchScopeArtifact, jevbenchScopeCarry, jevApiPreliminaryRows } from './jevbench-scope.mjs';
import { jevLiveAllArtifact } from './jevbench-cohort-merge.mjs';
import { isJevbenchV16ExcludedKey } from './jevbench-v16-public-scope.mjs';
import { JEVBENCH_S_CATEGORY_CELLS_ARTIFACT } from './jevbench-categories.mjs';
import apiA4 from '../data/jevbench-api-a4-equated.json' with { type: 'json' };
import apiPublicSet from '../data/jevbench-api-public-set.json' with { type: 'json' };
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { readOptionalJevbenchV1610Release, v1610BoardInput } from './jevbench-v1610-release.mjs';
import { readOptionalJevbenchV1611Release, v1611BoardInput } from './jevbench-v1611-release.mjs';
import { readOptionalJevbenchV1612Release, v1612BoardInput } from './jevbench-v1612-release.mjs';
import { readOptionalJevbenchV1613Release, v1613BoardInput } from './jevbench-v1613-release.mjs';
import { readOptionalJevbenchV1614Release, v1614BoardInput } from './jevbench-v1614-release.mjs';
import { readOptionalJevbenchV1615Release, v1615BoardInput } from './jevbench-v1615-release.mjs';
import { readOptionalJevbenchV1616Release, v1616BoardInput } from './jevbench-v1616-release.mjs';
import { readOptionalJevbenchV1617Release, v1617BoardInput } from './jevbench-v1617-release.mjs';
import { readOptionalJevbenchV1618Release, v1618BoardInput } from './jevbench-v1618-release.mjs';
import { readOptionalJevbenchV162Release } from './jevbench-v162-release.mjs';
import { readOptionalJevbenchV1620Release, v1620BoardInput } from './jevbench-v1620-release.mjs';
import { readOptionalJevbenchV1621Release, v1621BoardInput } from './jevbench-v1621-release.mjs';
import { readOptionalJevbenchV1622Release, v1622BoardInput } from './jevbench-v1622-release.mjs';
import { readOptionalJevbenchV1623Release, v1623BoardInput } from './jevbench-v1623-release.mjs';
import { readOptionalJevbenchV1624Release, v1624BoardInput } from './jevbench-v1624-release.mjs';
import { readOptionalJevbenchV1625Release, v1625BoardInput } from './jevbench-v1625-release.mjs';
import { readOptionalJevbenchV1626Release, v1626BoardInput } from './jevbench-v1626-release.mjs';
import { readOptionalJevbenchV1627Release, v1627BoardInput } from './jevbench-v1627-release.mjs';
import { readOptionalJevbenchV1628Release, v1628BoardInput } from './jevbench-v1628-release.mjs';
import { readOptionalJevbenchV1629Release, v1629BoardInput } from './jevbench-v1629-release.mjs';
import { readOptionalJevbenchV163Release, v163BoardInput } from './jevbench-v163-release.mjs';
import { readOptionalJevbenchV1630Release, v1630BoardInput } from './jevbench-v1630-release.mjs';
import { readOptionalJevbenchV1631Release, v1631BoardInput } from './jevbench-v1631-release.mjs';
import { readOptionalJevbenchV1632Release, v1632BoardInput } from './jevbench-v1632-release.mjs';
import { readOptionalJevbenchV1633Release, v1633BoardInput } from './jevbench-v1633-release.mjs';
import { readOptionalJevbenchV1634Release, v1634BoardInput } from './jevbench-v1634-release.mjs';
import { readOptionalJevbenchV1635Release, v1635BoardInput } from './jevbench-v1635-release.mjs';
import { readOptionalJevbenchV1636Release, v1636BoardInput } from './jevbench-v1636-release.mjs';
import { readOptionalJevbenchV1637Release, v1637BoardInput } from './jevbench-v1637-release.mjs';
import { readOptionalJevbenchV1638Release, v1638BoardInput } from './jevbench-v1638-release.mjs';
import { readOptionalJevbenchV1639Release, v1639BoardInput } from './jevbench-v1639-release.mjs';
import { readOptionalJevbenchV164Release, v164BoardInput } from './jevbench-v164-release.mjs';
import { readOptionalJevbenchV1640Release, v1640BoardInput } from './jevbench-v1640-release.mjs';
import { readOptionalJevbenchV1642Release, v1642BoardInput } from './jevbench-v1642-release.mjs';
import { readOptionalJevbenchV1643Release, v1643BoardInput } from './jevbench-v1643-release.mjs';
import { readOptionalJevbenchV165Release, v165BoardInput } from './jevbench-v165-release.mjs';
import { readOptionalJevbenchV166Release, v166BoardInput } from './jevbench-v166-release.mjs';
import { readOptionalJevbenchV167Release, v167BoardInput } from './jevbench-v167-release.mjs';
import { readOptionalJevbenchV168Release, v168BoardInput } from './jevbench-v168-release.mjs';
import { readOptionalJevbenchV169Release, v169BoardInput } from './jevbench-v169-release.mjs';
import { readJevbenchV171ForBoard, v171BoardInput } from './jevbench-v171-release.mjs';
import { readJevbenchV1710ForBoard, v1710BoardInput } from './jevbench-v1710-release.mjs';
import { readJevbenchV1711ForBoard, v1711BoardInput } from './jevbench-v1711-release.mjs';
import { readJevbenchV1712ForBoard, v1712BoardInput } from './jevbench-v1712-release.mjs';
import { readJevbenchV1713ForBoard, v1713BoardInput } from './jevbench-v1713-release.mjs';
import { readJevbenchV1714ForBoard, v1714BoardInput } from './jevbench-v1714-release.mjs';
import { readJevbenchV1715ForBoard, v1715BoardInput } from './jevbench-v1715-release.mjs';
import { readJevbenchV1716ForBoard, v1716BoardInput } from './jevbench-v1716-release.mjs';
import { readJevbenchV1717ForBoard, v1717BoardInput } from './jevbench-v1717-release.mjs';
import { readJevbenchV1718ForBoard, v1718BoardInput } from './jevbench-v1718-release.mjs';
import { readJevbenchV1719ForBoard, v1719BoardInput } from './jevbench-v1719-release.mjs';
import { readJevbenchV1720ForBoard, v1720BoardInput } from './jevbench-v1720-release.mjs';
import { readJevbenchV1721ForBoard, v1721BoardInput } from './jevbench-v1721-release.mjs';
import { readJevbenchV1722ForBoard, v1722BoardInput } from './jevbench-v1722-release.mjs';
import { readJevbenchV1819ForBoard, v1819BoardInput, V1819_MANIFEST } from './jevbench-v1819-release.mjs';
import { readJevbenchV1818ForBoard, v1818BoardInput, V1818_MANIFEST } from './jevbench-v1818-release.mjs';
import { readJevbenchV1817ForBoard, v1817BoardInput, V1817_MANIFEST } from './jevbench-v1817-release.mjs';
import { readJevbenchV1816ForBoard, v1816BoardInput, V1816_MANIFEST } from './jevbench-v1816-release.mjs';
import { readJevbenchV1815ForBoard, v1815BoardInput, V1815_MANIFEST } from './jevbench-v1815-release.mjs';
import { readJevbenchV1814ForBoard, v1814BoardInput, V1814_MANIFEST } from './jevbench-v1814-release.mjs';
import { readJevbenchV1813ForBoard, v1813BoardInput, V1813_MANIFEST } from './jevbench-v1813-release.mjs';
import { readJevbenchV1812ForBoard, v1812BoardInput, V1812_MANIFEST } from './jevbench-v1812-release.mjs';
import { readJevbenchV1811ForBoard, v1811BoardInput, V1811_MANIFEST } from './jevbench-v1811-release.mjs';
import { readJevbenchV1810ForBoard, v1810BoardInput, V1810_MANIFEST } from './jevbench-v1810-release.mjs';
import { readJevbenchV189ForBoard, v189BoardInput } from './jevbench-v189-release.mjs';
import { readJevbenchV188ForBoard, v188BoardInput } from './jevbench-v188-release.mjs';
import { readJevbenchV187ForBoard, v187BoardInput } from './jevbench-v187-release.mjs';
import { readJevbenchV186ForBoard, v186BoardInput } from './jevbench-v186-release.mjs';
import { readJevbenchV185ForBoard, v185BoardInput } from './jevbench-v185-release.mjs';
import { readJevbenchV184ForBoard, v184BoardInput } from './jevbench-v184-release.mjs';
import { readJevbenchV183ForBoard, v183BoardInput } from './jevbench-v183-release.mjs';
import { readJevbenchV182ForBoard, v182BoardInput } from './jevbench-v182-release.mjs';
import { readJevbenchV181ForBoard, v181BoardInput } from './jevbench-v181-release.mjs';
import { readJevbenchV180ForBoard, v180BoardInput } from './jevbench-v180-release.mjs';
import { readJevbenchV1723ForBoard, v1723BoardInput } from './jevbench-v1723-release.mjs';
import { readJevbenchV172ForBoard, v172BoardInput } from './jevbench-v172-release.mjs';
import { readJevbenchV173ForBoard, v173BoardInput } from './jevbench-v173-release.mjs';
import { readJevbenchV174ForBoard, v174BoardInput } from './jevbench-v174-release.mjs';
import { readJevbenchV175ForBoard, v175BoardInput } from './jevbench-v175-release.mjs';
import { readJevbenchV176ForBoard, v176BoardInput } from './jevbench-v176-release.mjs';
import { readJevbenchV177ForBoard, v177BoardInput } from './jevbench-v177-release.mjs';
import { readJevbenchV178ForBoard, v178BoardInput } from './jevbench-v178-release.mjs';
import { readJevbenchV179ForBoard, v179BoardInput } from './jevbench-v179-release.mjs';

const releases = {
  'v1.6.10': { read: readOptionalJevbenchV1610Release, board: v1610BoardInput },
  'v1.6.11': { read: readOptionalJevbenchV1611Release, board: v1611BoardInput },
  'v1.6.12': { read: readOptionalJevbenchV1612Release, board: v1612BoardInput },
  'v1.6.13': { read: readOptionalJevbenchV1613Release, board: v1613BoardInput },
  'v1.6.14': { read: readOptionalJevbenchV1614Release, board: v1614BoardInput },
  'v1.6.15': { read: readOptionalJevbenchV1615Release, board: v1615BoardInput },
  'v1.6.16': { read: readOptionalJevbenchV1616Release, board: v1616BoardInput },
  'v1.6.17': { read: readOptionalJevbenchV1617Release, board: v1617BoardInput },
  'v1.6.18': { read: readOptionalJevbenchV1618Release, board: v1618BoardInput },
  'v1.6.2': { read: readOptionalJevbenchV162Release, board: (release) => release },
  'v1.6.20': { read: readOptionalJevbenchV1620Release, board: v1620BoardInput },
  'v1.6.21': { read: readOptionalJevbenchV1621Release, board: v1621BoardInput },
  'v1.6.22': { read: readOptionalJevbenchV1622Release, board: v1622BoardInput },
  'v1.6.23': { read: readOptionalJevbenchV1623Release, board: v1623BoardInput },
  'v1.6.24': { read: readOptionalJevbenchV1624Release, board: v1624BoardInput },
  'v1.6.25': { read: readOptionalJevbenchV1625Release, board: v1625BoardInput },
  'v1.6.26': { read: readOptionalJevbenchV1626Release, board: v1626BoardInput },
  'v1.6.27': { read: readOptionalJevbenchV1627Release, board: v1627BoardInput },
  'v1.6.28': { read: readOptionalJevbenchV1628Release, board: v1628BoardInput },
  'v1.6.29': { read: readOptionalJevbenchV1629Release, board: v1629BoardInput },
  'v1.6.3': { read: readOptionalJevbenchV163Release, board: v163BoardInput },
  'v1.6.30': { read: readOptionalJevbenchV1630Release, board: v1630BoardInput },
  'v1.6.31': { read: readOptionalJevbenchV1631Release, board: v1631BoardInput },
  'v1.6.32': { read: readOptionalJevbenchV1632Release, board: v1632BoardInput },
  'v1.6.33': { read: readOptionalJevbenchV1633Release, board: v1633BoardInput },
  'v1.6.34': { read: readOptionalJevbenchV1634Release, board: v1634BoardInput },
  'v1.6.35': { read: readOptionalJevbenchV1635Release, board: v1635BoardInput },
  'v1.6.36': { read: readOptionalJevbenchV1636Release, board: v1636BoardInput },
  'v1.6.37': { read: readOptionalJevbenchV1637Release, board: v1637BoardInput },
  'v1.6.38': { read: readOptionalJevbenchV1638Release, board: v1638BoardInput },
  'v1.6.39': { read: readOptionalJevbenchV1639Release, board: v1639BoardInput },
  'v1.6.4': { read: readOptionalJevbenchV164Release, board: v164BoardInput },
  'v1.6.40': { read: readOptionalJevbenchV1640Release, board: v1640BoardInput },
  'v1.6.42': { read: readOptionalJevbenchV1642Release, board: v1642BoardInput },
  'v1.6.43': { read: readOptionalJevbenchV1643Release, board: v1643BoardInput },
  'v1.6.5': { read: readOptionalJevbenchV165Release, board: v165BoardInput },
  'v1.6.6': { read: readOptionalJevbenchV166Release, board: v166BoardInput },
  'v1.6.7': { read: readOptionalJevbenchV167Release, board: v167BoardInput },
  'v1.6.8': { read: readOptionalJevbenchV168Release, board: v168BoardInput },
  'v1.6.9': { read: readOptionalJevbenchV169Release, board: v169BoardInput },
  'v1.7.1': { read: readJevbenchV171ForBoard, board: v171BoardInput },
  'v1.7.10': { read: readJevbenchV1710ForBoard, board: v1710BoardInput },
  'v1.7.11': { read: readJevbenchV1711ForBoard, board: v1711BoardInput },
  'v1.7.12': { read: readJevbenchV1712ForBoard, board: v1712BoardInput },
  'v1.7.13': { read: readJevbenchV1713ForBoard, board: v1713BoardInput },
  'v1.7.14': { read: readJevbenchV1714ForBoard, board: v1714BoardInput },
  'v1.7.15': { read: readJevbenchV1715ForBoard, board: v1715BoardInput },
  'v1.7.16': { read: readJevbenchV1716ForBoard, board: v1716BoardInput },
  'v1.7.17': { read: readJevbenchV1717ForBoard, board: v1717BoardInput },
  'v1.7.18': { read: readJevbenchV1718ForBoard, board: v1718BoardInput },
  'v1.7.19': { read: readJevbenchV1719ForBoard, board: v1719BoardInput },
  'v1.7.20': { read: readJevbenchV1720ForBoard, board: v1720BoardInput },
  'v1.7.21': { read: readJevbenchV1721ForBoard, board: v1721BoardInput },
  'v1.7.22': { read: readJevbenchV1722ForBoard, board: v1722BoardInput },
  'v1.7.23': { read: readJevbenchV1723ForBoard, board: v1723BoardInput },
  'v1.8.0': { read: readJevbenchV180ForBoard, board: v180BoardInput },
  'v1.8.1': { read: readJevbenchV181ForBoard, board: v181BoardInput },
  'v1.8.2': { read: readJevbenchV182ForBoard, board: v182BoardInput },
  'v1.8.3': { read: readJevbenchV183ForBoard, board: v183BoardInput },
  'v1.8.4': { read: readJevbenchV184ForBoard, board: v184BoardInput },
  'v1.8.5': { read: readJevbenchV185ForBoard, board: v185BoardInput },
  'v1.8.6': { read: readJevbenchV186ForBoard, board: v186BoardInput },
  'v1.8.7': { read: readJevbenchV187ForBoard, board: v187BoardInput },
  'v1.8.8': { read: readJevbenchV188ForBoard, board: v188BoardInput },
  'v1.8.9': { read: readJevbenchV189ForBoard, board: v189BoardInput },
  'v1.8.10': { read: readJevbenchV1810ForBoard, board: v1810BoardInput },
  'v1.8.11': { read: readJevbenchV1811ForBoard, board: v1811BoardInput },
  'v1.8.12': { read: readJevbenchV1812ForBoard, board: v1812BoardInput },
  'v1.8.13': { read: readJevbenchV1813ForBoard, board: v1813BoardInput },
  'v1.8.14': { read: readJevbenchV1814ForBoard, board: v1814BoardInput },
  'v1.8.15': { read: readJevbenchV1815ForBoard, board: v1815BoardInput },
  'v1.8.16': { read: readJevbenchV1816ForBoard, board: v1816BoardInput },
  'v1.8.17': { read: readJevbenchV1817ForBoard, board: v1817BoardInput },
  'v1.8.18': { read: readJevbenchV1818ForBoard, board: v1818BoardInput },
  'v1.8.19': { read: readJevbenchV1819ForBoard, board: v1819BoardInput },
  'v1.7.2': { read: readJevbenchV172ForBoard, board: v172BoardInput },
  'v1.7.3': { read: readJevbenchV173ForBoard, board: v173BoardInput },
  'v1.7.4': { read: readJevbenchV174ForBoard, board: v174BoardInput },
  'v1.7.5': { read: readJevbenchV175ForBoard, board: v175BoardInput },
  'v1.7.6': { read: readJevbenchV176ForBoard, board: v176BoardInput },
  'v1.7.7': { read: readJevbenchV177ForBoard, board: v177BoardInput },
  'v1.7.8': { read: readJevbenchV178ForBoard, board: v178BoardInput },
  'v1.7.9': { read: readJevbenchV179ForBoard, board: v179BoardInput },
};

export function allDataExtraRows(artifact, carry, scope) {
  if (scope !== 'api') return [];
  const measured = new Set(artifact.systems.map((row) => row.key));
  const { prelim, pending } = jevApiPreliminaryRows(apiPublicSet, new Map(carry.rows.map((row) => [row.key, row])));
  return [...prelim, ...pending].filter((row) => !measured.has(row.key));
}

export async function readJevAllDataInput(version, root = process.cwd()) {
  const live = ['board-open', 'board-api', 'board-all'].includes(version);
  if (live || version === 'v1.6.0' || version === 'v1.6.1') {
    const release = await (live ? readCurrentJevbench(root) : version === 'v1.6.0' ? readJevbenchV16Release(root) : readJevbenchV161Release(root));
    const previous = await readJevbenchV157Release(root);
    const board = await assembleJevBoard({ release, previous, live, apiA4, root });
    const scope = live ? version.slice(6) : 'all';
    const isApi = jevScopeClassifier(board.published.systems, board.publishedCarry.rows, previous.artifact.systems, previous.artifact.not_measured);
    const scoped = live && scope === 'all' ? jevLiveAllArtifact(board.published, isApi) : jevbenchScopeArtifact(board.published, scope, isApi);
    const cellSupplementSha256 = board.live ? createHash('sha256').update(await readFile(`${root}/${JEVBENCH_S_CATEGORY_CELLS_ARTIFACT}`)).digest('hex') : undefined;
    const artifact = withPublicAdapterIds(cellSupplementSha256 ? { ...scoped, cellSupplementSha256 } : scoped);
    return { artifact, categories: board.categories, previousKeys: [...previous.artifact.systems, ...previous.artifact.not_measured]
      .filter((row) => !isJevbenchV16ExcludedKey(row.key, artifact.revision)).map((row) => row.key),
      extra: allDataExtraRows(artifact, jevbenchScopeCarry(board.publishedCarry, scope === 'api' ? 'api' : 'all', isApi), scope), live };
  }
  if (version === 'v1.8.19') { // v1819: bind the precomputed input to the validated published manifest
    let v1819Manifest; try { v1819Manifest = await readFile(`${root}/${V1819_MANIFEST}`); } catch (e) { if (e.code === 'ENOENT') return null; throw e; }
    if (JSON.parse(v1819Manifest).review?.verdict !== 'PASS') return null; // v1819 publication gate
    const v1819Input = JSON.parse(await readFile(`${root}/data/jevbench-v1.8.19-alldata.json`, 'utf8'));
    if (createHash('sha256').update(v1819Manifest).digest('hex') !== v1819Input.manifestSha256) throw new Error('v1.8.19 All-data manifest mismatch');
    return v1819Input;
  }
  if (version === 'v1.8.18') { // v1818: bind the precomputed input to the validated published manifest
    let v1818Manifest; try { v1818Manifest = await readFile(`${root}/${V1818_MANIFEST}`); } catch (e) { if (e.code === 'ENOENT') return null; throw e; }
    if (JSON.parse(v1818Manifest).review?.verdict !== 'PASS') return null; // v1818 publication gate
    const v1818Input = JSON.parse(await readFile(`${root}/data/jevbench-v1.8.18-alldata.json`, 'utf8'));
    if (createHash('sha256').update(v1818Manifest).digest('hex') !== v1818Input.manifestSha256) throw new Error('v1.8.18 All-data manifest mismatch');
    return v1818Input;
  }
  if (version === 'v1.8.17') { // v1817: bind the precomputed input to the validated published manifest
    let v1817Manifest; try { v1817Manifest = await readFile(`${root}/${V1817_MANIFEST}`); } catch (e) { if (e.code === 'ENOENT') return null; throw e; }
    if (JSON.parse(v1817Manifest).review?.verdict !== 'PASS') return null; // v1817 publication gate
    const v1817Input = JSON.parse(await readFile(`${root}/data/jevbench-v1.8.17-alldata.json`, 'utf8'));
    if (createHash('sha256').update(v1817Manifest).digest('hex') !== v1817Input.manifestSha256) throw new Error('v1.8.17 All-data manifest mismatch');
    return v1817Input;
  }
  if (version === 'v1.8.16') { // v1816: bind the precomputed input to the validated published manifest
    let v1816Manifest; try { v1816Manifest = await readFile(`${root}/${V1816_MANIFEST}`); } catch (e) { if (e.code === 'ENOENT') return null; throw e; }
    if (JSON.parse(v1816Manifest).review?.verdict !== 'PASS') return null; // v1816 publication gate
    const v1816Input = JSON.parse(await readFile(`${root}/data/jevbench-v1.8.16-alldata.json`, 'utf8'));
    if (createHash('sha256').update(v1816Manifest).digest('hex') !== v1816Input.manifestSha256) throw new Error('v1.8.16 All-data manifest mismatch');
    return v1816Input;
  }
  if (version === 'v1.8.15') { // v1815: bind the precomputed input to the validated published manifest
    let v1815Manifest; try { v1815Manifest = await readFile(`${root}/${V1815_MANIFEST}`); } catch (e) { if (e.code === 'ENOENT') return null; throw e; }
    if (JSON.parse(v1815Manifest).review?.verdict !== 'PASS') return null; // v1815 publication gate
    const v1815Input = JSON.parse(await readFile(`${root}/data/jevbench-v1.8.15-alldata.json`, 'utf8'));
    if (createHash('sha256').update(v1815Manifest).digest('hex') !== v1815Input.manifestSha256) throw new Error('v1.8.15 All-data manifest mismatch');
    return v1815Input;
  }
  if (version === 'v1.8.14') { // v1814: bind the precomputed input to the validated published manifest
    let v1814Manifest; try { v1814Manifest = await readFile(`${root}/${V1814_MANIFEST}`); } catch (e) { if (e.code === 'ENOENT') return null; throw e; }
    if (JSON.parse(v1814Manifest).review?.verdict !== 'PASS') return null; // v1814 publication gate
    const v1814Input = JSON.parse(await readFile(`${root}/data/jevbench-v1.8.14-alldata.json`, 'utf8'));
    if (createHash('sha256').update(v1814Manifest).digest('hex') !== v1814Input.manifestSha256) throw new Error('v1.8.14 All-data manifest mismatch');
    return v1814Input;
  }
  if (version === 'v1.8.13') { // v1813: bind the precomputed input to the validated published manifest
    let v1813Manifest; try { v1813Manifest = await readFile(`${root}/${V1813_MANIFEST}`); } catch (e) { if (e.code === 'ENOENT') return null; throw e; }
    if (JSON.parse(v1813Manifest).review?.verdict !== 'PASS') return null; // v1813 publication gate
    const v1813Input = JSON.parse(await readFile(`${root}/data/jevbench-v1.8.13-alldata.json`, 'utf8'));
    if (createHash('sha256').update(v1813Manifest).digest('hex') !== v1813Input.manifestSha256) throw new Error('v1.8.13 All-data manifest mismatch');
    return v1813Input;
  }
  if (version === 'v1.8.12') { // v1812: bind the precomputed input to the validated published manifest
    let v1812Manifest; try { v1812Manifest = await readFile(`${root}/${V1812_MANIFEST}`); } catch (e) { if (e.code === 'ENOENT') return null; throw e; }
    if (JSON.parse(v1812Manifest).review?.verdict !== 'PASS') return null; // v1812 publication gate
    const v1812Input = JSON.parse(await readFile(`${root}/data/jevbench-v1.8.12-alldata.json`, 'utf8'));
    if (createHash('sha256').update(v1812Manifest).digest('hex') !== v1812Input.manifestSha256) throw new Error('v1.8.12 All-data manifest mismatch');
    return v1812Input;
  }
  if (version === 'v1.8.11') { // v1811: bind the precomputed input to the validated published manifest
    let v1811Manifest; try { v1811Manifest = await readFile(`${root}/${V1811_MANIFEST}`); } catch (e) { if (e.code === 'ENOENT') return null; throw e; }
    if (JSON.parse(v1811Manifest).review?.verdict !== 'PASS') return null; // v1811 publication gate
    const v1811Input = JSON.parse(await readFile(`${root}/data/jevbench-v1.8.11-alldata.json`, 'utf8'));
    if (createHash('sha256').update(v1811Manifest).digest('hex') !== v1811Input.manifestSha256) throw new Error('v1.8.11 All-data manifest mismatch');
    return v1811Input;
  }
  if (version === 'v1.8.10') { // v1810: bind the precomputed input to the validated published manifest
    let v1810Manifest; try { v1810Manifest = await readFile(`${root}/${V1810_MANIFEST}`); } catch (e) { if (e.code === 'ENOENT') return null; throw e; }
    if (JSON.parse(v1810Manifest).review?.verdict !== 'PASS') return null; // v1810 publication gate
    const v1810Input = JSON.parse(await readFile(`${root}/data/jevbench-v1.8.10-alldata.json`, 'utf8'));
    if (createHash('sha256').update(v1810Manifest).digest('hex') !== v1810Input.manifestSha256) throw new Error('v1.8.10 All-data manifest mismatch');
    return v1810Input;
  }
  const entry = Object.hasOwn(releases, version) ? releases[version] : null;
  if (!entry) return null;
  const release = await entry.read(root);
  if (!release) return null;
  const board = entry.board(release);
  const previousKeys = (version.startsWith('v1.7.') || version.startsWith('v1.8.'))
    ? release.artifact.systems.filter((row) => row.new_in !== version && (['v1.7.1', 'v1.7.2'].includes(version) || row.remeasured_in !== version)).map((row) => row.key)
    : historicalCatalogue(release.historical.artifact, release.historical.carry).map((row) => row.key);
  return { artifact: withPublicAdapterIds(board.artifact), categories: board.categories, previousKeys, extra: [], live: false };
}
