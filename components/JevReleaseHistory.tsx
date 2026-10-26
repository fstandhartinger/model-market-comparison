import { JEVBENCH_RELEASES } from '../lib/jevbench-releases.mjs';
import { hasPublishedJevbenchV162Release } from '../lib/jevbench-v162-release.mjs';
import { hasPublishedJevbenchV163Release } from '../lib/jevbench-v163-release.mjs';
import { hasPublishedJevbenchV164Release } from '../lib/jevbench-v164-release.mjs';
import { hasPublishedJevbenchV165Release } from '../lib/jevbench-v165-release.mjs';
import { hasPublishedJevbenchV166Release } from '../lib/jevbench-v166-release.mjs';
import { hasPublishedJevbenchV167Release } from '../lib/jevbench-v167-release.mjs';
import { hasPublishedJevbenchV168Release } from '../lib/jevbench-v168-release.mjs';
import { hasPublishedJevbenchV169Release } from '../lib/jevbench-v169-release.mjs';
import { hasPublishedJevbenchV1610Release } from '../lib/jevbench-v1610-release.mjs';
import { hasPublishedJevbenchV1611Release } from '../lib/jevbench-v1611-release.mjs';
import { hasPublishedJevbenchV1612Release } from '../lib/jevbench-v1612-release.mjs';
import { hasPublishedJevbenchV1613Release } from '../lib/jevbench-v1613-release.mjs';
import { hasPublishedJevbenchV1614Release } from '../lib/jevbench-v1614-release.mjs';
import { hasPublishedJevbenchV1615Release } from '../lib/jevbench-v1615-release.mjs';
import { hasPublishedJevbenchV1616Release } from '../lib/jevbench-v1616-release.mjs';
import { hasPublishedJevbenchV1617Release } from '../lib/jevbench-v1617-release.mjs';
import { hasPublishedJevbenchV1618Release } from '../lib/jevbench-v1618-release.mjs';
import { hasPublishedJevbenchV1620Release } from '../lib/jevbench-v1620-release.mjs';
import { hasPublishedJevbenchV1621Release } from '../lib/jevbench-v1621-release.mjs';
import { hasPublishedJevbenchV1622Release } from '../lib/jevbench-v1622-release.mjs';
import { hasPublishedJevbenchV1623Release } from '../lib/jevbench-v1623-release.mjs';
import { hasPublishedJevbenchV1624Release } from '../lib/jevbench-v1624-release.mjs';
import { hasPublishedJevbenchV1625Release } from '../lib/jevbench-v1625-release.mjs';
import { hasPublishedJevbenchV1626Release } from '../lib/jevbench-v1626-release.mjs';
import { hasPublishedJevbenchV1627Release } from '../lib/jevbench-v1627-release.mjs';
import { hasPublishedJevbenchV1628Release } from '../lib/jevbench-v1628-release.mjs';
import { hasPublishedJevbenchV1629Release } from '../lib/jevbench-v1629-release.mjs';
import { hasPublishedJevbenchV1630Release } from '../lib/jevbench-v1630-release.mjs';
import { hasPublishedJevbenchV1631Release } from '../lib/jevbench-v1631-release.mjs';
import { hasPublishedJevbenchV1632Release } from '../lib/jevbench-v1632-release.mjs';
import { hasPublishedJevbenchV1633Release } from '../lib/jevbench-v1633-release.mjs';
import { hasPublishedJevbenchV1634Release } from '../lib/jevbench-v1634-release.mjs';
import { hasPublishedJevbenchV1635Release } from '../lib/jevbench-v1635-release.mjs';
import { hasPublishedJevbenchV1636Release } from '../lib/jevbench-v1636-release.mjs';
import { hasPublishedJevbenchV1637Release } from '../lib/jevbench-v1637-release.mjs';
import { hasPublishedJevbenchV1638Release } from '../lib/jevbench-v1638-release.mjs';
import { hasPublishedJevbenchV1639Release } from '../lib/jevbench-v1639-release.mjs';
import { hasPublishedJevbenchV1640Release } from '../lib/jevbench-v1640-release.mjs';
import { hasPublishedJevbenchV1642Release } from '../lib/jevbench-v1642-release.mjs';
import { hasPublishedJevbenchV1643Release } from '../lib/jevbench-v1643-release.mjs';
import { hasPublishedJevbenchV176Release } from '../lib/jevbench-v176-release.mjs';
import { hasPublishedJevbenchV175Release } from '../lib/jevbench-v175-release.mjs';
import { hasPublishedJevbenchV174Release } from '../lib/jevbench-v174-release.mjs';
import { hasPublishedJevbenchV173Release } from '../lib/jevbench-v173-release.mjs';
import { hasPublishedJevbenchV172Release } from '../lib/jevbench-v172-release.mjs';
import { hasPublishedJevbenchV171Release } from '../lib/jevbench-v171-release.mjs';
import { hasPublishedJevbenchV170Release } from '../lib/jevbench-v170-release.mjs';

/** Dated release history of the live board (Florian 10 Oct 2026: versions move here from the tabs on top). Fresh-draw
 *  releases are listed only for a validated publication; a failed validation omits the entry and keeps the rest. */
export async function JevReleaseHistory() {
  const [v162, v163, v164, v165, v166, v167, v168, v169, v1610, v1611, v1612, v1613, v1614, v1615, v1616, v1617, v1618, v1620, v1621, v1622, v1623, v1624, v1625, v1626, v1627, v1628, v1629, v1630, v1631, v1632, v1633, v1634, v1635, v1636, v1637, v1638, v1639, v1640, v1642, v1643, v170, v171, v172, v173, v174, v175, v176] = await Promise.all([hasPublishedJevbenchV162Release(), hasPublishedJevbenchV163Release(), hasPublishedJevbenchV164Release(), hasPublishedJevbenchV165Release(), hasPublishedJevbenchV166Release(), hasPublishedJevbenchV167Release(), hasPublishedJevbenchV168Release(), hasPublishedJevbenchV169Release(), hasPublishedJevbenchV1610Release(), hasPublishedJevbenchV1611Release(), hasPublishedJevbenchV1612Release(), hasPublishedJevbenchV1613Release(), hasPublishedJevbenchV1614Release(), hasPublishedJevbenchV1615Release(), hasPublishedJevbenchV1616Release(), hasPublishedJevbenchV1617Release(), hasPublishedJevbenchV1618Release(), hasPublishedJevbenchV1620Release(), hasPublishedJevbenchV1621Release(), hasPublishedJevbenchV1622Release(), hasPublishedJevbenchV1623Release(), hasPublishedJevbenchV1624Release(), hasPublishedJevbenchV1625Release(), hasPublishedJevbenchV1626Release(), hasPublishedJevbenchV1627Release(), hasPublishedJevbenchV1628Release(), hasPublishedJevbenchV1629Release(), hasPublishedJevbenchV1630Release(), hasPublishedJevbenchV1631Release(), hasPublishedJevbenchV1632Release(), hasPublishedJevbenchV1633Release(), hasPublishedJevbenchV1634Release(), hasPublishedJevbenchV1635Release(), hasPublishedJevbenchV1636Release(), hasPublishedJevbenchV1637Release(), hasPublishedJevbenchV1638Release(), hasPublishedJevbenchV1639Release(), hasPublishedJevbenchV1640Release(), hasPublishedJevbenchV1642Release(), hasPublishedJevbenchV1643Release(), hasPublishedJevbenchV170Release(), hasPublishedJevbenchV171Release(), hasPublishedJevbenchV172Release(), hasPublishedJevbenchV173Release(), hasPublishedJevbenchV174Release(), hasPublishedJevbenchV175Release(), hasPublishedJevbenchV176Release()]);
  const hidden = new Set([!v162 && 'v1.6.2', !v163 && 'v1.6.3', !v164 && 'v1.6.4', !v165 && 'v1.6.5', !v166 && 'v1.6.6', !v167 && 'v1.6.7', !v168 && 'v1.6.8', !v169 && 'v1.6.9', !v1610 && 'v1.6.10', !v1611 && 'v1.6.11', !v1612 && 'v1.6.12', !v1613 && 'v1.6.13', !v1614 && 'v1.6.14', !v1615 && 'v1.6.15', !v1616 && 'v1.6.16', !v1617 && 'v1.6.17', !v1618 && 'v1.6.18', !v1620 && 'v1.6.20', !v1621 && 'v1.6.21', !v1622 && 'v1.6.22', !v1623 && 'v1.6.23', !v1624 && 'v1.6.24', !v1625 && 'v1.6.25', !v1626 && 'v1.6.26', !v1627 && 'v1.6.27', !v1628 && 'v1.6.28', !v1629 && 'v1.6.29', !v1630 && 'v1.6.30', !v1631 && 'v1.6.31', !v1632 && 'v1.6.32', !v1633 && 'v1.6.33', !v1634 && 'v1.6.34', !v1635 && 'v1.6.35', !v1636 && 'v1.6.36', !v1637 && 'v1.6.37', !v1638 && 'v1.6.38', !v1639 && 'v1.6.39', !v1640 && 'v1.6.40', !v1642 && 'v1.6.42', !v1643 && 'v1.6.43', !v170 && 'v1.7.0', !v171 && 'v1.7.1', !v172 && 'v1.7.2', !v173 && 'v1.7.3', !v174 && 'v1.7.4', !v175 && 'v1.7.5', !v176 && 'v1.7.6'].filter(Boolean));
  const releases = JEVBENCH_RELEASES.filter((r) => !hidden.has(r.version));
  return <section className="mt-10 max-w-4xl" id="jev-release-history" aria-labelledby="jev-release-history-title" data-bh-jev-release-history>
    <h2 id="jev-release-history-title" className="text-2xl font-bold">Release history</h2>
    <p className="bh-muted mt-1 text-sm">The board above is always the current merged board: every system with its latest measurement. Each release stays readable as published.</p>
    {v170
      ? <p className="bh-muted mt-1 text-sm" data-bh-jev-method-in-force>Since v1.7.0: a decision that takes longer than 10 seconds (measured time) counts as a wrong answer and as zero calibration for that item, and Speed uses all decisions. The v1.6 values stay visible on every row.</p>
      : <p className="bh-muted mt-1 text-sm" data-bh-jev-upcoming>Upcoming in v1.7.0 (not before 24 October 2026): decisions that take longer than 10 seconds count as failed, and Speed uses the times of all decisions. Every row is recomputed from its recorded per-decision times; the earlier values stay visible next to the new ones.</p>}
    <ul className="mt-2 space-y-1 text-sm">{releases.map((r) => <li key={r.version} data-bh-jev-release={r.version}>
      <a className="text-accent font-semibold underline" href={r.href}>JevBench {r.version}</a> <span className="bh-muted">· {r.date} · {r.text}</span>
    </li>)}</ul>
  </section>;
}
